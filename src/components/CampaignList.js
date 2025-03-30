import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom"; 
import { getDatabase, ref, onValue } from "firebase/database";

const CampaignList = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDatabase();
    const campaignsRef = ref(db, 'campaigns');

    onValue(campaignsRef, (snapshot) => {
      const data = snapshot.val();
      const campaignsArray = data ? Object.entries(data).map(([id, value]) => ({ id, ...value })) : [];
      setCampaigns(campaignsArray);
      setLoading(false); 
    });
  }, []);

  if (loading) {
    return <div className="text-center py-10">Carregando campanhas...</div>;
  }

  if (campaigns.length === 0) {
    return <div className="text-center py-10">Nenhuma campanha disponível.</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Desafios Disponíveis</h2>
      <div className="space-y-4">
        {campaigns.map((challenge) => (
          <div key={challenge.id} className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">{challenge.title}</h3>
            <p className="text-gray-600">Meta: {challenge.likesNeeded} likes em {challenge.duration} horas</p>
            <p className="text-gray-800">Recompensa: {challenge.recompensa} pontos</p>
            <Link to={`/campaign/${challenge.id}`}>
              <button
                className="mt-2 bg-blue-500 text-white py-1 px-4 rounded hover:bg-blue-600 transition"
              >
                Participar
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CampaignList;
