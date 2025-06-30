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
    
    const usernameRegex = /^[\w ]{3,20}$/; // Allows letters, numbers, underscore and spaces
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
        return <span className="flex items-center text-blue-500"><Loader size={14} className="animate-spin mr-1" /> Verificando...</span>;
      case 'available':
        return <span className="flex items-center text-green-500"><CheckCircle size={14} className="mr-1" /> Disponível</span>;
      case 'taken':
      case 'invalid':
        return <span className="flex items-center text-red-500"><XCircle size={14} className="mr-1" /> {usernameStatus === 'taken' ? 'Indisponível' : 'Inválido'}</span>;
      default:
        return <span className="text-gray-500">3-20 caracteres (letras, números, _ e espaços)</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto my-8 relative">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Fechar"
        >
          <X size={24} />
        </button>

        <div className="p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-purple-600 mb-1">
              {initialUserData ? 'Atualize seu perfil' : 'Complete seu perfil'}
            </h2>
            <p className="text-gray-600">Precisamos de algumas informações para personalizar sua experiência</p>
          </div>

          {success && (
            <div className="p-3 bg-green-50 text-green-600 rounded-lg flex items-start mb-4">
              <CheckCircle className="flex-shrink-0 mr-2 mt-0.5" size={16} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Nome de usuário*</label>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={checkUsername}
                  placeholder="ex: joao silva"
                  className={`w-full px-4 py-2 rounded-lg border-2 ${usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-300' : usernameStatus === 'available' ? 'border-green-300' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-20`}
                  required
                />
                <button 
                  type="button" 
                  onClick={checkUsername}
                  disabled={!formData.username || usernameStatus === 'checking'}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-sm rounded-md transition-colors ${
                    !formData.username || usernameStatus === 'checking'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                  }`}
                >
                  {usernameStatus === 'checking' ? 'Verificando...' : 'Verificar'}
                </button>
              </div>
              <div className="mt-1 text-sm h-5">
                {getUsernameStatusMessage()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1 font-medium">Província*</label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border-2 ${touchedFields.province && !formData.province ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  required
                >
                  <option value="">Selecione...</option>
                  {provinces.map(province => (
                    <option key={province.code} value={province.code}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-1 font-medium">Cidade*</label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={!formData.province}
                  className={`w-full px-4 py-2 rounded-lg border-2 ${touchedFields.city && !formData.city ? 'border-red-300' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50`}
                  required
                >
                  <option value="">Selecione...</option>
                  {cities.map(city => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-start pt-2">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  name="isOver13"
                  id="isOver13"
                  checked={formData.isOver13}
                  onChange={handleChange}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  required
                />
              </div>
              <label htmlFor="isOver13" className="ml-3 text-gray-700">
                <span>Eu confirmo que tenho mais de 13 anos*</span>
                <p className="text-xs text-gray-500 mt-1">Esta plataforma é destinada a maiores de 13 anos</p>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-start">
                <XCircle className="flex-shrink-0 mr-2 mt-0.5" size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || usernameStatus !== 'available'}
              className={`w-full py-3 px-4 text-white font-bold rounded-lg transition-colors flex items-center justify-center ${
                loading || usernameStatus !== 'available'
                  ? 'bg-purple-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg'
              }`}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin mr-2" size={18} />
                  Salvando...
                </>
              ) : (
                initialUserData ? 'Atualizar Perfil' : 'Completar Cadastro'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfileModal;