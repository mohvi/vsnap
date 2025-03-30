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

function BottomMenu() {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: <FaHome size={20} />, label: 'Início' },
    { path: '/explore', icon: <FaCompass size={20} />, label: 'Explorar' },
    { path: '/create', icon: <FaPlusCircle size={20} />, label: 'Criar' },
    { path: '/rewards', icon: <FaGift size={20} />, label: 'Prêmios' },
    { path: '/profile', icon: <FaUser size={20} />, label: 'Perfil' },
  ];

  return (
    <>
      {/* Spacer div that matches the height of the bottom menu */}
      <div className="h-16" /> {/* This prevents content from being hidden behind the menu */}
      
      {/* Actual bottom menu */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
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