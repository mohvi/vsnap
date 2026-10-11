import React, { useEffect, useRef, useState } from 'react';
import { ref as dbRef, onValue, push, set, update, remove } from 'firebase/database';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../fb';
import {
  Building2, Plus, Upload, X, Edit2, Trash2, ExternalLink,
  Instagram, Phone, MapPin, Search, CheckCircle2, Loader2,
} from 'lucide-react';

// Schema do nó sponsors/{sponsorId} no Firebase:
// {
//   name: string,           — nome público do patrocinador
//   logoUrl: string | null, — URL da imagem no Firebase Storage
//   category: string,       — 'bar' | 'restaurante' | 'loja' | 'marca' | 'outro'
//   city: string,
//   phone: string | null,
//   instagram: string | null, — só o handle, sem @
//   website: string | null,
//   notes: string | null,     — notas internas do admin
//   createdAt: number,
//   updatedAt: number,
// }

const CATEGORIES = [
  { value: 'bar', label: '🍺 Bar' },
  { value: 'restaurante', label: '🍽️ Restaurante' },
  { value: 'loja', label: '🛍️ Loja' },
  { value: 'marca', label: '🏷️ Marca' },
  { value: 'outro', label: '🏢 Outro' },
];

const emptyForm = {
  name: '',
  category: 'bar',
  city: '',
  phone: '',
  instagram: '',
  website: '',
  notes: '',
};

