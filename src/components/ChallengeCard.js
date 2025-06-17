import { Share2, Heart, MessageSquare } from 'lucide-react';

export default function ChallengeCard({ challenge }) {
  return (
    <div className="border rounded-2xl overflow-hidden hover:shadow-lg transition duration-300">
      <div className="relative h-48 bg-gray-200">
        <img 
          src={challenge.coverImage} 
          alt={challenge.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 flex items-center">
          <img 
            src={challenge.brand.logo} 
            alt={challenge.brand.name} 
            className="w-10 h-10 rounded-full border-2 border-white bg-white"
          />
          <span className="ml-2 font-medium text-white bg-black/50 px-2 py-1 rounded-full text-sm">
            {challenge.brand.name}
            {challenge.brand.verified && (
              <svg className="w-4 h-4 inline ml-1 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82 1.89 3.2L12 21.04l3.4 1.47 1.89-3.2 3.61-.82-.34-3.7L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/>
              </svg>
            )}
          </span>
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="text-xl font-bold mb-2">{challenge.title}</h3>
        <p className="text-gray-600 mb-4">{challenge.description}</p>
        
        <div className="flex justify-between items-center mb-4">
          <div className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
            🏆 {challenge.prize}
          </div>
          <div className="text-gray-500 text-sm">
            ⏳ {challenge.deadline}
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-4 text-sm">
          <div className="text-gray-500">
            👥 {challenge.participants} participantes
          </div>
          <div className="flex space-x-3">
            <span className="flex items-center text-gray-500">
              <Heart className="w-4 h-4 mr-1" /> {challenge.interaction.split(' ')[0]}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex-1 hover:bg-blue-700 transition flex items-center justify-center">
            Participar Agora
          </button>
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition flex items-center justify-center">
            <Share2 className="w-5 h-5 mr-2" /> Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}