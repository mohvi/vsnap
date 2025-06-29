import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaSearch, 
  FaPlusCircle, 
  FaGift, 
  FaUser,
  FaCompass 
} from 'react-icons/fa';
import { Star, Users } from 'lucide-react';
import { Explore, Shop } from '@mui/icons-material';

function BottomMenu() {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: <FaHome size={20} />, label: 'Início' },
    { path: '/explore', icon: <Star size={20} />, label: 'Desafios' },
    { path: '/profile', icon: <FaUser size={20} />, label: 'Perfil' },
  ];
  return (
    <>
      {/* Spacer div com altura fixa para compensar o menu fixo */}
      <div className="h-16" />
      
      {/* Menu fixo na parte inferior */}
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
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export default BottomMenu;