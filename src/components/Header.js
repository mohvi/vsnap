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
    const [error, setError] = useState('');

    const MIN_WITHDRAWAL = 100; // Minimum withdrawal amount in coins (100 MT)

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
                setBalance(userData.coins || 0); // Changed from coinBalance to coins to match your InviteFriendCard
            }
        } catch (error) {
            console.error("Erro ao buscar saldo do usuário:", error);
        }
    };

    const handleWithdraw = async () => {
        setError(''); // Clear previous errors
        
        if (amount < MIN_WITHDRAWAL) {
            setError(`O valor mínimo para levantamento é de ${MIN_WITHDRAWAL} MT.`);
            return;
        }
        
        if (amount > balance) {
            setError("Saldo insuficiente");
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
            await update(ref(db, `users/${user.uid}`), { coins: updatedBalance }); // Changed to coins
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
            setError("Ocorreu um erro ao requisitar o levantamento. Tente novamente.");
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
                            onClick={() => {
                                if (!user) {
                                    return; // Or navigate to auth if you prefer
                                }
                                if (balance >= MIN_WITHDRAWAL) {
                                    setShowModal(true);
                                } else {
                                    alert(`Você precisa de pelo menos ${MIN_WITHDRAWAL} moedas (${MIN_WITHDRAWAL} MT) para fazer um levantamento.`);
                                }
                            }}
                            className={`flex items-center space-x-1 px-3 py-2 rounded-full transition ${
                                balance >= MIN_WITHDRAWAL 
                                    ? "bg-indigo-100 hover:bg-indigo-200" 
                                    : "bg-gray-100 cursor-not-allowed"
                            }`}
                            disabled={balance < MIN_WITHDRAWAL}
                        >
                            <FaMoneyBillWave className="text-indigo-600" />
                            <span className="font-medium text-indigo-700">{balance} MT</span>
                        </button>
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
                                        placeholder={`${MIN_WITHDRAWAL}`}
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min={MIN_WITHDRAWAL}
                                        max={balance}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Valor mínimo: {MIN_WITHDRAWAL} MT | Saldo disponível: {balance} MT
                                    </p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Operadora</label>
                                    <select 
                                        value={operator}
                                        onChange={(e) => setOperator(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="Mpesa">Mpesa</option>
                                        <option value="Emola">Emola</option>
                                    </select>
                                </div>

                                {error && (
                                    <div className="text-red-500 text-sm py-2 px-3 bg-red-50 rounded-lg">
                                        {error}
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-6 flex space-x-3">
                                <button 
                                    onClick={() => {
                                        setShowModal(false);
                                        setError('');
                                    }}
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