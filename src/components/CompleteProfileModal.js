import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader, X } from 'react-feather';
import provinces from '../utils/provinces';
import { db } from '../fb';
import { get, ref } from 'firebase/database';

const CompleteProfileModal = ({ user, onComplete, onCancel }) => {
  const [formData, setFormData] = useState({
    username: '',
    isOver13: false,
    province: '',
    city: ''
  });
  
  const [cities, setCities] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [touchedFields, setTouchedFields] = useState({});
  const [existingUsernames, setExistingUsernames] = useState([]);
  const [initialUserData, setInitialUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setInitialUserData(userData);
          
          setFormData(prev => ({
            ...prev,
            username: userData.username || '',
            isOver13: userData.isOver13 || false,
            province: userData.province || '',
            city: userData.city || ''
          }));
          
          if (userData.username) {
            setUsernameStatus('available');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    const fetchExistingUsernames = async () => {
      try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          const usernames = Object.values(usersData)
            .map(user => user.username)
            .filter(Boolean);
          setExistingUsernames(usernames);
        }
      } catch (error) {
        console.error('Error fetching usernames:', error);
        setError('Erro ao carregar usuários existentes');
      }
    };
    
    fetchUserData();
    fetchExistingUsernames();
  }, [user.uid]);

  useEffect(() => {
    if (formData.province) {
      const selectedProvince = provinces.find(p => p.code === formData.province);
      setCities(selectedProvince?.cities || []);
      if (!selectedProvince?.cities.includes(formData.city)) {
        setFormData(prev => ({ ...prev, city: '' }));
      }
    }
  }, [formData.province]);

  const normalizeUsername = (username) => {
    return username.toLowerCase().replace(/\s+/g, ' ').trim();
  };

  const checkUsername = async () => {
    const username = formData.username.trim();
    
    if (!username) {
      setUsernameStatus('invalid');
      setError('Nome de usuário é obrigatório');
      return;
    }
    
    const usernameRegex = /^[\w ]{3,20}$/;
    if (!usernameRegex.test(username)) {
      setUsernameStatus('invalid');
      setError('Nome de usuário deve ter 3-20 caracteres (letras, números, _ e espaços)');
      return;
    }
    
    setUsernameStatus('checking');
    setError(null);
    
    try {
      const normalizedUsername = normalizeUsername(username);
      const normalizedExisting = existingUsernames.map(u => normalizeUsername(u));
      
      const isAvailable = !normalizedExisting.includes(normalizedUsername) || 
                         (initialUserData?.username && 
                          normalizeUsername(initialUserData.username) === normalizedUsername);
      
      const emailPrefix = user?.email?.split('@')[0];
      if (emailPrefix && normalizedUsername === normalizeUsername(emailPrefix)) {
        setUsernameStatus('taken');
        setError('Este nome de usuário não está disponível');
        return;
      }
      
      setUsernameStatus(isAvailable ? 'available' : 'taken');
      if (!isAvailable) {
        setError('Este nome de usuário já está em uso');
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameStatus('error');
      setError('Erro ao verificar nome de usuário');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });

    setTouchedFields({
      ...touchedFields,
      [name]: true
    });

    if (name === 'username') {
      setUsernameStatus(null);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const requiredFields = ['username', 'province', 'city', 'isOver13'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (usernameStatus !== 'available') {
      setError('Por favor, escolha um nome de usuário válido e disponível.');
      return;
    }

    try {
      setLoading(true);
      
      const normalizedUsername = normalizeUsername(formData.username);
      const normalizedExisting = existingUsernames.map(u => normalizeUsername(u));
      
      if (normalizedExisting.includes(normalizedUsername) && 
          (!initialUserData?.username || 
           normalizeUsername(initialUserData.username) !== normalizedUsername)) {
        setError('Este nome de usuário já está em uso');
        setUsernameStatus('taken');
        return;
      }

      const updatedData = {
        ...initialUserData,
        ...formData,
        isComplete: true
      };

      await onComplete(updatedData);
      
      setSuccess('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error('Profile completion error:', err);
      setError(err.message || 'Ocorreu um erro ao salvar seu perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getUsernameStatusMessage = () => {
    switch (usernameStatus) {
      case 'checking':
        return (
          <span className="flex items-center text-blue-400">
            <Loader size={14} className="animate-spin mr-1" /> 
            Verificando...
          </span>
        );
      case 'available':
        return (
          <span className="flex items-center text-green-400">
            <CheckCircle size={14} className="mr-1" /> 
            Disponível
          </span>
        );
      case 'taken':
      case 'invalid':
        return (
          <span className="flex items-center text-red-400">
            <XCircle size={14} className="mr-1" /> 
            {usernameStatus === 'taken' ? 'Indisponível' : 'Inválido'}
          </span>
        );
      default:
        return (
          <span className="text-gray-500 text-xs">
            3-20 caracteres (letras, números, _ e espaços)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 overflow-y-auto">
      {/* Background elements TikTok style */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${Math.random() * 15 + 5}px`,
              height: `${Math.random() * 15 + 5}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `linear-gradient(135deg, #ff286a ${Math.random() * 100}%, #ff8c5a)`,
              opacity: 0.1,
              animation: `floatTikTok ${Math.random() * 20 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
              filter: 'blur(2px)'
            }}
          />
        ))}
      </div>

      <div className="relative bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md mx-auto my-8 border border-gray-800">
        {/* Header com gradiente */}
        <div className="relative h-2 bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] rounded-t-2xl"></div>
        
        <button 
          onClick={onCancel}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-10 bg-[#2a2a2a] p-2 rounded-full hover:bg-[#ff286a] hover:bg-opacity-20"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <div className="p-6 md:p-8">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
              <span className="text-3xl font-bold text-white">
                {initialUserData ? '✏️' : '🎉'}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] bg-clip-text text-transparent">
                {initialUserData ? 'Atualizar Perfil' : 'Bem-vindo! 🏠'}
              </span>
            </h2>
            <p className="text-gray-400 text-sm">
              {initialUserData 
                ? 'Mantenha seu perfil sempre atualizado' 
                : 'Complete seu cadastro para começar'}
            </p>
          </div>

          {success && (
            <div className="p-4 bg-green-500 bg-opacity-10 border border-green-500 border-opacity-20 text-green-400 rounded-xl flex items-start mb-6">
              <CheckCircle className="flex-shrink-0 mr-3 mt-0.5" size={18} />
              <span className="text-sm">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username field */}
            <div>
              <label className="block text-gray-300 mb-2 text-sm font-medium">
                Nome de usuário <span className="text-[#ff286a]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={checkUsername}
                  placeholder="ex: joao silva"
                  className={`w-full px-4 py-3 bg-[#2a2a2a] border ${
                    usernameStatus === 'taken' || usernameStatus === 'invalid' 
                      ? 'border-red-500' 
                      : usernameStatus === 'available' 
                        ? 'border-green-500' 
                        : 'border-gray-700'
                  } rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[#ff286a] focus:border-transparent outline-none transition pr-24`}
                  required
                />
                <button 
                  type="button" 
                  onClick={checkUsername}
                  disabled={!formData.username || usernameStatus === 'checking'}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    !formData.username || usernameStatus === 'checking'
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] text-white hover:opacity-90'
                  }`}
                >
                  {usernameStatus === 'checking' ? (
                    <Loader size={14} className="animate-spin" />
                  ) : (
                    'Verificar'
                  )}
                </button>
              </div>
              <div className="mt-2 text-xs h-5">
                {getUsernameStatusMessage()}
              </div>
            </div>

            {/* Province and City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">
                  Província <span className="text-[#ff286a]">*</span>
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-[#2a2a2a] border ${
                    touchedFields.province && !formData.province 
                      ? 'border-red-500' 
                      : 'border-gray-700'
                  } rounded-xl text-white focus:ring-2 focus:ring-[#ff286a] focus:border-transparent outline-none transition appearance-none cursor-pointer`}
                  required
                >
                  <option value="" className="bg-[#2a2a2a]">Selecione...</option>
                  {provinces.map(province => (
                    <option key={province.code} value={province.code} className="bg-[#2a2a2a]">
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">
                  Cidade <span className="text-[#ff286a]">*</span>
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={!formData.province}
                  className={`w-full px-4 py-3 bg-[#2a2a2a] border ${
                    touchedFields.city && !formData.city 
                      ? 'border-red-500' 
                      : 'border-gray-700'
                  } rounded-xl text-white focus:ring-2 focus:ring-[#ff286a] focus:border-transparent outline-none transition disabled:opacity-50 disabled:cursor-not-allowed appearance-none`}
                  required
                >
                  <option value="" className="bg-[#2a2a2a]">Selecione...</option>
                  {cities.map(city => (
                    <option key={city} value={city} className="bg-[#2a2a2a]">
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Age confirmation */}
            <div className="flex items-start pt-4">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  name="isOver13"
                  id="isOver13"
                  checked={formData.isOver13}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#2a2a2a] border-gray-700 rounded focus:ring-[#ff286a] text-[#ff286a]"
                  required
                />
              </div>
              <label htmlFor="isOver13" className="ml-3">
                <span className="text-sm text-gray-300">
                  Confirmo que tenho mais de 13 anos <span className="text-[#ff286a]">*</span>
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Esta plataforma é destinada a maiores de 13 anos
                </p>
              </label>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 text-red-400 rounded-xl flex items-start">
                <XCircle className="flex-shrink-0 mr-3 mt-0.5" size={18} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || usernameStatus !== 'available'}
              className={`w-full py-4 px-4 text-white font-bold rounded-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 text-lg ${
                loading || usernameStatus !== 'available'
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] hover:shadow-lg hover:shadow-[#ff286a]/20'
              }`}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <span>{initialUserData ? 'Atualizar Perfil' : 'Começar'}</span>
                  <span className="text-xl">✨</span>
                </>
              )}
            </button>

            {/* Footer note */}
            <p className="text-center text-xs text-gray-600 mt-4">
              Seus dados estão seguros e não serão compartilhados
            </p>
          </form>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes floatTikTok {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          33% { transform: translateY(-20px) translateX(10px) rotate(120deg); }
          66% { transform: translateY(10px) translateX(-10px) rotate(240deg); }
        }
      `}</style>
    </div>
  );
};

export default CompleteProfileModal;