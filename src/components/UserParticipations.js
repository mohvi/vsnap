import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  Pending, 
  Cancel, 
  Star, 
  Edit, 
  Delete,
  CalendarToday,
  LocationOn,
  EmojiEvents
} from "@mui/icons-material";
import { db } from '../fb';
import { ref, onValue } from 'firebase/database';

const UserParticipations = ({ userId }) => {
    const [participations, setParticipations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchParticipations = async () => {
            try {
                // Referência para as participações do usuário
                const userParticipationsRef = ref(db, `users/${userId}/participations`);
                
                onValue(userParticipationsRef, (snapshot) => {
                    const participationsData = snapshot.val();
                    if (participationsData) {
                        // Transforma o objeto em array e adiciona o ID
                        const participationsArray = Object.entries(participationsData).map(([key, value]) => ({
                            id: key,
                            ...value
                        }));
                        
                        // Agora buscamos os detalhes completos de cada desafio
                        const fetchChallengeDetails = async () => {
                            const participationsWithDetails = await Promise.all(
                                participationsArray.map(async (participation) => {
                                    const challengeRef = ref(db, `challenges/${participation.id}`);
                                    return new Promise((resolve) => {
                                        onValue(challengeRef, (challengeSnapshot) => {
                                            const challengeData = challengeSnapshot.val();
                                            resolve({
                                                ...participation,
                                                challengeDetails: challengeData || null
                                            });
                                        }, { onlyOnce: true });
                                    });
                                })
                            );
                            setParticipations(participationsWithDetails);
                            setLoading(false);
                        };
                        
                        fetchChallengeDetails();
                    } else {
                        setParticipations([]);
                        setLoading(false);
                    }
                }, (error) => {
                    setError(error.message);
                    setLoading(false);
                });

            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchParticipations();
    }, [userId]);

    const renderStatusIcon = (status) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="text-green-500" />;
            case 'pending':
                return <Pending className="text-yellow-500" />;
            case 'rejected':
                return <Cancel className="text-red-500" />;
            case 'winner':
                return <Star className="text-purple-500" />;
            default:
                return <Pending className="text-gray-500" />;
        }
    };

    const formatDate = (dateString) => {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('pt-PT', options);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-red-500">
                Error loading participations: {error}
            </div>
        );
    }

    if (participations.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-4">Você ainda não participou em nenhum desafio.</div>
                <button 
                    onClick={() => navigate('/challenges')}
                    className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition"
                >
                    Explorar Desafios
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {participations.map((participation) => (
                <div key={participation.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                    <div className="p-5">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                                    {participation.challengeTitle}
                                    {participation.challengeDetails?.brand && (
                                        <span className="ml-2 text-sm font-normal text-gray-600">
                                            por {participation.challengeDetails.brand.name}
                                        </span>
                                    )}
                                </h2>
                                
                                {participation.challengeDetails && (
                                    <div className="flex items-center mt-1 text-sm text-gray-500">
                                        <LocationOn fontSize="small" className="mr-1" />
                                        <span>
                                            {participation.challengeDetails.location || 'Online'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <div className="flex items-center">
                                    {renderStatusIcon(participation.status || 'pending')}
                                    <span className="ml-1 text-sm capitalize">
                                        {participation.status || 'pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-4 flex items-center text-sm text-gray-500">
                            <CalendarToday fontSize="small" className="mr-1" />
                            <span>Participou em: {formatDate(participation.createdAt)}</span>
                        </div>
                        
                        {participation.challengeDetails && (
                            <>
                                <div className="mt-4">
                                    <h3 className="text-md font-semibold text-gray-700">Descrição do Desafio:</h3>
                                    <p className="text-gray-600 mt-1">
                                        {participation.challengeDetails.description}
                                    </p>
                                </div>
                                
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <div className="text-sm text-gray-500">Prémio</div>
                                        <div className="font-medium flex items-center">
                                            <EmojiEvents className="mr-1 text-yellow-500" />
                                            {participation.challengeDetails.reward || 'A definir'}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <div className="text-sm text-gray-500">Data Limite</div>
                                        <div className="font-medium">
                                            {formatDate(participation.challengeDetails.deadline)}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                        
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end space-x-3">
                            {(!participation.status || participation.status === 'pending') && (
                                <>
                                    <button className="text-blue-500 hover:text-blue-700 flex items-center">
                                        <Edit className="mr-1" /> Editar
                                    </button>
                                    <button className="text-red-500 hover:text-red-700 flex items-center">
                                        <Delete className="mr-1" /> Remover
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default UserParticipations;