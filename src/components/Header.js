import '../styles/main.css';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { auth, db } from '../fb'; 
import { get, ref, set, push, update } from 'firebase/database';
import { FaUserCircle, FaMoneyBillWave, FaBell, FaSearch, FaHome, FaTrophy } from 'react-icons/fa';
import { FiMoreHorizontal } from 'react-icons/fi';
import logo from '../img/logo.png'

const Header = () => {
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [operator, setOperator] = useState('Mpesa');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                fetchUserBalance(currentUser.uid);
            } else {
                setBalance(0);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchUserBalance = async (uid) => {
        const dbRef = ref(db, `users/${uid}`);
        try {
            const snapshot = await get(dbRef);
            if (snapshot.exists()) {
                const userData = snapshot.val();
                setBalance(userData.coinBalance || 0);
            }
        } catch (error) {
            console.error("Erro ao buscar saldo do usuário:", error);
        }
    };

    const handleWithdraw = async () => {
        if (amount < 50) {
            alert("O valor mínimo para levantamento é de 50 MT.");
            return;
        }
        
        if (amount > balance) {
            alert("Saldo insuficiente");
            return;
        }

        try {
            setIsLoading(true);

            const withdrawalRequestRef = push(ref(db, `withdrawals/${user.uid}`));
            const withdrawalId = withdrawalRequestRef.key;
            const withdrawalData = {
                carteira: '1729122891627x236331387665514500',
                operadora: operator,
                valor: amount,
                celular: phoneNumber,
                status: 'pendente',
                createdAt: new Date().toISOString()
            };
            await set(withdrawalRequestRef, withdrawalData);

            const updatedBalance = balance - amount;
            await update(ref(db, `users/${user.uid}`), { balance: updatedBalance });
            setBalance(updatedBalance);

            const response = await axios.post('https://mozpayment.online/api/1.1/wf/saque', {
                carteira: withdrawalData.carteira,
                operadora: withdrawalData.operadora,
                valor: amount,
                celular: phoneNumber
            });

            await update(ref(db, `withdrawals/${user.uid}/${withdrawalId}`), { status: 'processado' });

            alert("Requisição de levantamento enviada com sucesso!");
            setShowModal(false);
            setAmount('');
            setPhoneNumber('');
        } catch (error) {
            console.error("Erro ao requisitar o levantamento:", error);
            alert("Ocorreu um erro ao requisitar o levantamento. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <>
            <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center">
                        <h1 className="text-xl font-bold text-indigo-600">Votasnap</h1>
                    </Link>


                    {/* User Actions */}
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => setShowModal(true)}
                            className="flex items-center space-x-1 bg-indigo-100 hover:bg-indigo-200 px-3 py-2 rounded-full transition"
                        >
                            <FaMoneyBillWave className="text-indigo-600" />
                            <span className="font-medium text-indigo-700">{balance} MT</span>
                        </button>

                        {user ? (
                            <div className="flex items-center space-x-4">
                                <button className="text-gray-500 hover:text-indigo-600">
                                    <FaBell className="w-5 h-5" />
                                </button>
                                <Link to="/perfil" className="flex items-center">
                                    {user.photoURL ? (
                                        <img 
                                            src={user.photoURL} 
                                            alt="Avatar" 
                                            className="w-8 h-8 rounded-full border-2 border-indigo-100"
                                        />
                                    ) : (
                                        <FaUserCircle className="w-8 h-8 text-gray-400" />
                                    )}
                                </Link>
                            </div>
                        ) : (
                            <Link 
                                to="/auth" 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-medium transition"
                            >
                                Entrar
                            </Link>
                        )}
                    </div>
                </div>
            </header>


            {/* Withdrawal Modal */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Solicitar Levantamento</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de celular</label>
                                    <input 
                                        type="text"
                                        placeholder="84 123 4567"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor (MT)</label>
                                    <input 
                                        type="number"
                                        placeholder="50"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Valor mínimo: 50 MT</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Operadora</label>
                                    <select 
                                        value={operator}
                                        onChange={(e) => setOperator(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="Mpesa">Mpesa</option>
                                        <option value="Emola">Emola</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="mt-6 flex space-x-3">
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleWithdraw}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium transition disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processando...
                                        </span>
                                    ) : "Confirmar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;