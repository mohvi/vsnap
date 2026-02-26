import React, { useState, useEffect } from 'react';
import { ref as dbRef, onValue, update, remove, query, orderByChild } from 'firebase/database';
import { deleteObject, ref as storageRef } from 'firebase/storage';
import { db, storage } from '../fb';
import { 
  FiBarChart2, FiUsers, FiEye, FiShare2, FiHeart, 
  FiEdit, FiTrash2, FiSearch, FiFilter, FiCalendar,
  FiChevronLeft, FiPlus, FiDownload, FiMenu, FiX
} from 'react-icons/fi';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import AdminChallengeForm from './CreateChallengeForm';
import { Link } from 'react-router-dom';

Chart.register(...registerables);

const AdminDashboard = () => {
  const [challenges, setChallenges] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [view, setView] = useState('list'); // 'list', 'stats', 'edit', 'create', 'users'
  const [statsPeriod, setStatsPeriod] = useState('7days');
  const [statsData, setStatsData] = useState(null);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load data from Firebase
  useEffect(() => {
    setLoading(true);
    const challengesRef = dbRef(db, 'challenges');
    const participationsRef = dbRef(db, 'participations');
    const referralsRef = dbRef(db, 'referrals');
    const usersRef = dbRef(db, 'users');

    const unsubscribeChallenges = onValue(challengesRef, (snapshot) => {
      const data = snapshot.val();
      const challengesArray = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key],
        createdAt: data[key].createdAt ? new Date(data[key].createdAt).toISOString() : null,
        deadline: data[key].deadline ? new Date(data[key].deadline).toISOString() : null
      })) : [];
      setChallenges(challengesArray);
    });

    const unsubscribeParticipations = onValue(participationsRef, (snapshot) => {
      const data = snapshot.val();
      let participationsArray = [];
      if (data) {
        Object.keys(data).forEach(challengeId => {
          Object.keys(data[challengeId]).forEach(participationId => {
            participationsArray.push({
              id: participationId,
              challengeId,
              ...data[challengeId][participationId],
              createdAt: data[challengeId][participationId].createdAt ? 
                new Date(data[challengeId][participationId].createdAt).toISOString() : null
            });
          });
        });
      }
      setParticipations(participationsArray);
    });

    const unsubscribeReferrals = onValue(referralsRef, (snapshot) => {
      const data = snapshot.val();
      let referralsArray = [];
      if (data) {
        Object.keys(data).forEach(referrer => {
          Object.keys(data[referrer]).forEach(referralId => {
            referralsArray.push({
              referrer,
              referralId,
              ...data[referrer][referralId]
            });
          });
        });
      }
      setReferrals(referralsArray);
    });

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const usersArray = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      setUsers(usersArray);
      setLoading(false);
    });

    return () => {
      unsubscribeChallenges();
      unsubscribeParticipations();
      unsubscribeReferrals();
      unsubscribeUsers();
    };
  }, []);

  // Load stats data
  useEffect(() => {
    if (view === 'stats') {
      loadStatsData();
    }
  }, [view, selectedChallenge, statsPeriod]);

  const loadStatsData = async () => {
    setStatsLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      if (statsPeriod === '7days') {
        startDate.setDate(now.getDate() - 7);
      } else if (statsPeriod === '30days') {
        startDate.setDate(now.getDate() - 30);
      } else {
        startDate = new Date(0);
      }

      let filteredParticipations = participations;
      if (selectedChallenge) {
        filteredParticipations = participations.filter(p => p.challengeId === selectedChallenge.id);
      }
      filteredParticipations = filteredParticipations.filter(p => p.createdAt && new Date(p.createdAt) >= startDate);

      const totalParticipants = filteredParticipations.length;
      const totalLikes = filteredParticipations.reduce((sum, p) => sum + (p.likes || 0), 0);

      // Generate date range for engagement chart to ensure non-empty labels
      const dateRange = [];
      const currentDate = new Date(startDate);
      while (currentDate <= now) {
        dateRange.push(new Date(currentDate).toLocaleDateString('pt-BR'));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const engagementByDate = filteredParticipations.reduce((acc, p) => {
        const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : null;
        if (date && !acc[date]) {
          acc[date] = { likes: 0, participants: 0 };
        }
        if (date) {
          acc[date].likes += p.likes || 0;
          acc[date].participants += 1;
        }
        return acc;
      }, {});

      // Ensure all dates in range have data
      dateRange.forEach(date => {
        if (!engagementByDate[date]) {
          engagementByDate[date] = { likes: 0, participants: 0 };
        }
      });

      const engagementLabels = dateRange;
      const engagementData = {
        labels: engagementLabels,
        datasets: [
          {
            label: 'Likes',
            data: engagementLabels.map(date => engagementByDate[date].likes),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.3
          },
          {
            label: 'Participantes',
            data: engagementLabels.map(date => engagementByDate[date].participants),
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.3
          },
        ],
      };

      const likeRanges = {
        '0-50': 0,
        '51-100': 0,
        '101-200': 0,
        '201+': 0
      };

      filteredParticipations.forEach(p => {
        const likes = p.likes || 0;
        if (likes <= 50) likeRanges['0-50']++;
        else if (likes <= 100) likeRanges['51-100']++;
        else if (likes <= 200) likeRanges['101-200']++;
        else likeRanges['201+']++;
      });

      const provinceDistribution = filteredParticipations.reduce((acc, p) => {
        const user = users.find(u => u.id === p.userId);
        const province = user?.province || 'Unknown';
        acc[province] = (acc[province] || 0) + 1;
        return acc;
      }, {});

      const topParticipants = [...filteredParticipations]
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          name: p.userName || 'Anônimo',
          likes: p.likes || 0,
          avatar: p.userAvatar || '',
          challengeId: p.challengeId
        }));

      const ageGroups = {
        '18-24': Math.floor(totalParticipants * 0.35),
        '25-34': Math.floor(totalParticipants * 0.45),
        '35-44': Math.floor(totalParticipants * 0.15),
        '45+': Math.floor(totalParticipants * 0.05)
      };

      setStatsData({
        metrics: {
          participants: totalParticipants,
          likes: totalLikes,
          impressions: Math.floor(totalParticipants * 3.2),
          shares: Math.floor(totalParticipants * 0.8),
          referrals: referrals.length
        },
        engagement: engagementData,
        participation: {
          labels: Object.keys(likeRanges),
          datasets: [
            {
              label: 'Participantes por faixa de likes',
              data: Object.values(likeRanges),
              backgroundColor: [
                'rgba(255, 99, 132, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
              ],
            },
          ],
        },
        demographics: {
          labels: Object.keys(ageGroups),
          datasets: [
            {
              label: 'Faixa etária',
              data: Object.values(ageGroups),
              backgroundColor: [
                'rgba(153, 102, 255, 0.7)',
                'rgba(255, 159, 64, 0.7)',
                'rgba(255, 99, 132, 0.7)',
                'rgba(54, 162, 235, 0.7)',
              ],
            },
          ],
        },
        provinces: {
          labels: Object.keys(provinceDistribution).length ? Object.keys(provinceDistribution) : ['Nenhum dado'],
          datasets: [
            {
              label: 'Participantes por província',
              data: Object.values(provinceDistribution).length ? Object.values(provinceDistribution) : [0],
              backgroundColor: [
                'rgba(255, 99, 132, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)',
              ],
            },
          ],
        },
        topParticipants
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
      setStatsData({
        metrics: { participants: 0, likes: 0, impressions: 0, shares: 0, referrals: 0 },
        engagement: { labels: [], datasets: [] },
        participation: { labels: ['Nenhum dado'], datasets: [{ label: 'Participantes por faixa de likes', data: [0], backgroundColor: ['rgba(255, 99, 132, 0.7)'] }] },
        demographics: { labels: ['Nenhum dado'], datasets: [{ label: 'Faixa etária', data: [0], backgroundColor: ['rgba(153, 102, 255, 0.7)'] }] },
        provinces: { labels: ['Nenhum dado'], datasets: [{ label: 'Participantes por província', data: [0], backgroundColor: ['rgba(255, 99, 132, 0.7)'] }] },
        topParticipants: []
      });
    } finally {
      setStatsLoading(false);
    }
  };

  // Filter and sort challenges
  const filteredChallenges = challenges
    .filter(challenge => {
      const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (challenge.brand?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === 'all' || challenge.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      if (sortField === 'participants') {
        const aParticipants = participations.filter(p => p.challengeId === a.id).length;
        const bParticipants = participations.filter(p => p.challengeId === b.id).length;
        return sortOrder === 'asc' ? aParticipants - bParticipants : bParticipants - aParticipants;
      }
      if (sortField === 'likes') {
        const aLikes = participations.filter(p => p.challengeId === a.id).reduce((sum, p) => sum + (p.likes || 0), 0);
        const bLikes = participations.filter(p => p.challengeId === b.id).reduce((sum, p) => sum + (p.likes || 0), 0);
        return sortOrder === 'asc' ? aLikes - bLikes : bLikes - aLikes;
      }
      return sortOrder === 'asc' ? 
             (aValue < bValue ? -1 : 1) : 
             (aValue > bValue ? -1 : 1);
    });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentChallenges = filteredChallenges.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredChallenges.length / itemsPerPage);

  // Calculate totals
  const calculateTotals = () => {
    return {
      participants: participations.length,
      likes: participations.reduce((sum, p) => sum + (p.likes || 0), 0),
      activeChallenges: challenges.filter(c => c.status === 'active').length,
      endedChallenges: challenges.filter(c => c.status === 'ended').length,
      totalUsers: users.length,
      totalReferrals: referrals.length
    };
  };

  const totals = calculateTotals();

  // Toggle challenge status
  const toggleChallengeStatus = async (challengeId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await update(dbRef(db, `challenges/${challengeId}`), { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Delete challenge
  const deleteChallenge = async (challengeId, imagePath, logoPath) => {
    if (!window.confirm('Tem certeza que deseja excluir este desafio permanentemente?')) return;
    try {
      await remove(dbRef(db, `challenges/${challengeId}`));
      const challengeParticipations = participations.filter(p => p.challengeId === challengeId);
      await Promise.all(
        challengeParticipations.map(p => 
          remove(dbRef(db, `participations/${challengeId}/${p.id}`))
        )
      );
      if (imagePath) {
        const imageRef = storageRef(storage, imagePath);
        await deleteObject(imageRef);
      }
      if (logoPath) {
        const logoRef = storageRef(storage, logoPath);
        await deleteObject(logoRef);
      }
      alert('Desafio excluído com sucesso!');
    } catch (error) {
      console.error("Error deleting challenge:", error);
      alert('Erro ao excluir desafio. Por favor, tente novamente.');
    }
  };

  // Export data
  const exportData = (type) => {
    const dataToExport = view === 'users' ? users : filteredChallenges.map(challenge => ({
      id: challenge.id,
      title: challenge.title,
      brand: challenge.brand?.name || 'N/A',
      status: challenge.status,
      participants: participations.filter(p => p.challengeId === challenge.id).length,
      likes: participations.filter(p => p.challengeId === challenge.id).reduce((sum, p) => sum + (p.likes || 0), 0),
      createdAt: formatDate(challenge.createdAt),
      deadline: formatDate(challenge.deadline)
    }));

    if (type === 'csv') {
      const headers = view === 'users' ? 
        ['ID', 'Username', 'Email', 'Province', 'Join Date', 'Referrer'] :
        ['ID', 'Title', 'Brand', 'Status', 'Participants', 'Likes', 'Created At', 'Deadline'];
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(item => 
          view === 'users' ?
            `"${item.id}","${item.username || ''}","${item.email}","${item.province || ''}","${formatDate(item.joinDate)}","${item.referrer || ''}"` :
            `"${item.id}","${item.title}","${item.brand}","${item.status}","${item.participants}","${item.likes}","${item.createdAt}","${item.deadline}"`
        )
      ].join('\n');
      downloadFile(csvContent, 'dashboard_data.csv', 'text/csv');
    } else {
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      downloadFile(jsonContent, 'dashboard_data.json', 'application/json');
    }
  };

  const downloadFile = (content, fileName, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // View handlers
  if (view === 'create' || (view === 'edit' && selectedChallenge)) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => {
              setView('list');
              setSelectedChallenge(null);
            }}
            className="mb-6 flex items-center text-blue-600 hover:text-blue-800"
          >
            <FiChevronLeft className="mr-1" /> Voltar para a lista
          </button>
          <AdminChallengeForm 
            challengeToEdit={view === 'edit' ? selectedChallenge : null} 
            onSuccess={() => {
              setView('list');
              setSelectedChallenge(null);
            }} 
          />
        </div>
      </div>
    );
  }

  if (view === 'stats') {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => setView('list')}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <FiChevronLeft className="mr-1" /> Voltar para a lista
            </button>
            <h2 className="text-2xl font-bold text-gray-800">
              {selectedChallenge ? (
                <>
                  Estatísticas: <span className="text-blue-600">{selectedChallenge.title}</span>
                </>
              ) : 'Estatísticas Gerais'}
            </h2>
            <div className="flex space-x-2">
              <select
                value={statsPeriod}
                onChange={(e) => setStatsPeriod(e.target.value)}
                className="border rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="7days">Últimos 7 dias</option>
                <option value="30days">Últimos 30 dias</option>
                <option value="all">Todo o período</option>
              </select>
              <button
                onClick={() => exportData('csv')}
                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FiDownload className="mr-1" /> Exportar CSV
              </button>
            </div>
          </div>

          {statsLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : statsData && statsData.engagement.labels.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <MetricCard 
                  icon={<FiUsers size={24} />}
                  title="Participantes"
                  value={statsData.metrics.participants}
                  change="+12%"
                />
                <MetricCard 
                  icon={<FiHeart size={24} />}
                  title="Likes"
                  value={statsData.metrics.likes}
                  change="+24%"
                />
                <MetricCard 
                  icon={<FiEye size={24} />}
                  title="Impressões"
                  value={statsData.metrics.impressions}
                  change="+8%"
                />
                <MetricCard 
                  icon={<FiShare2 size={24} />}
                  title="Compartilhamentos"
                  value={statsData.metrics.shares}
                  change="+15%"
                />
                <MetricCard 
                  icon={<FiUsers size={24} />}
                  title="Referências"
                  value={statsData.metrics.referrals}
                  change="+10%"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Engajamento ao longo do tempo</h3>
                  <div className="h-80">
                    <Line 
                      data={statsData.engagement} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
                        scales: { y: { beginAtZero: true } }
                      }}
                    />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Distribuição de likes</h3>
                  <div className="h-80">
                    <Bar 
                      data={statsData.participation} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } }
                      }}
                    />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Demografia dos participantes</h3>
                  <div className="h-80">
                    <Pie 
                      data={statsData.demographics} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'right' } }
                      }}
                    />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Distribuição por província</h3>
                  <div className="h-80">
                    <Pie 
                      data={statsData.provinces} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'right' } }
                      }}
                    />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Top participantes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {statsData.topParticipants.map((participant, index) => (
                      <div 
                        key={participant.id} 
                        className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3 overflow-hidden">
                            {participant.avatar ? (
                              <img 
                                src={participant.avatar} 
                                alt={participant.name} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = '';
                                  e.target.className = 'w-full h-full object-cover hidden';
                                  e.target.nextElementSibling.className = 'text-sm font-medium';
                                }}
                              />
                            ) : null}
                            <span className="text-sm font-medium hidden">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{participant.name}</p>
                            <p className="text-xs text-gray-500">
                              {participant.challengeId ? 
                                challenges.find(c => c.id === participant.challengeId)?.title || 'Desafio' : 
                                'Desafio'}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold flex items-center text-red-500">
                          <FiHeart className="mr-1" />
                          {participant.likes.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
              Nenhum dado estatístico disponível para o período selecionado
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'users') {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => setView('list')}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <FiChevronLeft className="mr-1" /> Voltar para a lista
            </button>
            <h2 className="text-2xl font-bold text-gray-800">Gerenciamento de Usuários</h2>
            <button
              onClick={() => exportData('csv')}
              className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FiDownload className="mr-1" /> Exportar CSV
            </button>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  className="pl-10 pr-4 py-2 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todas as províncias</option>
                  {[...new Set(users.map(u => u.province))].filter(Boolean).map(province => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
              </div>
              <div>
                <button 
                  className="flex items-center justify-center border rounded-lg px-4 py-2 w-full hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                >
                  <FiFilter className="mr-2" />
                  Limpar filtros
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="p-8 text-center flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Província</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Inscrição</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referências</th>
                    </tr>
                  </thead>
                <tbody className="bg-white divide-y divide-gray-200">
  {users
    .filter(user => 
      (user.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       user.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'all' || user.province === statusFilter)
    )
    .slice(indexOfFirstItem, indexOfLastItem)
    .map(user => (
      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10">
              <img 
                className="h-10 w-10 rounded-full object-cover border border-gray-200" 
                src={user.profilepic || '/placeholder-user.jpg'} 
                alt={user.username}
                onError={(e) => { e.target.src = '/placeholder-user.jpg'; }}
              />
            </div>
            <div className="ml-4">
              <Link 
                to={`user/${user.uid || user.id}`} 
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {user.username || 'N/A'}-   {user.contacto || 'N/A'}
              </Link>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <a href={`mailto:${user.email}`} className="hover:text-indigo-600 hover:underline">
            {user.email}
          </a>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.province || 'N/A'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.joinDate)}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <Link 
            to={`user/${user.uid || user.id}`} 
            className="hover:text-indigo-600 hover:underline"
          >
            {referrals.filter(r => r.referrer === user.username).length}
          </Link>
        </td>
      </tr>
    ))}
</tbody>
                </table>
              </div>
            )}
            <Pagination 
              currentPage={currentPage} 
              totalPages={Math.ceil(users.length / itemsPerPage)} 
              onPageChange={setCurrentPage} 
            />
          </div>
        </div>
      </div>
    );
  }

  // Main List View
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        <div className={`fixed inset-y-0 left-0 w-64  shadow-lg transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-30`}>
          <div >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">VotaSnap Admin</h2>
              <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
                <FiX size={24} />
              </button>
            </div>
            <nav className="space-y-2">
              <button 
                onClick={() => setView('list')}
                className={`w-full text-left px-4 py-2 rounded-lg ${view === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <FiBarChart2 className="inline mr-2" /> Desafios
              </button>
              <button 
                onClick={() => setView('users')}
                className={`w-full text-left px-4 py-2 rounded-lg ${view === 'users' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <FiUsers className="inline mr-2" /> Usuários
              </button>
              <button 
                onClick={() => setView('create')}
                className="w-full text-left px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <FiPlus className="inline mr-2" /> Criar Desafio
              </button>
            </nav>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <button className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
                <FiMenu size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Dashboard de Desafios</h1>
                <p className="text-gray-600">
                  {totals.activeChallenges} ativos, {totals.endedChallenges} finalizados • 
                  {' '}{totals.participants.toLocaleString()} participações • 
                  {' '}{totals.likes.toLocaleString()} likes • 
                  {' '}{totals.totalUsers.toLocaleString()} usuários
                </p>
              </div>
              <button
                onClick={() => exportData('csv')}
                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FiDownload className="mr-1" /> Exportar CSV
              </button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar desafios..."
                    className="pl-10 pr-4 py-2 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Todos os status</option>
                    <option value="active">Ativos</option>
                    <option value="paused">Pausados</option>
                    <option value="ended">Finalizados</option>
                  </select>
                </div>
                <div>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
                    className="border rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="createdAt">Data de Criação</option>
                    <option value="title">Título</option>
                    <option value="participants">Participantes</option>
                    <option value="likes">Likes</option>
                  </select>
                </div>
                <div>
                  <button 
                    className="flex items-center justify-center border rounded-lg px-4 py-2 w-full hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setSortField('createdAt');
                      setSortOrder('desc');
                    }}
                  >
                    <FiFilter className="mr-2" />
                    Limpar filtros
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {loading ? (
                <div className="p-8 text-center flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : currentChallenges.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Nenhum desafio encontrado
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participantes</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Likes</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentChallenges.map((challenge) => {
                        const challengeParticipations = participations.filter(p => p.challengeId === challenge.id);
                        const challengeLikes = challengeParticipations.reduce((sum, p) => sum + (p.likes || 0), 0);
                        
                        return (
                          <tr key={challenge.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <img 
                                    className="h-10 w-10 rounded-md object-cover border border-gray-200" 
                                    src={challenge.coverImage} 
                                    alt={challenge.title}
                                    onError={(e) => { e.target.src = '/placeholder-challenge.jpg'; }}
                                  />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{challenge.title}</div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <FiCalendar className="inline mr-1" />
                                    {formatDate(challenge.deadline)}
                                  </div>
                                </div>
                              </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-8 w-8">
                                    <img 
                                      className="h-8 w-8 rounded-full object-cover border border-gray-200" 
                                      src={challenge.brand?.logo} 
                                      alt={challenge.brand?.name}
                                      onError={(e) => { e.target.src = '/placeholder-brand.jpg'; }}
                                    />
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm text-gray-900">{challenge.brand?.name || 'N/A'}</div>
                                    <div className="text-xs text-gray-500">{challenge.brand?.category || ''}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  challenge.status === 'active' ? 'bg-green-100 text-green-800' :
                                  challenge.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {challenge.status === 'active' ? 'Ativo' : 
                                  challenge.status === 'paused' ? 'Pausado' : 'Finalizado'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center text-sm text-gray-900">
                                  <FiUsers className="mr-1 text-gray-500" />
                                  {challengeParticipations.length.toLocaleString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center text-sm text-gray-900">
                                  <FiHeart className="mr-1 text-red-500" />
                                  {challengeLikes.toLocaleString()}
                                  {challenge.likeGoal ? ` / ${challenge.likeGoal.toLocaleString()}` : ''}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => {
                                      setSelectedChallenge(challenge);
                                      setView('stats');
                                    }}
                                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                    title="Estatísticas"
                                  >
                                    <FiBarChart2 />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedChallenge(challenge);
                                      setView('edit');
                                    }}
                                    className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                                    title="Editar"
                                  >
                                    <FiEdit />
                                  </button>
                                  <button
                                    onClick={() => toggleChallengeStatus(challenge.id, challenge.status)}
                                    className={`p-1 rounded transition-colors ${
                                      challenge.status === 'active' ? 
                                        'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50' : 
                                        'text-green-600 hover:text-green-900 hover:bg-green-50'
                                    }`}
                                    title={challenge.status === 'active' ? 'Pausar' : 'Ativar'}
                                  >
                                    {challenge.status === 'active' ? '⏸' : '▶'}
                                  </button>
                                  <button
                                    onClick={() => deleteChallenge(challenge.id, challenge.coverImage, challenge.brand?.logo)}
                                    className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                    title="Excluir"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <Pagination 
                      currentPage={currentPage} 
                      totalPages={totalPages} 
                      onPageChange={setCurrentPage} 
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Metric Card Component
  const MetricCard = ({ icon, title, value, change }) => {
    const isPositive = change.startsWith('+');
    return (
      <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-500">{title}</div>
          <div className="p-2 rounded-full bg-blue-50 text-blue-600">{icon}</div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-semibold text-gray-800">{typeof value === 'number' ? value.toLocaleString() : value}</div>
          <div className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'} flex items-center`}>
            {change}
            {isPositive ? (
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Pagination Component
  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return (
      <div className="flex justify-center items-center py-4 space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-lg bg-gray-200 text-gray-600 disabled:opacity-50 hover:bg-gray-300"
        >
          Anterior
        </button>
        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded-lg ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-lg bg-gray-200 text-gray-600 disabled:opacity-50 hover:bg-gray-300"
        >
          Próximo
        </button>
      </div>
    );
  };

  export default AdminDashboard;