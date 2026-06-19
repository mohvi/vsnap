import React, { useState } from 'react';
import { ref, push, set } from "firebase/database";
import { PlusCircle, Image as ImageIcon, Trophy, Clock, Tag, Gift, DollarSign, Award } from 'lucide-react';
import { db } from '../fb';

const CATEGORIES = [
  { value: 'fotografia', label: '📸 Fotografia' },
  { value: 'musica', label: '🎵 Música' },
  { value: 'danca', label: '💃 Dança' },
  { value: 'culinaria', label: '🍲 Culinária' },
  { value: 'moda', label: '👗 Moda' },
  { value: 'desporto', label: '⚽ Desporto' },
  { value: 'arte', label: '🎨 Arte' },
  { value: 'humor', label: '😂 Humor' },
];

const CreateChallengeForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'fotografia',
    type: 'free', // free | paid | sponsored
    prize: '',
    prizeType: 'cash', // cash | physical | badge
    sponsor: '',
    bannerUrl: '',
    durationDays: 7,
    entryFee: 0,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const challengesRef = ref(db, 'challenges');
      const newChallengeRef = push(challengesRef);

      const startTime = Date.now();
      const endTime = startTime + (Number(formData.durationDays) * 24 * 60 * 60 * 1000);

      await set(newChallengeRef, {
        id: newChallengeRef.key,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        type: formData.type,
        prize: formData.prizeType === 'cash'
          ? `${formData.prize} MZN`
          : formData.prize,
        prizeType: formData.prizeType,
        sponsor: formData.type === 'sponsored' ? formData.sponsor : '',
        coverImage: formData.bannerUrl,
        entryFee: Number(formData.entryFee),
        status: 'active',
        createdBy: 'admin',
        createdAt: startTime,
        endsAt: endTime,
        totalVotes: 0,
        totalParticipants: 0,
      });

      setSuccess(true);
      setFormData({
        title: '',
        description: '',
        category: 'fotografia',
        type: 'free',
        prize: '',
        prizeType: 'cash',
        sponsor: '',
        bannerUrl: '',
        durationDays: 7,
        entryFee: 0,
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      alert('Erro ao criar desafio: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-slate-900 rounded-3xl border border-white/10 shadow-2xl">
      <div className="flex items-center gap-3 mb-8">
        <PlusCircle className="w-8 h-8 text-purple-500" />
        <h2 className="text-2xl font-bold text-white">Novo Desafio</h2>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm font-medium">
          ✅ Desafio criado com sucesso!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Tipo de desafio */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Tipo de desafio</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'free', label: '🆓 Gratuito', color: 'border-teal-500' },
              { value: 'paid', label: '💳 Pago', color: 'border-purple-500' },
              { value: 'sponsored', label: '🏢 Patrocinado', color: 'border-pink-500' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange('type', opt.value)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  formData.type === opt.value
                    ? `${opt.color} bg-white/5 text-white`
                    : 'border-white/10 text-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Patrocinador — só se sponsored */}
        {formData.type === 'sponsored' && (
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Nome do patrocinador
            </label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
              placeholder="Ex: Bar Praia do Wimbi"
              value={formData.sponsor}
              onChange={(e) => handleChange('sponsor', e.target.value)}
              required
            />
          </div>
        )}

        {/* Título e Categoria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Título do Desafio</label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
              placeholder="Ex: Melhor foto na Praia do Wimbi"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Categoria</label>
            <select
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Banner */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">URL do Banner (opcional)</label>
          <div className="flex items-center gap-2 bg-slate-800 border border-white/5 rounded-xl px-3">
            <ImageIcon className="w-5 h-5 text-gray-500" />
            <input
              type="text"
              className="w-full bg-transparent p-3 text-white outline-none"
              placeholder="https://imagem.jpg"
              value={formData.bannerUrl}
              onChange={(e) => handleChange('bannerUrl', e.target.value)}
            />
          </div>
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Descrição do Desafio</label>
          <textarea
            className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none min-h-[100px]"
            placeholder="Explique as regras e objetivos do desafio..."
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            required
          />
        </div>

        {/* Tipo de prémio */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Tipo de prémio</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'cash', label: '💰 Dinheiro', icon: DollarSign },
              { value: 'physical', label: '🎁 Físico', icon: Gift },
              { value: 'badge', label: '🏅 Badge', icon: Award },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange('prizeType', opt.value)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  formData.prizeType === opt.value
                    ? 'border-purple-500 bg-white/5 text-white'
                    : 'border-white/10 text-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prémio — varia conforme tipo */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            {formData.prizeType === 'cash' ? 'Valor do prémio (MZN)' : 'Descrição do prémio'}
          </label>
          <input
            type={formData.prizeType === 'cash' ? 'number' : 'text'}
            className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
            placeholder={
              formData.prizeType === 'cash' ? '500' :
              formData.prizeType === 'physical' ? 'Ex: 2 Cervejas no Bar Wimbi' :
              'Ex: Badge Chef MZ'
            }
            value={formData.prize}
            onChange={(e) => handleChange('prize', e.target.value)}
            required
            min={formData.prizeType === 'cash' ? '0' : undefined}
          />
        </div>

        {/* Duração e Taxa de entrada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Duração (Dias)
            </label>
            <input
              type="number"
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
              placeholder="7"
              value={formData.durationDays}
              onChange={(e) => handleChange('durationDays', e.target.value)}
              required
              min="1"
              max="30"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Taxa de Entrada (MZN)</label>
            <input
              type="number"
              className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
              placeholder="0 (grátis)"
              value={formData.entryFee}
              onChange={(e) => handleChange('entryFee', e.target.value)}
              min="0"
            />
          </div>
        </div>

        {/* Resumo */}
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Resumo</p>
          <p className="text-sm text-gray-300">
            <span className="text-white font-medium">{formData.title || 'Sem título'}</span>
            {' '}— {formData.type === 'sponsored' ? `patrocinado por ${formData.sponsor || '...'}` : formData.type === 'paid' ? 'criado por utilizador' : 'gratuito da plataforma'}
          </p>
          <p className="text-sm text-gray-300">
            Prémio: <span className="text-yellow-400 font-medium">
              {formData.prizeType === 'cash' && formData.prize ? `${formData.prize} MZN` : formData.prize || '...'}
            </span>
            {' '}· Duração: <span className="text-white">{formData.durationDays} dias</span>
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
        >
          {loading ? 'A publicar...' : 'Publicar Desafio no VotaSnap'}
        </button>
      </form>
    </div>
  );
};

export default CreateChallengeForm;