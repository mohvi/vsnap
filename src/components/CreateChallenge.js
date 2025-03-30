import React, { useState } from 'react';
import { ref as dbRef, set } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from '../fb'; // Certifique-se de que `storage` está configurado corretamente
import { FaImage, FaClock, FaMoneyBillWave } from 'react-icons/fa';

function CreateChallenge() {
  const [challengeData, setChallengeData] = useState({
    title: '',
    description: '',
    image: null,
    prizeAmount: 0,
    duration: 24, // Fixed 24-hour duration
    rules: ''
  });

  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setChallengeData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setChallengeData(prev => ({ ...prev, image: file }));
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Validation
    if (!challengeData.title || !challengeData.description) {
      setError('Por favor, preencha todos os campos obrigatórios!');
      setIsSubmitting(false);
      return;
    }

    try {
      const challengeId = `challenge_${Date.now()}`;
      const challengeRef = dbRef(db, `challenges/${challengeId}`);

      // Upload image to Firebase Storage if it exists
      let imageUrl = null;
      if (challengeData.image) {
        const imageRef = storageRef(storage, `challengeImages/${challengeId}/${challengeData.image.name}`);
        await uploadBytes(imageRef, challengeData.image);
        imageUrl = await getDownloadURL(imageRef); // Get the download URL
      }

      // Calculate end time (now + 24 hours)
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + (24 * 60 * 60 * 1000));

      // Save challenge data to Firebase Realtime Database
      await set(challengeRef, {
        id: challengeId,
        title: challengeData.title,
        description: challengeData.description,
        imageUrl: imageUrl, // Use the URL from Firebase Storage
        prizeAmount: challengeData.prizeAmount || 0,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        rules: challengeData.rules,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 'admin' // Replace with actual user ID
      });

      setSuccess(true);
      // Reset form after successful submission
      setTimeout(() => {
        setChallengeData({
          title: '',
          description: '',
          image: null,
          prizeAmount: 0,
          duration: 24,
          rules: ''
        });
        setPreviewImage(null);
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error creating challenge:', error);
      setError('Ocorreu um erro ao criar o desafio. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">Criar Novo Desafio</h1>
          <p className="text-gray-600">Todos os desafios têm duração de 24 horas e sem limite de participantes</p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded">
            <p>Desafio criado com sucesso!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6">
          {/* Challenge Title */}
          <div className="mb-6">
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
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Descrição Detalhada *</label>
            <textarea
              name="description"
              value={challengeData.description}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Descreva o desafio em detalhes..."
              rows="5"
              required
            />
          </div>

          {/* Duration (fixed 24 hours) */}
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <span className="bg-blue-100 p-2 rounded-full mr-2">
                <FaClock className="text-blue-600" />
              </span>
              Duração do Desafio
            </label>
            <div className="flex items-center">
              <input
                type="number"
                name="duration"
                value={24}
                readOnly
                className="w-20 p-3 border border-gray-300 rounded-lg bg-gray-100 mr-2"
              />
              <span className="text-gray-700">horas (máximo permitido)</span>
            </div>
          </div>

          {/* Prize Amount */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <span className="bg-blue-100 p-2 rounded-full mr-2">
                <FaMoneyBillWave className="text-blue-600" />
              </span>
              Valor do Prêmio (opcional)
            </label>
            <input
              type="number"
              name="prizeAmount"
              value={challengeData.prizeAmount}
              onChange={handleInputChange}
              min="0"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          </div>

          {/* Image Upload */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Imagem do Desafio (opcional)</label>
            <div className="flex items-center">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                {previewImage ? (
                  <img src={previewImage} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FaImage className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Clique para enviar uma imagem</p>
                  </div>
                )}
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
              </label>
            </div>
          </div>

          {/* Rules */}
          <div className="mb-8">
            <label className="block text-gray-700 font-medium mb-2">Regras do Desafio (opcional)</label>
            <textarea
              name="rules"
              value={challengeData.rules}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Liste as regras que os participantes devem seguir..."
              rows="3"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
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
                  Criando...
                </>
              ) : 'Criar Desafio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateChallenge;