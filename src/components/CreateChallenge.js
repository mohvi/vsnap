import React, { useState, useEffect } from 'react';
import { ref, set, push, serverTimestamp } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from '../fb';
import { FaImage, FaClock, FaMoneyBillWave, FaUsers, FaTag, FaTrophy, FaLock, FaLockOpen } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function CreateChallenge() {
  const navigate = useNavigate();
  const [challengeData, setChallengeData] = useState({
    title: '',
    description: '',
    image: null,
    prizeAmount: 0,
    duration: 24,
    maxParticipants: null,
    currentParticipants: 0,
    rules: '',
    category: 'photography',
    difficulty: 'medium',
    status: 'draft',
    entryType: 'free', // 'free' ou 'paid'
    entryFee: 0 // Valor do depósito se for pago
  });

  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (!user) {
        navigate('/auth');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setChallengeData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('A imagem deve ter menos de 5MB');
        return;
      }
      if (!file.type.match('image.*')) {
        setError('Por favor, envie apenas imagens');
        return;
      }
      
      setChallengeData(prev => ({ ...prev, image: file }));
      setPreviewImage(URL.createObjectURL(file));
      setError('');
    }
  };

  const validateChallenge = () => {
    if (!challengeData.title || !challengeData.description) {
      setError('Título e descrição são obrigatórios');
      return false;
    }
    if (challengeData.duration < 1) {
      setError('Duração mínima é 1 hora');
      return false;
    }
    if (challengeData.maxParticipants && challengeData.maxParticipants < 2) {
      setError('Mínimo de 2 participantes');
      return false;
    }
    if (challengeData.entryType === 'paid' && challengeData.entryFee <= 0) {
      setError('Valor do depósito deve ser maior que zero');
      return false;
    }
    return true;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateChallenge()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const challengeId = push(ref(db, 'challenges')).key;
      const challengeRef = ref(db, `challenges/${challengeId}`);

      // Upload image if exists and get URL
      let imageUrl = null;
      if (challengeData.image) {
        const imageRef = storageRef(storage, `challengeImages/${challengeId}`);
        await uploadBytes(imageRef, challengeData.image);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Calculate times
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + (challengeData.duration * 60 * 60 * 1000));

      // Prepare challenge data - remove the image File object
      const { image, ...challengeWithoutImage } = challengeData;
      const newChallenge = {
        ...challengeWithoutImage,
        id: challengeId,
        imageUrl: imageUrl || null, // Use null if no image
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'active',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save to database
      await set(challengeRef, newChallenge);

      // Create a participation node
      const participationRef = ref(db, `participations/${challengeId}`);
      await set(participationRef, {
        challengeId,
        participants: {},
        count: 0
      });

      setSuccess(true);
      setTimeout(() => {
        resetForm();
        navigate('/challenges');
      }, 2000);
    } catch (error) {
      console.error('Error creating challenge:', error);
      setError(`Erro ao criar desafio: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setChallengeData({
      title: '',
      description: '',
      image: null,
      prizeAmount: 0,
      duration: 24,
      maxParticipants: null,
      currentParticipants: 0,
      rules: '',
      category: 'photography',
      difficulty: 'medium',
      status: 'draft',
      entryType: 'free',
      entryFee: 0
    });
    setPreviewImage(null);
    setSuccess(false);
  };

  const categories = [
    { value: 'photography', label: 'Fotografia' },
    { value: 'video', label: 'Vídeo' },
    { value: 'writing', label: 'Escrita' },
    { value: 'art', label: 'Arte' },
    { value: 'music', label: 'Música' },
    { value: 'other', label: 'Outro' }
  ];

  const difficultyLevels = [
    { value: 'easy', label: 'Fácil' },
    { value: 'medium', label: 'Médio' },
    { value: 'hard', label: 'Difícil' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Criar Novo Desafio</h1>
          <p className="text-gray-600">Configure seu desafio com todas as informações necessárias</p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded">
            <p>Desafio criado com sucesso! Redirecionando...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Informações Básicas</h2>
            
            {/* Title */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Título do Desafio *
              </label>
              <input
                type="text"
                name="title"
                value={challengeData.title}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Melhor foto de pôr do sol"
                required
                maxLength="100"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">Descrição Detalhada *</label>
              <textarea
                name="description"
                value={challengeData.description}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descreva o desafio em detalhes..."
                rows="5"
                required
                maxLength="1000"
              />
            </div>

            {/* Category and Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2 flex items-center">
                  <FaTag className="mr-2 text-blue-500" />
                  Categoria
                </label>
                <select
                  name="category"
                  value={challengeData.category}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2 flex items-center">
                  <FaTrophy className="mr-2 text-blue-500" />
                  Dificuldade
                </label>
                <select
                  name="difficulty"
                  value={challengeData.difficulty}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {difficultyLevels.map((level) => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Duration and Participants Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Configurações</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Duration */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <label className="block text-gray-700 font-medium mb-2 flex items-center">
                  <FaClock className="mr-2 text-blue-600" />
                  Duração (horas)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={challengeData.duration}
                  onChange={handleInputChange}
                  min="1"
                  max="720" // 30 dias
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Max Participants */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <label className="block text-gray-700 font-medium mb-2 flex items-center">
                  <FaUsers className="mr-2 text-blue-600" />
                  Limite de Participantes (opcional)
                </label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={challengeData.maxParticipants || ''}
                  onChange={handleInputChange}
                  min="2"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ilimitado se vazio"
                />
              </div>
            </div>

            {/* Entry Type */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <label className="block text-gray-700 font-medium mb-2">
                Tipo de Participação *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="entryType"
                    value="free"
                    checked={challengeData.entryType === 'free'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 flex items-center">
                    <FaLockOpen className="mr-1 text-green-500" /> Gratuito
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="entryType"
                    value="paid"
                    checked={challengeData.entryType === 'paid'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 flex items-center">
                    <FaLock className="mr-1 text-yellow-500" /> Com Depósito
                  </span>
                </label>
              </div>

              {challengeData.entryType === 'paid' && (
                <div className="mt-4">
                  <label className="block text-gray-700 font-medium mb-2">
                    Valor do Depósito (MT) *
                  </label>
                  <div className="flex items-center">
                    <span className="mr-2">MT</span>
                    <input
                      type="number"
                      name="entryFee"
                      value={challengeData.entryFee}
                      onChange={handleInputChange}
                      min="10"
                      step="10"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Valor mínimo 10MT"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Prize Amount */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <label className="block text-gray-700 font-medium mb-2 flex items-center">
                <FaMoneyBillWave className="mr-2 text-blue-600" />
                Valor do Prêmio (opcional)
              </label>
              <div className="flex items-center">
                <span className="mr-2">MT</span>
                <input
                  type="number"
                  name="prizeAmount"
                  value={challengeData.prizeAmount}
                  onChange={handleInputChange}
                  min="0"
                  step="50"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Imagem do Desafio</h2>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2 flex items-center">
                <FaImage className="mr-2 text-blue-500" />
                Imagem (opcional, máx. 5MB)
              </label>
              <div className="flex items-center">
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FaImage className="w-10 h-10 text-gray-400 mb-3" />
                      <p className="text-sm text-gray-500">Clique para enviar uma imagem</p>
                      <p className="text-xs text-gray-400">PNG, JPG (Máx. 5MB)</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileChange} 
                    accept="image/png, image/jpeg, image/jpg" 
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Regras do Desafio</h2>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Regras e Diretrizes (opcional)
              </label>
              <textarea
                name="rules"
                value={challengeData.rules}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Liste as regras que os participantes devem seguir..."
                rows="4"
                maxLength="500"
              />
              <p className="text-xs text-gray-500 mt-1">Máximo 500 caracteres</p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3 rounded-full font-bold text-white ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors duration-300 flex items-center`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Criando Desafio...
                </>
              ) : 'Publicar Desafio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateChallenge;