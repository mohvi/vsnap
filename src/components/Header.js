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


    return (
        <>
            <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center">
                        <h1 className="text-xl font-bold text-indigo-600">Votasnap</h1>
                    </Link>
                </div>
            </header>

        </>
    );
};

export default Header;