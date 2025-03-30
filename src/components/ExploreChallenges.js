import { useState } from "react";
import { Link } from "react-router-dom";

const ExploreChallenges = ({ challenges }) => {
  const [activeTab, setActiveTab] = useState("active");
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  const getFilteredChallenges = () => {
    return challenges.filter((challenge) =>
      activeTab === "active" ? challenge.status === "ativo" : challenge.status === "fechado"
    );
  };

  const handleChallengeClick = (challenge) => {
    setSelectedChallenge(challenge);
  };


  return (
    <div className="explore-challenges-container p-4">
      {/* Tabs */}
      <div className="tabs flex justify-around mb-4">
        <button
          className={`tab-button px-4 py-2 rounded-md ${
            activeTab === "active" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
          }`}
          onClick={() => setActiveTab("active")}
        >
          Ativos
        </button>
        <button
          className={`tab-button px-4 py-2 rounded-md ${
            activeTab === "completed" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
          }`}
          onClick={() => setActiveTab("completed")}
        >
          Concluídos
        </button>
      </div>

      <div className="challenges-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {getFilteredChallenges().map((challenge) => (
          <div
            key={challenge.id}
            className="challenge-card bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <Link
        to={`/campaign/${challenge.id}`}>
            <img
              src={challenge.imageUrls[0]}
              alt={challenge.title}
              className="w-full h-32 object-cover rounded-t-lg mb-4"
            />
            <h3 className="text-lg font-semibold mb-2">{challenge.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{challenge.description}</p>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExploreChallenges;
