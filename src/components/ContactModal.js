import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader, X } from 'react-feather';
import { db } from '../fb';
import { ref, update } from 'firebase/database';

const ContactModal = ({ user, onComplete }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const phoneRegex = /^[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      setError('Por favor, insira um número de telefone válido (apenas números, 9 dígitos)');
      return;
    }

    try {
      setLoading(true);
      
      const userRef = ref(db, `users/${user.uid}`);
         await update(userRef, {
        contacto: phone,
        notificationsEnabled: true
      });    
      
      setSuccess('Número cadastrado com sucesso! Você receberá notificações de desafios.');
      window.location.reload();
      setPhone('');
      
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      console.error('Error saving phone number:', err);
      setError(err.message || 'Ocorreu um erro ao salvar seu número. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto relative">
        <div className="p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-purple-600 mb-1">
              Receba notificações de desafios
            </h2>
            <p className="text-gray-600">
              Cadastre seu número de telefone para receber alertas quando novos desafios forem lançados
            </p>
          </div>

          {success && (
            <div className="p-3 bg-green-50 text-green-600 rounded-lg flex items-start mb-4">
              <CheckCircle className="flex-shrink-0 mr-2 mt-0.5" size={16} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Número de telefone*</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="ex: 84XXXXXXXX"
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-sm text-gray-500">Apenas números, sem espaços ou caracteres especiais</p>
            </div>
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-start">
                <XCircle className="flex-shrink-0 mr-2 mt-0.5" size={16} />
                <span>{error}</span>
              </div>
            )}
            <div className="flex flex-col space-y-3">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 text-white font-bold rounded-lg transition-colors flex items-center justify-center ${
                  loading
                    ? 'bg-purple-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg'
                }`}
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin mr-2" size={18} />
                    Salvando...
                  </>
                ) : (
                  'Cadastrar Telefone'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;