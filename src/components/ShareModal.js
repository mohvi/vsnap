import React from 'react';
import { X, MessageSquare, TrendingUp, Sparkles, Link as LinkIcon } from 'lucide-react';

const ShareModal = ({ challenge, onClose }) => {
  if (!challenge) return null;

  const shareUrl = `https://votasnap.online/challenges/${challenge.id}`;
  const shareText = `${challenge.title} - ${challenge.description}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: <MessageSquare className="w-6 h-6 text-green-500" />,
      url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`
    },
    {
      name: 'Facebook',
      icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    },
    {
      name: 'Twitter',
      icon: <Sparkles className="w-6 h-6 text-blue-400" />,
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
    },
    {
      name: 'Copiar Link',
      icon: <LinkIcon className="w-6 h-6 text-gray-500" />,
      action: () => {
        navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        alert('Link copiado para a área de transferência!');
        onClose();
      }
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Compartilhar desafio</h3>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {shareOptions.map((option) => (
              <button
                key={option.name}
                onClick={() => option.url 
                  ? window.open(option.url, '_blank') 
                  : option.action?.()}
                className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="mb-2">
                  {option.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">{option.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;