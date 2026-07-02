import React from 'react';
import { Sparkles, ArrowLeft, Trash2, Smartphone, Mail, ShieldCheck } from 'lucide-react';

const CONTACT_EMAIL = 'geral@votasnap.com';
const MAILTO_LINK = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  'Pedido de eliminação de conta — VotaSnap'
)}&body=${encodeURIComponent(
  'Olá,\n\nGostaria de pedir a eliminação da minha conta VotaSnap.\n\nNúmero de telefone registado na conta: \n\nObrigado.'
)}`;

export default function AccountDeletion() {
  return (
    <div className="min-h-screen bg-[#0A0A12] text-white font-sans antialiased">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 md:px-8 pb-24">

        <div className="flex items-center justify-between pt-8 pb-10">
          <a
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </a>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-tight">
              Vota<span className="text-purple-400">Snap</span>
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400">
            Eliminação de conta
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
          Eliminar a tua conta VotaSnap
        </h1>
        <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-10 max-w-xl">
          Podes eliminar a tua conta e todos os dados associados a qualquer momento. Isto remove
          permanentemente o teu perfil, participações, votos e avatar, e não pode ser revertido.
        </p>

        <div className="space-y-4">

          {/* Opção 1 — dentro da app */}
          <div className="bg-[#14141F] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 bg-opacity-10">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-white text-lg font-semibold">Pela app (recomendado)</h2>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">
              Se ainda tens a app VotaSnap instalada, a forma mais rápida é eliminar a conta
              diretamente por lá — a eliminação é imediata.
            </p>
            <ol className="text-gray-400 text-sm space-y-1.5 list-none">
              <li className="flex gap-2"><span className="text-purple-400 font-semibold">1.</span> Abre a app VotaSnap e entra na tua conta</li>
              <li className="flex gap-2"><span className="text-purple-400 font-semibold">2.</span> Vai a <span className="text-white">Perfil</span></li>
              <li className="flex gap-2"><span className="text-purple-400 font-semibold">3.</span> Desce até <span className="text-white">Zona de risco</span> → <span className="text-white">Eliminar a minha conta</span></li>
              <li className="flex gap-2"><span className="text-purple-400 font-semibold">4.</span> Confirma escrevendo <span className="text-white">ELIMINAR</span></li>
            </ol>
          </div>

          {/* Opção 2 — sem acesso à app */}
          <div className="bg-[#14141F] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 bg-opacity-10">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-white text-lg font-semibold">Sem acesso à app</h2>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Se já não tens a app instalada ou não consegues entrar na tua conta, envia-nos um
              pedido por email com o número de telefone associado à conta. Processamos a eliminação
              manualmente em até <strong className="text-white">7 dias úteis</strong>.
            </p>
            <a
              href={MAILTO_LINK}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium text-sm shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 transition-all duration-300 hover:scale-[1.02]"
            >
              <Mail className="w-4 h-4" />
              Pedir eliminação por email
            </a>
          </div>

          {/* O que é apagado */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <h3 className="text-white text-sm font-semibold">O que é eliminado</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                'Perfil (nome, username, bio, avatar)',
                'Fotos e vídeos submetidos aos desafios',
                'Votos dados e recebidos',
                'Conta de acesso (número de telefone)',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-gray-400 text-xs">
                  <span className="w-1 h-1 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-[11px] mt-4 leading-relaxed">
              Alguns registos podem ser retidos por período adicional quando exigido por lei ou
              para prevenção de fraude, conforme descrito na nossa{' '}
              <a href="/privacidade" className="text-purple-400 hover:text-purple-300">Política de Privacidade</a>.
            </p>
          </div>

        </div>

        <p className="text-center text-gray-600 text-xs mt-10">
          VotaSnap · {CONTACT_EMAIL}
        </p>
      </div>
    </div>
  );
}