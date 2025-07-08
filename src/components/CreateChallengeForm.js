import React, { useState, useEffect } from 'react';
import { push, ref as dbRef } from 'firebase/database';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../fb';
import { FaHeart, FaImage, FaPlus, FaUpload, FaSpinner, FaCheck, FaMapMarkerAlt } from 'react-icons/fa';

const AdminChallengeForm = () => {
  // Lista de províncias
  const [provinces] = useState([
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
  ]);

  // Estado do formulário simplificado
  const [form, setForm] = useState({
    title: '',
    description: '',
    prize: '',
    deadline: '',
    type: 'photo',
    imageFile: null,
    brand: {
      name: '',
      logo: ''
    },
    terms: '',
    likeGoal: 100,
    participants: 0,
    province: '', // Adicionado campo de província
    isNational: false
  });

  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

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
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleLocationChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'isNational' && checked ? { province: '' } : {})
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.imageFile || !logoFile) {
      alert('Por favor, adicione a imagem do desafio e o logo da marca');
      return;
    }

    setLoading(true);
    try {
      // Upload banner image
      const imgRef = ref(storage, `challenges/${Date.now()}_${form.imageFile.name}`);
      await uploadBytes(imgRef, form.imageFile);
      const bannerURL = await getDownloadURL(imgRef);

      // Upload brand logo
      const logoRef = ref(storage, `brands/${Date.now()}_${logoFile.name}`);
      await uploadBytes(logoRef, logoFile);
      const logoURL = await getDownloadURL(logoRef);

      const challengeData = {
        title: form.title,
        description: form.description,
        prize: form.prize,
        deadline: form.deadline,
        type: form.type,
        brand: {
          name: form.brand.name,
          logo: logoURL
        },
        terms: form.terms,
        likeGoal: parseInt(form.likeGoal) || 100,
        participants: 0,
        status: 'active',
        createdAt: Date.now(),
        coverImage: bannerURL,
        // Localização
        location: {
          isNational: form.isNational,
          province: form.isNational ? '' : form.province
        },
        // Engagement metrics
        totalLikes: 0,
        topParticipants: []
      };

      await push(dbRef(db, 'challenges'), challengeData);
      alert("Desafio criado com sucesso!");
      
      // Reset form
      setForm({
        title: '',
        description: '',
        prize: '',
        deadline: '',
        type: 'photo',
        imageFile: null,
        brand: { name: '', logo: '' },
        terms: '',
        likeGoal: 100,
        province: '',
        isNational: false
      });
      setLogoFile(null);
      setImagePreview(null);
      setLogoPreview(null);
    } catch (error) {
      console.error("Erro ao criar desafio:", error);
      alert("Erro ao criar desafio. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2 flex items-center">
          <FaHeart className="mr-2 text-pink-500" />
          Criar Desafio Baseado em Likes
        </h2>

        {/* Basic Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título do Desafio*</label>
            <input 
              name="title" 
              placeholder="Ex: Foto mais curtida do verão" 
              className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-pink-500" 
              value={form.title} 
              onChange={handleInputChange} 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo*</label>
            <select 
              name="type" 
              className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-pink-500" 
              value={form.type} 
              onChange={handleInputChange}
            >
              <option value="photo">Foto</option>
              <option value="video">Vídeo</option>
            </select>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição*</label>
          <textarea 
            name="description" 
            placeholder="Descreva o desafio de forma clara e atraente" 
            rows={3}
            className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-pink-500" 
            value={form.description} 
            onChange={handleInputChange} 
            required 
          />
        </div>

        {/* Prize and Goals Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prêmio*</label>
            <input 
              name="prize" 
              placeholder="Ex: R$1.000 em produtos" 
              className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-pink-500" 
              value={form.prize} 
              onChange={handleInputChange} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta de Likes*
              <span className="text-xs text-gray-500 ml-1">(para vencer)</span>
            </label>
            <input
              type="number"
              name="likeGoal"
              min="1"
              className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-pink-500"
              value={form.likeGoal}
              onChange={(e) => setForm({...form, likeGoal: parseInt(e.target.value) || 100})}
              required
            />
          </div>
        </div>

        {/* Location Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <FaMapMarkerAlt className="mr-2 text-blue-500" />
            Localização do Desafio
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isNational"
                checked={form.isNational}
                onChange={handleLocationChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isNational" className="ml-2 text-sm text-gray-700">
                Desafio nacional (todo o país)
              </label>
            </div>

            {!form.isNational && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Província*</label>
                <select
                  name="province"
                  value={form.province}
                  onChange={handleLocationChange}
                  className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-pink-500"
                  disabled={form.isNational}
                  required={!form.isNational}
                >
                  <option value="">Selecione uma província</option>
                  {provinces.map(province => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Brand Information Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Marca Patrocinadora</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Marca*</label>
              <input 
                name="name" 
                placeholder="Ex: Coca-Cola" 
                className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-pink-500" 
                value={form.brand.name} 
                onChange={handleBrandChange} 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo da Marca*</label>
              <div className="flex items-center gap-4">
                <label className="flex flex-col items-center justify-center px-4 py-4 bg-white rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 w-24 h-24">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Logo" 
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <>
                      <FaPlus className="text-gray-400 mb-1" />
                      <span className="text-xs text-gray-600">Adicionar</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoChange} 
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Challenge Image Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Imagem do Desafio*</label>
          <label className="flex flex-col items-center justify-center px-4 py-6 bg-white rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50">
            {imagePreview ? (
              <div className="relative w-full">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <div className="absolute top-2 right-2 bg-white p-1 rounded-full shadow-md">
                  <FaUpload className="text-pink-500" />
                </div>
              </div>
            ) : (
              <>
                <FaImage className="text-gray-400 text-2xl mb-2" />
                <p className="text-sm text-gray-600 text-center">
                  Clique para adicionar a imagem do desafio<br />
                  <span className="text-xs text-gray-400">Tamanho recomendado: 1200x630px</span>
                </p>
              </>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              className="hidden"
              required
            />
          </label>
        </div>

        {/* Terms Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Termos Simples*</label>
          <textarea 
            name="terms" 
            placeholder="Ex: A foto com mais likes até a data limite vence." 
            rows={2}
            className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-pink-500" 
            value={form.terms} 
            onChange={handleInputChange} 
            required 
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center justify-center bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition font-medium min-w-[150px]"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Criando...
              </>
            ) : (
              <>
                <FaCheck className="mr-2" />
                Criar Desafio
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminChallengeForm;