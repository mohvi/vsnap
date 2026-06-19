import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaHome, 
  FaSearch, 
  FaPlusCircle, 
  FaGift, 
  FaUser,
  FaCompass, 
  FaShopify,
  FaUsers,
  FaFire,
  FaBell,
  FaCrown
} from 'react-icons/fa';
import { HiOutlineFire, HiFire } from 'react-icons/hi';
import { BsCameraReels, BsCameraReelsFill } from 'react-icons/bs';
import { MdExplore, MdExploreOff } from 'react-icons/md';
import { RiVideoLine, RiVideoFill } from 'react-icons/ri';

function BottomMenu() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    { 
      path: '/', 
      icon: <FaHome size={22} />, 
      activeIcon: <FaHome size={22} />,
      label: 'Início',
      color: 'from-[#ff286a] to-[#ff8c5a]'
    },
    { 
      path: '/explore', 
      icon: <MdExplore size={24} />, 
      activeIcon: <MdExplore size={24} />,
      label: 'Explorar',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      path: '/create', 
      icon: <FaPlusCircle size={28} />, 
      activeIcon: <FaPlusCircle size={28} />,
      label: '',
      color: 'from-[#ff286a] to-[#ff8c5a]',
      isCreate: true
    },
    { 
      path: '/rewards', 
      icon: <FaGift size={22} />, 
      activeIcon: <FaGift size={22} />,
      label: 'Recompensas',
      color: 'from-yellow-500 to-orange-500'
    },
    { 
      path: '/profile', 
      icon: <FaUser size={22} />, 
      activeIcon: <FaUser size={22} />,
      label: 'Perfil',
      color: 'from-purple-500 to-pink-500'
    },
  ];

  const createOptions = [
    { label: 'Participar', icon: <HiFire size={20} />, path: '/cc', color: 'from-[#ff286a] to-[#ff8c5a]' },
     ];

  return (
    <>

      {/* Create Menu Modal */}
      {showCreateMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
            onClick={() => setShowCreateMenu(false)}
          />
          
          <div className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-4">
            <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 shadow-2xl w-full max-w-sm animate-slideUp">
              {/* Header */}
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-center font-bold">
                  <span className="bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] bg-clip-text text-transparent">
                    Participar
                  </span>
                </h3>
              </div>

              {/* Options */}
              <div className="p-2">
                {createOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      navigate(option.path);
                      setShowCreateMenu(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-[#2a2a2a] transition-colors group"
                  >
                    <div className={`w-10 h-10 bg-gradient-to-r ${option.color} rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform`}>
                      {option.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{option.label}</p>
                      <p className="text-xs text-gray-500">Comece agora mesmo</p>
                    </div>
                    <div className="text-gray-500 group-hover:text-[#ff286a] transition-colors">
                      →
                    </div>
                  </button>
                ))}
              </div>

              {/* Close button */}
              <div className="p-4 border-t border-gray-800">
                <button
                  onClick={() => setShowCreateMenu(false)}
                  className="w-full py-2 text-center text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom Navigation - TikTok Style */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-40 pb-2">
        <div className="flex justify-around items-center max-w-md mx-auto px-2">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            
            if (item.isCreate) {
              return (
                <button
                  key={item.path}
                  onClick={() => setShowCreateMenu(true)}
                  className="relative -top-5 group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative w-14 h-14 bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] rounded-full flex items-center justify-center text-white shadow-lg transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-90">
                    {item.icon}
                  </div>
                  <span className="sr-only">Criar</span>
                </button>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center py-2 px-3 group"
              >
                <div className={`relative transition-all duration-300 ${
                  active ? 'scale-110' : 'group-hover:scale-105'
                }`}>
                  {/* Active indicator */}
                  {active && (
                    <div className={`absolute -inset-2 bg-gradient-to-r ${item.color} rounded-full blur-md opacity-30`}></div>
                  )}
                  
                  {/* Icon */}
                  <div className={`relative transition-colors duration-300 ${
                    active 
                      ? `text-transparent bg-clip-text bg-gradient-to-r ${item.color}` 
                      : 'text-gray-400 group-hover:text-gray-300'
                  }`}>
                    {React.cloneElement(item.icon, {
                      className: active ? 'text-white' : ''
                    })}
                  </div>

                  {/* Active dot */}
                  {active && (
                    <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-gradient-to-r ${item.color}`} />
                  )}
                </div>
                
                <span className={`text-[10px] mt-1 font-medium transition-colors duration-300 ${
                  active 
                    ? `text-transparent bg-clip-text bg-gradient-to-r ${item.color}` 
                    : 'text-gray-500 group-hover:text-gray-400'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        
        .animate-ping {
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </>
  );
}

export default BottomMenu;