import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaSearch, 
  FaPlusCircle, 
  FaGift, 
  FaUser,
  FaCompass, 
  FaShopify,
  FaUsers
} from 'react-icons/fa';
import { Star, Users } from 'lucide-react';
import { Explore, Shop } from '@mui/icons-material';

function BottomMenu() {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: <FaHome size={20} />, label: 'Início' },
    { path: '/profile', icon: <FaUser size={20} />, label: 'Perfil' },
  ];
  
  return (
    <>
      <a
        href="https://chat.whatsapp.com/CuEd2CalQj4GUypRrT16IJ"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-4 z-50 bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center animate-bounce"
        style={{
          width: '56px',
          height: '56px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)'
        }}
      >
        <FaUsers size={24} />
        <span className="sr-only">Povo no Poder</span>
      </a>

      <div className="h-16" />
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="flex justify-around items-center py-2 max-w-md mx-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center px-2 py-1 rounded-lg transition-all duration-200 ${
                location.pathname === item.path 
                  ? 'text-indigo-600 bg-indigo-50' 
                  : 'text-gray-500 hover:text-indigo-500'
              }`}
            >
              <div className={`p-2 rounded-full ${
                location.pathname === item.path ? 'bg-indigo-100' : ''
              }`}>
                {React.cloneElement(item.icon, {
                  className: location.pathname === item.path 
                    ? 'text-indigo-600' 
                    : 'text-gray-500'
                })}
              </div>
            </Link>
          ))}
        </div>
      </nav>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce {
          animation: bounce 2s infinite;
        }
      `}</style>
    </>
  );
}

export default BottomMenu;