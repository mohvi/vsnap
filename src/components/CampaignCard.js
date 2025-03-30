import { VerifiedRounded } from '@mui/icons-material';
import React from 'react';

const CampaignCard = ({ campaign }) => {
  return (
    <a href='campaign' className="block w-full border rounded-lg overflow-hidden shadow-lg transition-transform transform hover:scale-105 hover:shadow-xl">
      {/* Imagem de capa da campanha */}
      <div className="relative h-48">
        <img
          src={campaign.imageUrl}
          alt={campaign.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Informações da campanha */}
      <div className="p-4 bg-white">
        <h2 className="text-2xl font-bold mb-2 text-gray-800 truncate">{campaign.title}</h2>
        <p className="text-gray-600 mb-4 text-sm line-clamp-2">
          {campaign.description}
        </p>

        {/* Informações da empresa */}
        <div className="flex items-center mt-4">
          <img
            src={campaign.companyLogoUrl}
            alt={campaign.companyName}
            className="w-10 h-10 object-cover border-2 border-gray-200 rounded-full mr-3"
          />
          <span className="text-sm font-medium flex items-center text-gray-800">
            {campaign.companyName}
            <VerifiedRounded style={{ color: 'green', marginLeft: '4px' }} />
          </span>
        </div>
      </div>
    </a>
  );
};

export default CampaignCard;
