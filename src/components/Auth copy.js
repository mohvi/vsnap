import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get, set, update } from "firebase/database";
import { auth, db } from "../fb"; 
import { signInWithCustomToken } from "firebase/auth";
import logo from "../img/logo.png"; 
import { toast } from "sonner";

const API_URL = process.env.NODE_ENV === 'development'
  ? 'http://127.0.0.1:5001/votasnap/us-central1'
  : 'https://us-central1-votasnap.cloudfunctions.net';

export default function Auth() {
  const navigate = useNavigate();
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const formatPhoneNumber = (input) => {
    const numbers = input.replace(/\D/g, "");
    return numbers.startsWith("258") ? numbers : "258" + numbers;
  };

  const isValidMozambiquePhone = (phoneNumber) => {
    const clean = phoneNumber.replace(/\D/g, "");
    return clean.length === 12 && clean.startsWith("258");
  };

  const formatPhoneDisplay = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0,2)} ${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0,2)} ${numbers.slice(2,5)} ${numbers.slice(5)}`;
    return `${numbers.slice(0,2)} ${numbers.slice(2,5)} ${numbers.slice(5,8)} ${numbers.slice(8)}`;
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (loading || resendTimer > 0) return;

    const formattedPhone = formatPhoneNumber(phone);
    if (!isValidMozambiquePhone(formattedPhone)) {
      toast.error("Número inválido! Use: 84 123 4567");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/sendVerificationCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao enviar SMS');
      }

      setStep("code");
      setResendTimer(60);
      
      if (process.env.NODE_ENV === 'development' && data.debug) {
        toast.info(`Código: ${data.debug.code}`);
      } else {
        toast.success("Código enviado!");
      }
    } catch (error) {
      toast.error(error.message || "Erro ao enviar código");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (code.length !== 6 || loading) return;

    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      
      const response = await fetch(`${API_URL}/verifyCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, code })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.attemptsLeft) {
          throw new Error(`${data.attemptsLeft} tentativas restantes`);
        }
        throw new Error(data.error || 'Código inválido');
      }

      await signInWithCustomToken(auth, data.token);
      
      const userRef = ref(db, `users/${data.userId}`);
      
      if (data.isNewUser) {
        await set(userRef, { 
          uid: data.userId, 
          phone: data.phone, 
          createdAt: Date.now(), 
          lastLogin: Date.now(),
          profileComplete: false 
        });
        navigate("/setup-profile");
      } else {
        await update(userRef, { lastLogin: Date.now() });
        const snap = await get(userRef);
        const profileComplete = snap.val()?.profileComplete || false;
        navigate(profileComplete ? "/" : "/setup-profile");
      }
    } catch (error) {
      toast.error(error.message);
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      
      const response = await fetch(`${API_URL}/resendCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone })
      });

      const data = await response.json();

      if (!data.success) {
        if (data.waitTime) {
          setResendTimer(data.waitTime);
          throw new Error(`Aguarde ${data.waitTime}s`);
        }
        throw new Error(data.error || 'Erro ao reenviar');
      }

      setResendTimer(60);
      toast.success("Código reenviado!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const displayPhone = phone ? formatPhoneDisplay(phone) : "";

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 bg-gradient-to-tr from-[#ff286a] to-[#ff8c5a] rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <img 
                src={logo} 
                alt="Votansap" 
                className="w-100 h-100 object-contain"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              <span className="animate-pulse">•</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Votansap
          </h1>
          <small className="text-white mb-2 tracking-tight">Postar | Ganhar | Bazar</small>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
          <div className="px-6 py-5 bg-gradient-to-r from-[#ff286a] to-[#ff8c5a]">
            <h2 className="text-white font-bold text-lg">
              {step === "phone" ? "Entrar ou cadastrar" : "Confirmar código"}
            </h2>
            {step === "code" && (
              <p className="text-white/80 text-sm mt-1">
                Enviamos para +258 {displayPhone}
              </p>
            )}
          </div>

          <div className="p-6">
            {step === "phone" ? (
              <form onSubmit={handleSendCode} className="space-y-5">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">+258</span>
                  </div>
                  <input
                    type="tel"
                    value={displayPhone}
                    onChange={(e) => {
                      const numbers = e.target.value.replace(/\D/g, "");
                      setPhone(numbers);
                    }}
                    className="block w-full pl-16 pr-4 py-4 bg-[#2a2a2a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[#ff286a] focus:border-transparent outline-none transition text-lg"
                    placeholder="84 123 4567"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !phone}
                  className="w-full bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] text-white font-bold py-4 px-4 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-lg shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Enviando...</span>
                    </div>
                  ) : (
                    "Continuar"
                  )}
                </button>

                <p className="text-xs text-center text-gray-500 mt-4">
                  Ao continuar, você concorda com nossos 
                  <button className="text-[#ff286a] hover:underline mx-1">Termos</button>
                  e
                  <button className="text-[#ff286a] hover:underline mx-1">Política</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                  }}
                  className="flex items-center text-[#ff286a] hover:text-[#ff8c5a] transition-colors text-sm mb-4"
                  disabled={loading}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Alterar número</span>
                </button>

                <div>
                  <div className="flex justify-center gap-2 mb-4">
                    {[0,1,2,3,4,5].map((i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          code.length > i 
                            ? 'bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] scale-110' 
                            : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      const newCode = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setCode(newCode);
                    }}
                    className="block w-full px-3 py-5 text-center text-2xl tracking-[8px] font-mono bg-[#2a2a2a] border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-[#ff286a] focus:border-transparent outline-none transition"
                    placeholder="000000"
                    maxLength={6}
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="w-full bg-gradient-to-r from-[#ff286a] to-[#ff8c5a] text-white font-bold py-4 px-4 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-lg shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verificando...</span>
                    </div>
                  ) : (
                    "Entrar"
                  )}
                </button>

                {resendTimer > 0 ? (
                  <p className="text-center text-sm text-gray-500">
                    ⏱️ Reenviar em {resendTimer}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="w-full text-center text-[#ff286a] hover:text-[#ff8c5a] text-sm font-medium transition-colors disabled:text-gray-600"
                  >
                    📨 Não recebi o código
                  </button>
                )}
              </form>
            )}
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-600">
            © 2026 Votasnap • Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}