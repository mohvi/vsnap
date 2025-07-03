import React, { useEffect, useState } from 'react';
import { Search, Filter, X, Loader } from 'react-feather';
import provinces from '../utils/provinces';
import { db } from '../fb';
import { get, ref } from 'firebase/database';

const UserList = ({ onClose }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    username: '',
    province: '',
    city: ''
  });
  
  const [cities, setCities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          const usersArray = Object.entries(usersData).map(([uid, user]) => ({
            uid,
            ...user
          }));
          
          setUsers(usersArray);
          setFilteredUsers(usersArray);
        } else {
          setUsers([]);
          setFilteredUsers([]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Erro ao carregar usuários');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  useEffect(() => {
    if (filters.province) {
      const selectedProvince = provinces.find(p => p.code === filters.province);
      setCities(selectedProvince?.cities || []);
      if (!selectedProvince?.cities.includes(filters.city)) {
        setFilters(prev => ({ ...prev, city: '' }));
      }
    } else {
      setCities([]);
      setFilters(prev => ({ ...prev, city: '' }));
    }
  }, [filters.province]);

  useEffect(() => {
    applyFilters();
  }, [filters, users]);

  const applyFilters = () => {
    let result = [...users];
    
    if (filters.username) {
      const searchTerm = filters.username.toLowerCase();
      result = result.filter(user => 
        user.username?.toLowerCase().includes(searchTerm)
      );
    }
    if (filters.province) {
      result = result.filter(user => 
        user.province === filters.province)
    }
    if (filters.city) {
      result = result.filter(user => 
        user.city === filters.city)
    }
    setFilteredUsers(result);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const resetFilters = () => {
    setFilters({
      username: '',
      province: '',
      city: ''
    });
    setFilteredUsers(users);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto my-8 relative max-h-[90vh] flex flex-col">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Fechar"
        >
          <X size={24} />
        </button>

        <div className="p-6 border-b">
          <h2 className="text-2xl md:text-3xl font-bold text-purple-600 mb-1">
            Lista de Usuários
          </h2>
          <p className="text-gray-600">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário encontrado' : 'usuários encontrados'}
          </p>
        </div>

        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                name="username"
                value={filters.username}
                onChange={handleFilterChange}
                placeholder="Buscar por nome de usuário..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                showFilters ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Filter size={16} />
              <span>Filtros</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1 font-medium">Província</label>
                  <select
                    name="province"
                    value={filters.province}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Todas províncias</option>
                    {provinces.map(province => (
                      <option key={province.code} value={province.code}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 font-medium">Cidade</label>
                  <select
                    name="city"
                    value={filters.city}
                    onChange={handleFilterChange}
                    disabled={!filters.province}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">Todas cidades</option>
                    {cities.map(city => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="animate-spin text-purple-500" size={32} />
            </div>
          ) : error ? (
            <div className="p-4 text-red-500 text-center">{error}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum usuário encontrado com os filtros atuais
            </div>
          ) : (
            <div className="divide-y">
              {filteredUsers.map(user => (
                <div key={user.uid} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-lg">
                        {user.username || 'Usuário sem nome'}
                      </h3>
                      <div className="text-gray-600 text-sm mt-1">
                        {user.city && user.province ? (
                          `${user.city}, ${provinces.find(p => p.code === user.province)?.name || user.province}`
                        ) : (
                          'Localização não informada'
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Cadastrado em: {formatDate(user.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserList;