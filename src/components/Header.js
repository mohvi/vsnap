import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../fb'; 
import { get, ref } from 'firebase/database';
import { 
  FaUserCircle, 
  FaMoneyBillWave, 
  FaBell, 
  FaSearch, 
  FaHome,
  FaTrophy,
  FaCog,
  FaPlusCircle
} from 'react-icons/fa';
import { FiMoreHorizontal } from 'react-icons/fi';
import { HiOutlineUserGroup, HiOutlineShoppingBag } from 'react-icons/hi';
import { MdOutlineExplore } from 'react-icons/md';
import logo from '../img/logo.png';

const Header = ({ user, userData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [balance, setBalance] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (userData?.balance) {
      setBalance(userData.balance);
    }
  }, [userData]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      
      try {
        const notificationsRef = ref(db, `notifications/${user.uid}`);
        const snapshot = await get(notificationsRef);
        if (snapshot.exists()) {
          const notifs = Object.values(snapshot.val());
          setNotifications(notifs.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, [user]);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <>
      <header className="sticky top-0 z-50 bg-black border-b border-gray-800 px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo e título */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-tr from-[#ff286a] to-[#ff8c5a] rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-3 transition-transform duration-300">
                <img 
                  src={logo} 
                  alt="Votasnap" 
                  className="object-contain"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold">
                <span className="bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] bg-clip-text text-transparent">
                  Votasnap
                </span>
              </h1>
              <p className="text-xs text-gray-500">Encontre seu imóvel</p>
            </div>
          </Link>

          {/* Right side icons */}
          <div className="flex items-center gap-3">
            {/* Balance - Visible on all devices */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] rounded-full border border-gray-800">
              <FaMoneyBillWave className="text-[#ff286a]" size={14} />
              <span className="text-white font-medium text-sm">
                {balance.toLocaleString()} MT
              </span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-white transition-colors"
              >
                <FaBell size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#ff286a] text-white text-xs flex items-center justify-center rounded-full animate-pulse">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
                {showNotifications && (
  <div className="absolute right-0 mt-2 w-80 max-w-[90vw] sm:max-w-sm bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
    <div className="p-4 border-b border-gray-800 flex justify-between items-center">
      <h3 className="text-white font-bold">Notificações</h3>
      <button 
        onClick={() => setShowNotifications(false)}
        className="text-gray-400 hover:text-white text-sm"
      >
        Fechar
      </button>
    </div>
    <div className="max-h-96 overflow-y-auto">
      {notifications.length > 0 ? (
        notifications.map((notif, index) => (
          <div key={index} className="p-4 border-b border-gray-800 hover:bg-[#2a2a2a] transition-colors break-words">
            <p className="text-sm text-white">{notif.message}</p>
            <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
          </div>
        ))
      ) : (
        <div className="p-8 text-center text-gray-500">
          <FaBell size={24} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sem notificações</p>
        </div>
      )}
    </div>
  </div>
)}
            </div>

            {/* Profile menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-[#1a1a1a] transition-colors"
              >
                {userData?.photoURL ? (
                  <img
                    src={userData.photoURL}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover border-2 border-transparent hover:border-[#ff286a] transition-all"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {userData?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <FiMoreHorizontal className="text-gray-400 hidden sm:block" size={18} />
              </button>

              {/* Profile dropdown */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  {/* User info */}
                  <div className="p-4 border-b border-gray-800">
                    <p className="text-white font-medium truncate">
                      {userData?.username || 'Usuário'}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {user?.email}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="py-2">
                    <Link
                      to="/profile"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-colors"
                    >
                      <FaUserCircle size={18} className="text-[#ff286a]" />
                      <span className="text-sm">Meu Perfil</span>
                    </Link>

                    <Link
                      to="/rewards"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-colors"
                    >
                      <FaTrophy size={18} className="text-[#ff8c5a]" />
                      <span className="text-sm">Recompensas</span>
                    </Link>

                    <Link
                      to="/invites"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-colors"
                    >
                      <HiOutlineUserGroup size={18} className="text-blue-400" />
                      <span className="text-sm">Convidar Amigos</span>
                    </Link>

                    <div className="border-t border-gray-800 my-2"></div>

                    <Link
                      to="/settings"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-colors"
                    >
                      <FaCog size={18} className="text-gray-400" />
                      <span className="text-sm">Configurações</span>
                    </Link>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        auth.signOut();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#2a2a2a] hover:text-red-300 transition-colors"
                    >
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="text-sm">Sair</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile create button - fixed at bottom */}
        <button
          onClick={() => navigate('/create')}
          className="md:hidden fixed bottom-20 right-4 z-50 w-14 h-14 bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 flex items-center justify-center"
        >
          <FaPlusCircle size={24} />
        </button>
      </header>

      {/* Overlay for dropdowns */}
      {(showMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </>
  );
};

export default Header;