export default function SponsorsPanel() {
  const [sponsors, setSponsors] = useState([]);
  const [challenges, setChallenges] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null); // null = criar novo
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubSponsors = onValue(dbRef(db, 'sponsors'), snap => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, s]) => ({ id, ...s }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setSponsors(list);
      setLoading(false);
    });
    const unsubChallenges = onValue(dbRef(db, 'challenges'), snap => {
      setChallenges(snap.val() || {});
    });
    return () => { unsubSponsors(); unsubChallenges(); };
  }, []);

  // Quantos desafios cada patrocinador teve
  const challengeCountBySponsor = (sponsorId) =>
    Object.values(challenges).filter(c => c.sponsorId === sponsorId).length;

  const totalVotesBySponsor = (sponsorId) =>
    Object.values(challenges)
      .filter(c => c.sponsorId === sponsorId)
      .reduce((sum, c) => sum + (c.totalVotes || 0), 0);

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 3 * 1024 * 1024) { alert('Logo máx. 3MB'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const openCreate = () => {
    setEditingSponsor(null);
    setForm(emptyForm);
    setLogoFile(null);
    setLogoPreview(null);
    setShowForm(true);
  };

  const openEdit = (sponsor) => {
    setEditingSponsor(sponsor);
    setForm({
      name: sponsor.name || '',
      category: sponsor.category || 'bar',
      city: sponsor.city || '',
      phone: sponsor.phone || '',
      instagram: sponsor.instagram || '',
      website: sponsor.website || '',
      notes: sponsor.notes || '',
    });
    setLogoPreview(sponsor.logoUrl || null);
    setLogoFile(null);
    setShowForm(true);
  };

  const uploadLogo = (sponsorId) => new Promise((resolve, reject) => {
    if (!logoFile) { resolve(editingSponsor?.logoUrl || null); return; }
    const path = `sponsors/${sponsorId}/logo_${Date.now()}.${logoFile.name.split('.').pop()}`;
    const task = uploadBytesResumable(storageRef(storage, path), logoFile, { contentType: logoFile.type });
    task.on('state_changed',
      snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref))
    );
  });

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Nome do patrocinador é obrigatório.'); return; }
    setSaving(true);
    setUploadProgress(0);
    try {
      if (editingSponsor) {
        // Actualizar
        const logoUrl = await uploadLogo(editingSponsor.id);
        await update(dbRef(db, `sponsors/${editingSponsor.id}`), {
          ...form,
          name: form.name.trim(),
          instagram: form.instagram.replace('@', '').trim() || null,
          phone: form.phone.trim() || null,
          website: form.website.trim() || null,
          notes: form.notes.trim() || null,
          logoUrl,
          updatedAt: Date.now(),
        });
      } else {
        // Criar novo
        const newRef = push(dbRef(db, 'sponsors'));
        const logoUrl = await uploadLogo(newRef.key);
        await set(newRef, {
          ...form,
          id: newRef.key,
          name: form.name.trim(),
          instagram: form.instagram.replace('@', '').trim() || null,
          phone: form.phone.trim() || null,
          website: form.website.trim() || null,
          notes: form.notes.trim() || null,
          logoUrl,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      setShowForm(false);
    } catch (e) {
      alert('Erro ao guardar: ' + e.message);
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id) => {
    await remove(dbRef(db, `sponsors/${id}`));
    setConfirmDelete(null);
  };

  const filtered = sponsors.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-pink-400" />
            Patrocinadores
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {sponsors.length} parceiro{sponsors.length !== 1 ? 's' : ''} cadastrado{sponsors.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo patrocinador
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-slate-800 border border-white/5 rounded-xl px-3 mb-6">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          className="w-full bg-transparent p-3 text-white outline-none text-sm"
          placeholder="Buscar por nome ou cidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          {sponsors.length === 0
            ? 'Ainda não há patrocinadores cadastrados. Adiciona o primeiro!'
            : 'Nenhum patrocinador encontrado.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(sponsor => {
            const chCount = challengeCountBySponsor(sponsor.id);
            const totalVotes = totalVotesBySponsor(sponsor.id);
            const catLabel = CATEGORIES.find(c => c.value === sponsor.category)?.label || '🏢 Outro';

            return (
              <div key={sponsor.id} className="bg-[#14141F] border border-white/5 rounded-2xl p-5 hover:border-pink-500/20 transition-all">
                <div className="flex items-start gap-4 mb-4">
                  {/* Logo */}
                  {sponsor.logoUrl ? (
                    <img src={sponsor.logoUrl} alt={sponsor.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-white/10" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xl font-bold">{sponsor.name?.charAt(0).toUpperCase() || '?'}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-base truncate">{sponsor.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400">{catLabel}</span>
                      {sponsor.city && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{sponsor.city}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Acções */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(sponsor)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(sponsor)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                    <p className="text-white font-bold text-lg">{chCount}</p>
                    <p className="text-gray-500 text-xs">Desafio{chCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                    <p className="text-white font-bold text-lg">{totalVotes}</p>
                    <p className="text-gray-500 text-xs">Votos gerados</p>
                  </div>
                </div>

                {/* Links sociais */}
                <div className="flex gap-2 flex-wrap">
                  {sponsor.instagram && (
                    <a href={`https://instagram.com/${sponsor.instagram}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-pink-400 transition-colors">
                      <Instagram className="w-3 h-3" />@{sponsor.instagram}
                    </a>
                  )}
                  {sponsor.phone && (
                    <a href={`tel:${sponsor.phone}`}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors">
                      <Phone className="w-3 h-3" />{sponsor.phone}
                    </a>
                  )}
                  {sponsor.website && (
                    <a href={sponsor.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors">
                      <ExternalLink className="w-3 h-3" />Site
                    </a>
                  )}
                </div>

                {sponsor.notes && (
                  <p className="text-gray-600 text-xs mt-3 italic">{sponsor.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#14141F] border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">
                {editingSponsor ? 'Editar patrocinador' : 'Novo patrocinador'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Logo upload */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">Logo</label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                      <button onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-white/15 flex items-center justify-center cursor-pointer hover:border-pink-500 transition-colors">
                      <Upload className="w-5 h-5 text-gray-500" />
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
                    </label>
                  )}
                  <div className="text-xs text-gray-500">
                    <p>PNG, JPG ou WebP</p>
                    <p>Máx. 3MB · quadrado recomendado</p>
                    {saving && uploadProgress > 0 && (
                      <p className="text-pink-400 mt-1">{uploadProgress}% enviado...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">Nome <span className="text-pink-400">*</span></label>
                <input className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-pink-500"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Bar Praia do Wimbi" />
              </div>

              {/* Categoria + Cidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Categoria</label>
                  <select className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-pink-500"
                    value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Cidade</label>
                  <input className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-pink-500"
                    value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="Pemba" />
                </div>
              </div>

              {/* Contactos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 block mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</label>
                  <input className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-pink-500"
                    value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+258 84 000 0000" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1 flex items-center gap-1"><Instagram className="w-3 h-3" /> Instagram</label>
                  <input className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-pink-500"
                    value={form.instagram} onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))}
                    placeholder="@handle (sem @)" />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="text-sm text-gray-400 block mb-1 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Website</label>
                <input className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-pink-500"
                  value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                  placeholder="https://..." />
              </div>

              {/* Notas internas */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">Notas internas (não visíveis ao público)</label>
                <textarea className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-pink-500 min-h-[60px]"
                  value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Ex: Contacto preferencial é o Sérgio, negociámos 3 desafios por mês..." />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white text-sm font-medium hover:bg-white/10">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> A guardar...</> : <><CheckCircle2 className="w-4 h-4" /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar apagar */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#14141F] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-bold text-lg mb-2">Remover patrocinador?</h3>
            <p className="text-gray-400 text-sm mb-2">
              O perfil de <strong className="text-white">{confirmDelete.name}</strong> será apagado.
            </p>
            {challengeCountBySponsor(confirmDelete.id) > 0 && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                ⚠️ Este patrocinador tem {challengeCountBySponsor(confirmDelete.id)} desafio(s) associado(s).
                Os desafios não serão apagados mas ficarão sem referência de patrocinador.
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white text-sm font-medium hover:bg-white/10">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete.id)}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}