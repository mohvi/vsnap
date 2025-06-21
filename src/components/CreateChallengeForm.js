import React, { useState, useEffect } from 'react';
import { push, ref as dbRef } from 'firebase/database';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../fb';
import { 
  FaHeart, FaRegClock, FaCheckCircle, FaImage, FaVideo, 
  FaPlus, FaUpload, FaSpinner, FaExclamationTriangle, 
  FaInfoCircle, FaMapMarkerAlt, FaStore, FaWineBottle, 
  FaGlassCheers, FaShoppingBag, FaCheck 
} from 'react-icons/fa';

const AdminChallengeForm = () => {
  // States for location
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  
  // Content types
  const contentTypes = [
    { id: 'store_promo', label: 'Promoção de Loja', icon: <FaStore className="mr-2" /> },
    { id: 'bottle_store', label: 'Bottle Store', icon: <FaWineBottle className="mr-2" /> },
    { id: 'bar_restaurant', label: 'Bar/Restaurante', icon: <FaGlassCheers className="mr-2" /> },
    { id: 'retail', label: 'Varejo', icon: <FaShoppingBag className="mr-2" /> },
    { id: 'general', label: 'Geral', icon: null }
  ];

  // Age ratings
  const ageRatings = [
    { value: '13+', label: '13 anos ou mais' },
    { value: '16+', label: '16 anos ou mais' },
    { value: '18+', label: '18 anos ou mais' }
  ];

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    detailedRules: '',
    prize: '',
    deadline: '',
    dateLimit: '',
    deadlineDays: '',
    likeLimit: 50,
    type: 'photo',
    contentType: 'general',
    ageRating: '13+',
    category: 'general',
    imageFile: null,
    brand: {
      name: '',
      logo: '',
      verified: true
    },
    termsAndConditions: '',
    featured: false,
    location: {
      province: '',
      district: '',
      isNational: false
    },
    requiresVerification: false,
    verificationType: 'none'
  });

  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [formErrors, setFormErrors] = useState({
    imageFile: false,
    logoFile: false
  });

  // Load provinces
  useEffect(() => {
    const mockProvinces = [
      { id: 'maputo', name: 'Maputo' },
      { id: 'gaza', name: 'Gaza' },
      { id: 'inhambane', name: 'Inhambane' },
      { id: 'sofala', name: 'Sofala' },
      { id: 'manica', name: 'Manica' },
      { id: 'tete', name: 'Tete' },
      { id: 'zambezia', name: 'Zambézia' },
      { id: 'nampula', name: 'Nampula' },
      { id: 'niassa', name: 'Niassa' },
      { id: 'cabo_delgado', name: 'Cabo Delgado' }
    ];
    setProvinces(mockProvinces);
  }, []);

  // Load districts when province changes
  useEffect(() => {
    if (form.location.province) {
      const mockDistricts = {
        maputo: [
          { id: 'maputo_cidade', name: 'Maputo Cidade' },
          { id: 'matola', name: 'Matola' },
          { id: 'marracuene', name: 'Marracuene' }
        ],
        gaza: [
          { id: 'xai-xai', name: 'Xai-Xai' },
          { id: 'chokwe', name: 'Chokwé' },
          { id: 'bilene', name: 'Bilene' }
        ],
      };
      setDistricts(mockDistricts[form.location.province] || []);
    } else {
      setDistricts([]);
    }
  }, [form.location.province]);

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleBrandChange = (e) => {
    const { name, value } = e.target;
    setForm({ 
      ...form, 
      brand: { 
        ...form.brand, 
        [name]: value 
      } 
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, imageFile: file });
      setImagePreview(URL.createObjectURL(file));
      setFormErrors({...formErrors, imageFile: false});
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setFormErrors({...formErrors, logoFile: false});
    }
  };

  const handleDateChange = (e) => {
    const dateValue = e.target.value;
    const deadlineDays = calculateDeadlineDays(dateValue);
    setForm({ 
      ...form, 
      dateLimit: dateValue,
      deadlineDays: deadlineDays
    });
  };

  const calculateDeadlineDays = (dateString) => {
    if (!dateString) return '';
    const deadlineDate = new Date(dateString);
    const today = new Date();
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays.toString() : '0';
  };

  const handleLocationChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: type === 'checkbox' ? checked : value,
        ...(name === 'isNational' && checked ? { province: '', district: '' } : {})
      }
    }));
  };

  const handleContentTypeChange = (typeId) => {
    setForm(prev => ({
      ...prev,
      contentType: typeId,
      ageRating: typeId === 'bottle_store' ? '18+' : prev.ageRating
    }));
  };

  const handleVerificationChange = (e) => {
    const { value } = e.target;
    setForm(prev => ({
      ...prev,
      verificationType: value,
      requiresVerification: value !== 'none'
    }));
  };

  const validateForm = () => {
    const errors = {
      imageFile: !form.imageFile,
      logoFile: !logoFile
    };
    setFormErrors(errors);
    return !errors.imageFile && !errors.logoFile;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Upload banner image
      const imgRef = ref(storage, `challenges/banners/${Date.now()}_${form.imageFile.name}`);
      await uploadBytes(imgRef, form.imageFile);
      const bannerURL = await getDownloadURL(imgRef);

      // Upload brand logo
      const logoRef = ref(storage, `brands/logos/${Date.now()}_${logoFile.name}`);
      await uploadBytes(logoRef, logoFile);
      const logoURL = await getDownloadURL(logoRef);

      const challengeData = {
        title: form.title,
        description: form.description,
        detailedRules: form.detailedRules,
        prize: form.prize,
        deadline: form.deadline,
        dateLimit: form.dateLimit,
        deadlineDays: form.deadlineDays,
        likeLimit: parseInt(form.likeLimit) || 0,
        type: form.type,
        contentType: form.contentType,
        ageRating: form.ageRating,
        category: form.category,
        termsAndConditions: form.termsAndConditions,
        featured: form.featured,
        location: form.location,
        requiresVerification: form.requiresVerification,
        verificationType: form.verificationType,
        brand: {
          name: form.brand.name,
          logo: logoURL,
          verified: form.brand.verified
        },
        coverImage: bannerURL,
        interaction: "0 curtidas",
        participants: 0,
        createdAt: Date.now(),
        status: 'active'
      };

      await push(dbRef(db, 'challenges'), challengeData);
      alert("Desafio criado com sucesso!");
      
      // Reset form
      setForm({
        title: '',
        description: '',
        detailedRules: '',
        prize: '',
        deadline: '',
        dateLimit: '',
        deadlineDays: '',
        likeLimit: 50,
        type: 'photo',
        contentType: 'general',
        ageRating: '13+',
        category: 'general',
        imageFile: null,
        brand: { name: '', logo: '', verified: true },
        termsAndConditions: '',
        featured: false,
        location: {
          province: '',
          district: '',
          isNational: false
        },
        requiresVerification: false,
        verificationType: 'none'
      });
      setLogoFile(null);
      setImagePreview(null);
      setLogoPreview(null);
    } catch (error) {
      console.error("Erro ao criar desafio:", error);
      alert("Erro ao criar desafio. Verifique o console para detalhes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-md max-w-4xl mx-auto mb-10">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Criar novo desafio</h2>

        {/* Basic Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título*</label>
              <input 
                name="title" 
                placeholder="Ex: Melhor foto com CDM no verão" 
                className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={form.title} 
                onChange={handleInputChange} 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição breve*</label>
              <textarea 
                name="description" 
                placeholder="Descreva o desafio em poucas palavras" 
                rows={2}
                className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={form.description} 
                onChange={handleInputChange} 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Regras detalhadas*</label>
              <textarea 
                name="detailedRules" 
                placeholder="Descreva as regras em detalhes" 
                rows={4}
                className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={form.detailedRules} 
                onChange={handleInputChange} 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prêmio*</label>
              <input 
                name="prize" 
                placeholder="Ex: R$5.000 + produtos da marca" 
                className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={form.prize} 
                onChange={handleInputChange} 
                required 
              />
            </div>
          </div>

          {/* Settings Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de desafio*</label>
              <select 
                name="type" 
                className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={form.type} 
                onChange={handleInputChange}
              >
                <option value="photo">Foto</option>
                <option value="video">Vídeo</option>
                <option value="both">Foto ou Vídeo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria*</label>
              <select 
                name="category" 
                className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={form.category} 
                onChange={handleInputChange}
              >
                <option value="general">Geral</option>
                <option value="fashion">Moda</option>
                <option value="food">Comida</option>
                <option value="travel">Viagem</option>
                <option value="sports">Esportes</option>
                <option value="music">Música</option>
                <option value="art">Arte</option>
                <option value="technology">Tecnologia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data limite*</label>
              <input 
                type="date" 
                name="dateLimit" 
                className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={form.dateLimit} 
                onChange={handleDateChange} 
                required 
              />
              {form.deadlineDays && (
                <p className="text-xs text-gray-500 mt-1">
                  {form.deadlineDays} dias restantes a partir de hoje
                </p>
              )}
            </div>

            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="featured" 
                name="featured" 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                checked={form.featured} 
                onChange={(e) => setForm({...form, featured: e.target.checked})} 
              />
              <label htmlFor="featured" className="ml-2 block text-sm text-gray-700">
                Destacar este desafio
              </label>
            </div>
          </div>
        </div>

        {/* Content Type Section */}
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Tipo de Conteúdo</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {contentTypes.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => handleContentTypeChange(type.id)}
                className={`flex items-center p-3 rounded-lg border ${form.contentType === type.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                {type.icon}
                {type.label}
                {form.contentType === type.id && (
                  <FaCheck className="ml-auto text-green-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Engagement Settings Section */}
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Configurações de Engajamento</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limite de likes por usuário
                <span className="text-xs text-gray-500 ml-1">(0 = ilimitado)</span>
              </label>
              <input
                type="number"
                name="likeLimit"
                min="0"
                max="1000"
                className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.likeLimit}
                onChange={(e) => setForm({...form, likeLimit: parseInt(e.target.value) || 0})}
              />
              <p className="mt-1 text-xs text-gray-500">
                Cada usuário poderá dar no máximo {form.likeLimit > 0 ? form.likeLimit : 'ilimitados'} likes neste desafio
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classificação etária*</label>
              <select
                name="ageRating"
                className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={form.ageRating}
                onChange={handleInputChange}
                required
              >
                {ageRatings.map(rating => (
                  <option key={rating.value} value={rating.value}>
                    {rating.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Verificação necessária</label>
            <select
              name="verificationType"
              className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.verificationType}
              onChange={handleVerificationChange}
            >
              <option value="none">Nenhuma verificação necessária</option>
              <option value="email">Verificação por e-mail</option>
              <option value="document">Verificação por documento (18+)</option>
            </select>
            {form.verificationType === 'document' && (
              <p className="mt-1 text-xs text-yellow-600 flex items-center">
                <FaExclamationTriangle className="mr-1" />
                Desafios com verificação por documento podem reduzir o número de participantes
              </p>
            )}
          </div>
        </div>

        {/* Location Section */}
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <FaMapMarkerAlt className="mr-2 text-blue-500" />
            Localização do Desafio
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isNational"
                name="isNational"
                checked={form.location.isNational}
                onChange={handleLocationChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isNational" className="ml-2 text-sm text-gray-700">
                Desafio nacional (todo o país)
              </label>
            </div>

            {!form.location.isNational && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Província*</label>
                  <select
                    name="province"
                    value={form.location.province}
                    onChange={handleLocationChange}
                    className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={form.location.isNational}
                    required={!form.location.isNational}
                  >
                    <option value="">Selecione uma província</option>
                    {provinces.map(province => (
                      <option key={province.id} value={province.id}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distrito</label>
                  <select
                    name="district"
                    value={form.location.district}
                    onChange={handleLocationChange}
                    className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={form.location.isNational || !form.location.province}
                  >
                    <option value="">Selecione um distrito (opcional)</option>
                    {districts.map(district => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Brand Information Section */}
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Informações da Marca</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da marca*</label>
              <input 
                name="name" 
                placeholder="Ex: CDM" 
                className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                value={form.brand.name} 
                onChange={handleBrandChange} 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo da marca*
                {formErrors.logoFile && (
                  <span className="text-red-500 ml-2">(Campo obrigatório)</span>
                )}
              </label>
              <div className="flex items-center gap-4">
                <label className="flex flex-col items-center justify-center px-4 py-4 bg-white rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors w-32 h-32">
                  {logoPreview ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={logoPreview} 
                        alt="Preview do logo" 
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <div className="absolute top-0 right-0 bg-white p-1 rounded-full shadow-md transform translate-x-1/2 -translate-y-1/2">
                        <FaUpload className="text-blue-500 text-xs" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <FaPlus className="text-gray-400 mb-1" />
                      <span className="text-xs text-gray-600">Adicionar logo</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoChange} 
                    className="hidden"
                    id="logoInput"
                  />
                </label>
                
                <div className="text-xs text-gray-500">
                  <p>• Formato quadrado recomendado</p>
                  <p>• Tamanho mínimo: 200x200 pixels</p>
                  <p>• Fundo transparente preferencial</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image Uploads Section */}
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Imagens do desafio</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagem de capa*
              {formErrors.imageFile && (
                <span className="text-red-500 ml-2">(Campo obrigatório)</span>
              )}
            </label>
            
            <label className="flex flex-col items-center justify-center px-4 py-6 bg-white rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors">
              {imagePreview ? (
                <div className="relative w-full">
                  <img 
                    src={imagePreview} 
                    alt="Preview da capa" 
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                  <div className="absolute top-2 right-2 bg-white p-1 rounded-full shadow-md">
                    <FaUpload className="text-blue-500" />
                  </div>
                </div>
              ) : (
                <>
                  <FaPlus className="text-gray-400 text-2xl mb-2" />
                  <p className="text-sm text-gray-600 text-center">
                    Clique para adicionar ou arraste uma imagem<br />
                    <span className="text-xs text-gray-400">Recomendado: 1200x630 pixels</span>
                  </p>
                </>
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                className="hidden"
                id="coverImageInput"
              />
            </label>
          </div>
        </div>

        {/* Terms and Conditions Section */}
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Termos e Condições</h3>
          <textarea 
            name="termsAndConditions" 
            placeholder="Informe os termos e condições do desafio..." 
            rows={4}
            className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            value={form.termsAndConditions} 
            onChange={handleInputChange} 
            required 
          />
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button 
            disabled={loading} 
            type="submit" 
            className="flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium min-w-[150px]"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Criando...
              </>
            ) : 'Criar Desafio'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminChallengeForm;