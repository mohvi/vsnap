import { useState, useEffect } from 'react';
import { ArrowRight, Star, Gift, Plus, Filter, Search, ChevronRight, Award, X } from 'lucide-react';

export default function Challenges() {
  // Estados para controle da UI
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [sortBy, setSortBy] = useState('recent');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Dados das marcas com URLs de imagens reais
  const brands = [
    { id: 1, name: 'Nike', logo: 'https://i.imgur.com/LJ7OJ2w.png' },
    { id: 2, name: 'Adidas', logo: 'https://i.imgur.com/9ZqVS1h.png' },
    { id: 3, name: 'Apple', logo: 'https://i.imgur.com/8nLfDHm.png' },
    { id: 4, name: 'Samsung', logo: 'https://i.imgur.com/6Q9YQ9Z.png' },
    { id: 5, name: 'Zara', logo: 'https://i.imgur.com/2QJQ9Q9.png' },
    { id: 6, name: 'H&M', logo: 'https://i.imgur.com/6Q9YQ9Z.png' },
    { id: 7, name: 'Gucci', logo: 'https://i.imgur.com/8nLfDHm.png' },
  ];

  // Desafio em destaque
  const featuredChallenge = {
    id: 101,
    title: 'Nike Fitness Challenge',
    brand: 'Nike',
    reward: '20% OFF + 1,000 MT',
    image: 'https://i.imgur.com/LJ7OJ2w.png',
    description: 'Complete 10km de corrida esta semana e ganhe recompensas exclusivas da Nike!',
    participants: 320,
    rating: 4.9,
    daysLeft: 3,
    createdAt: new Date('2023-05-10')
  };

  // Lista de desafios
  const allChallenges = [
    { id: 1, title: 'Apple Tech Quiz', brand: 'Apple', reward: '5,000 MT', image: 'https://i.imgur.com/8nLfDHm.png', description: 'Responda 10 perguntas sobre tecnologia e mostre seu conhecimento.', participants: 150, rating: 4.7, featured: true, createdAt: new Date('2023-05-15') },
    { id: 2, title: 'Samsung Photo Contest', brand: 'Samsung', reward: '10% OFF', image: 'https://i.imgur.com/6Q9YQ9Z.png', description: 'Envie sua melhor foto tirada com um dispositivo Galaxy.', participants: 210, rating: 4.5, createdAt: new Date('2023-05-12') },
    { id: 3, title: 'Zara Style Challenge', brand: 'Zara', reward: '2,000 MT', image: 'https://i.imgur.com/2QJQ9Q9.png', description: 'Crie um look fashion usando peças Zara e compartilhe nas redes.', participants: 180, rating: 4.3, featured: true, createdAt: new Date('2023-05-18') },
    { id: 4, title: 'Apple Fitness Track', brand: 'Apple', reward: '15% OFF', image: 'https://i.imgur.com/8nLfDHm.png', description: 'Registre 5 treinos com Apple Watch nesta semana.', participants: 95, rating: 4.8, createdAt: new Date('2023-05-14') },
    { id: 5, title: 'H&M Eco Challenge', brand: 'H&M', reward: '1,500 MT', image: 'https://i.imgur.com/6Q9YQ9Z.png', description: 'Recicle 5 peças de roupa e contribua para um planeta mais sustentável.', participants: 120, rating: 4.6, createdAt: new Date('2023-05-16') },
    { id: 6, title: 'Gucci Design Contest', brand: 'Gucci', reward: '3,000 MT', image: 'https://i.imgur.com/8nLfDHm.png', description: 'Crie um design de acessório inspirado na nova coleção Gucci.', participants: 75, rating: 4.9, featured: true, createdAt: new Date('2023-05-20') },
  ];

  // Filtrar e ordenar desafios
  const [filteredChallenges, setFilteredChallenges] = useState(allChallenges);

  useEffect(() => {
    let result = [...allChallenges];
    
    // Filtro por pesquisa
    if (searchQuery) {
      result = result.filter(challenge => 
        challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        challenge.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        challenge.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filtro por marcas selecionadas
    if (selectedBrands.length > 0) {
      result = result.filter(challenge => 
        selectedBrands.includes(challenge.brand)
      );
    }
    
    // Ordenação
    switch(sortBy) {
      case 'popular':
        result.sort((a, b) => b.participants - a.participants);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'reward':
        // Extrai o valor numérico da recompensa para ordenação
        result.sort((a, b) => {
          const getValue = (reward) => {
            const match = reward.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
          };
          return getValue(b.reward) - getValue(a.reward);
        });
        break;
      default: // 'recent'
        result.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    setFilteredChallenges(result);
  }, [searchQuery, selectedBrands, sortBy]);

  // Manipuladores de filtros
  const toggleBrandFilter = (brandName) => {
    setSelectedBrands(prev => 
      prev.includes(brandName) 
        ? prev.filter(b => b !== brandName) 
        : [...prev, brandName]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedBrands([]);
    setSortBy('recent');
  };

  // Manipulador de criação de desafio (simulado)
  const handleCreateChallenge = (e) => {
    e.preventDefault();
    // Aqui você implementaria a lógica real de criação
    alert('Desafio criado com sucesso! Em breve nossa equipe entrará em contato.');
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-20 bg-white shadow-sm p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-purple-800">Desafios VotaSnap</h1>
          <div className="flex space-x-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar..."
                className="pl-8 pr-4 py-2 w-40 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-500" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2.5 w-4 h-4 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button 
              className={`p-2 rounded-full ${showFilters ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'} hover:bg-purple-100 transition`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Filtros */}
      {showFilters && (
        <div className="sticky top-16 z-10 bg-white shadow-md p-4 animate-slideDown">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-medium">Filtrar Desafios</h2>
            <button 
              onClick={clearFilters}
              className="text-sm text-purple-600 hover:text-purple-800"
            >
              Limpar tudo
            </button>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Ordenar por:</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'recent', label: 'Mais recentes' },
                { value: 'popular', label: 'Mais populares' },
                { value: 'rating', label: 'Melhor avaliados' },
                { value: 'reward', label: 'Maiores recompensas' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`px-3 py-1 text-xs rounded-full ${sortBy === option.value ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Filtrar por marca:</h3>
            <div className="flex flex-wrap gap-2">
              {brands.map(brand => (
                <button
                  key={brand.id}
                  onClick={() => toggleBrandFilter(brand.name)}
                  className={`px-3 py-1 text-xs rounded-full flex items-center ${selectedBrands.includes(brand.name) ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {brand.name}
                  {selectedBrands.includes(brand.name) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navegação de Marcas */}
      <div className="px-4 py-3 bg-white sticky top-16 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Marcas Parceiras</h2>
          <button className="text-xs text-purple-600 flex items-center">
            Ver todas <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex space-x-4 overflow-x-auto pb-2 hide-scrollbar">
          {brands.map(brand => (
            <button 
              key={brand.id} 
              className={`flex flex-col items-center flex-shrink-0 group ${selectedBrands.includes(brand.name) ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
              onClick={() => toggleBrandFilter(brand.name)}
            >
              <div className={`w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center overflow-hidden border-2 ${selectedBrands.includes(brand.name) ? 'border-purple-500' : 'border-transparent group-hover:border-purple-300'} transition-all duration-200`}>
                <img 
                  src={brand.logo} 
                  alt={brand.name} 
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    e.target.src = 'https://i.imgur.com/6Q9YQ9Z.png';
                  }}
                />
              </div>
              <span className={`text-xs mt-1 ${selectedBrands.includes(brand.name) ? 'text-purple-700 font-medium' : 'text-gray-600 group-hover:text-purple-700'} transition`}>{brand.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desafio em Destaque */}
      {(!searchQuery && selectedBrands.length === 0) && (
        <div className="p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3 px-2">Destaque da Semana</h2>
          <div className="relative bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl overflow-hidden shadow-lg">
            <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full flex items-center">
              <Award className="w-3 h-3 mr-1" /> TOP
            </div>
            
            <div className="p-5 text-white">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-purple-100">{featuredChallenge.brand}</p>
                  <h3 className="font-bold text-xl">{featuredChallenge.title}</h3>
                </div>
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                  {featuredChallenge.reward}
                </span>
              </div>
              
              <p className="text-purple-100 text-sm mb-4">{featuredChallenge.description}</p>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="flex -space-x-1">
                    {[1,2,3].map((item) => (
                      <div key={item} className="w-6 h-6 rounded-full bg-white/30 border border-white"></div>
                    ))}
                  </div>
                  <span className="text-xs ml-2 text-purple-100">
                    +{featuredChallenge.participants} participantes
                  </span>
                </div>
                
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  <span className="text-xs ml-1">{featuredChallenge.rating}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-4 flex justify-between items-center">
              <span className="text-xs text-white">
                <span className="font-semibold">{featuredChallenge.daysLeft} dias</span> restantes
              </span>
              <button className="bg-white text-purple-700 text-sm font-semibold px-4 py-2 rounded-full flex items-center hover:bg-purple-50 transition">
                Participar <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desafios Disponíveis */}
      <div className="px-4 mt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-800">
            {searchQuery || selectedBrands.length > 0 ? 'Resultados' : 'Desafios para Você'}
            {filteredChallenges.length === 0 && ' (Nenhum resultado encontrado)'}
          </h2>
          {filteredChallenges.length > 0 && (
            <button className="text-sm text-purple-600 flex items-center">
              Ver mais <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {filteredChallenges.map(challenge => (
            <div 
              key={challenge.id} 
              className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition ${challenge.featured ? 'border-l-4 border-purple-500' : ''}`}
            >
              <div className="flex">
                <div className="w-1/3 relative">
                  <img 
                    src={challenge.image} 
                    alt={challenge.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://i.imgur.com/6Q9YQ9Z.png';
                    }}
                  />
                  {challenge.featured && (
                    <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-0.5 rounded">
                      Destaque
                    </div>
                  )}
                </div>
                
                <div className="w-2/3 p-3 flex flex-col">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800 line-clamp-1">{challenge.title}</h3>
                      <p className="text-xs text-gray-500">{challenge.brand}</p>
                    </div>
                    <button className="text-gray-400 hover:text-yellow-400 transition">
                      <Star className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <p className="text-gray-600 text-xs mt-1 line-clamp-2">{challenge.description}</p>
                  
                  <div className="mt-auto pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 flex items-center">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 mr-1" />
                        {challenge.rating} ({challenge.participants})
                      </span>
                      <span className="text-sm font-bold text-green-600">{challenge.reward}</span>
                    </div>
                    
                    <button className="w-full mt-2 bg-purple-600 text-white text-xs py-1.5 rounded-lg flex items-center justify-center hover:bg-purple-700 transition">
                      <Gift className="w-3 h-3 mr-1" />
                      Participar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botão Fixo para Criar Desafio */}
      <div className="fixed bottom-20 right-4 z-10">
        <button 
          className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition transform hover:scale-105 flex items-center justify-center"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-6 h-6" />
          <span className="sr-only">Criar desafio</span>
        </button>
      </div>

      {/* Botão Fixo para WhatsApp */}
      <div className="fixed bottom-4 left-4 right-4 z-10">
        <a
          href="https://wa.me/258840237100"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition flex items-center justify-center"
        >
          <span>Quero criar meu desafio</span>
          <ArrowRight className="w-5 h-5 ml-2" />
        </a>
      </div>

      {/* Modal de Criação de Desafio */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 animate-popIn">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Criar Novo Desafio</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateChallenge}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título do Desafio</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ex: Nike Fitness Challenge"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca/Organização</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ex: Nike"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    rows={3}
                    placeholder="Descreva o desafio em detalhes..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recompensa</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ex: 20% OFF + 1,000 MT"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duração (dias)</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    min="1"
                    defaultValue="7"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Criar Desafio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Estilos personalizados */}
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
        @keyframes popIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-popIn {
          animation: popIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}