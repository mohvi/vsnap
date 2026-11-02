import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Building2, Plus, Edit2, Globe, Phone, Mail, BarChart3, Upload, X, Power, Search,
} from 'lucide-react';
import { storage } from '../fb';
import { useAdminData } from '../data/AdminDataProvider';
import { newSponsorId, saveSponsor, setSponsorActive } from '../data/actions';
import { computeSponsorSummary, toList } from '../data/metrics';
import { runAction } from '../utils/runAction';
import { formatNumber } from '../utils/format';
import { PageLoader } from './ui/Spinner';
import PageHeader from './ui/PageHeader';
import Modal, { ModalButton } from './ui/Modal';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const inputClass = 'w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-purple-500';

export function SponsorLogo({ sponsor, size = 'w-12 h-12' }) {
  if (sponsor?.logoUrl) {
    return <img src={sponsor.logoUrl} alt="" className={`${size} rounded-xl object-contain bg-white flex-shrink-0`} />;
  }
  return (
    <div className={`${size} rounded-xl bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center flex-shrink-0 text-white font-bold`}>
      {(sponsor?.name || '?').slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function SponsorsPage() {
  const { loading, sponsors, sponsorPrivate, challenges, challengeDeals } = useAdminData();
  const [editing, setEditing] = useState(null); // null | { id?: string }
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return toList(sponsors)
      .filter((s) => !q || s.name?.toLowerCase().includes(q))
      .sort((a, b) => (a.active === false) - (b.active === false) || (a.name || '').localeCompare(b.name || ''));
  }, [sponsors, search]);

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <PageHeader
        icon={Building2}
        iconClass="text-pink-400"
        title="Marcas"
        subtitle="Patrocinadores dos desafios. Nome e logótipo aparecem na app; contactos e valores ficam só no painel."
        actions={(
          <button
            onClick={() => setEditing({})}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl text-white font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Nova marca
          </button>
        )}
      />

      <label className="flex items-center gap-2 bg-slate-800 border border-white/5 rounded-xl px-3 mb-6 focus-within:border-purple-500">
        <Search className="w-4 h-4 text-gray-500" />
        <span className="sr-only">Pesquisar marcas</span>
        <input
          type="search"
          className="w-full bg-transparent py-3 text-white outline-none text-sm"
          placeholder="Pesquisar marca..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>

      {list.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          {search ? 'Nenhuma marca encontrada' : 'Ainda não há marcas. Cria a primeira para lançar um desafio patrocinado.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map((sponsor) => {
            const summary = computeSponsorSummary(sponsor.id, challenges, challengeDeals);
            const contact = sponsorPrivate[sponsor.id] || {};
            const inactive = sponsor.active === false;
            return (
              <article
                key={sponsor.id}
                className={`bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-5 ${inactive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <SponsorLogo sponsor={sponsor} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-white font-semibold break-words">{sponsor.name}</h2>
                      {inactive && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">Inactiva</span>}
                    </div>
                    <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                      {sponsor.website && (
                        <a href={sponsor.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-gray-300 truncate">
                          <Globe className="w-3 h-3 flex-shrink-0" />{sponsor.website}
                        </a>
                      )}
                      {contact.contactName && <p className="truncate">{contact.contactName}</p>}
                      {contact.contactPhone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.contactPhone}</p>}
                      {contact.contactEmail && <p className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{contact.contactEmail}</p>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  {[
                    ['Desafios', `${summary.challengesCount}${summary.activeCount ? ` (${summary.activeCount} activos)` : ''}`],
                    ['Participantes', formatNumber(summary.participants)],
                    ['Votos', formatNumber(summary.votes)],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white/5 rounded-xl p-2">
                      <p className="text-[11px] text-gray-500">{label}</p>
                      <p className="text-white text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    Recebido <span className="text-green-400 font-medium">{formatNumber(summary.dealsReceivedMzn)} MZN</span>
                    {summary.dealsPendingMzn > 0 && (
                      <> · por receber <span className="text-amber-400 font-medium">{formatNumber(summary.dealsPendingMzn)} MZN</span></>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                  <Link
                    to={`/marcas/${sponsor.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 text-sm"
                  >
                    <BarChart3 className="w-4 h-4" /> Relatórios
                  </Link>
                  <button
                    onClick={() => setEditing(sponsor)}
                    aria-label="Editar marca"
                    title="Editar marca"
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => runAction(() => setSponsorActive(sponsor.id, inactive), {
                      success: inactive ? 'Marca reactivada' : 'Marca desactivada',
                    })}
                    aria-label={inactive ? 'Reactivar marca' : 'Desactivar marca'}
                    title={inactive ? 'Reactivar marca' : 'Desactivar (deixa de aparecer ao criar desafios)'}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <SponsorModal
          sponsor={editing}
          contact={editing.id ? sponsorPrivate[editing.id] : null}
          challenges={challenges}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SponsorModal({ sponsor, contact, challenges, onClose }) {
  const isNew = !sponsor.id;
  const [form, setForm] = useState({
    name: sponsor.name || '',
    website: sponsor.website || '',
    contactName: contact?.contactName || '',
    contactPhone: contact?.contactPhone || '',
    contactEmail: contact?.contactEmail || '',
    notes: contact?.notes || '',
  });
  const [logoUrl, setLogoUrl] = useState(sponsor.logoUrl || '');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => () => logoPreview && URL.revokeObjectURL(logoPreview), [logoPreview]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const pickLogo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError('O logótipo tem de ser jpg, png ou webp.');
    if (file.size > MAX_LOGO_BYTES) return setError('O logótipo não pode passar 2MB.');
    setError('');
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl('');
  };

  const handleSave = async () => {
    const website = form.website.trim();
    if (!form.name.trim()) return setError('Indica o nome da marca.');
    if (website && !/^https?:\/\//i.test(website)) return setError('O site tem de começar por http:// ou https://');
    if (form.contactEmail.trim() && !/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) return setError('Email inválido.');
    setError('');
    setSaving(true);
    const sponsorId = sponsor.id || newSponsorId();
    const ok = await runAction(async () => {
      let finalLogo = logoUrl;
      if (logoFile) {
        const ext = logoFile.type.split('/')[1];
        const fileRef = storageRef(storage, `sponsors/${sponsorId}/logo_${Date.now()}.${ext}`);
        await uploadBytes(fileRef, logoFile, { contentType: logoFile.type });
        finalLogo = await getDownloadURL(fileRef);
      }
      await saveSponsor(
        sponsorId,
        {
          name: form.name.trim(),
          logoUrl: finalLogo || null,
          website: website || null,
          ...(isNew ? { active: true, createdAt: Date.now() } : {}),
        },
        {
          contactName: form.contactName.trim() || null,
          contactPhone: form.contactPhone.trim() || null,
          contactEmail: form.contactEmail.trim() || null,
          notes: form.notes.trim() || null,
        },
        challenges,
      );
    }, { success: isNew ? 'Marca criada' : 'Marca actualizada' });
    setSaving(false);
    if (ok) onClose();
  };

  const shownLogo = logoPreview || logoUrl;

  return (
    <Modal
      title={isNew ? 'Nova marca' : 'Editar marca'}
      size="md"
      onClose={onClose}
      footer={(
        <>
          <ModalButton onClick={onClose}>Cancelar</ModalButton>
          <ModalButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'A guardar...' : 'Guardar'}
          </ModalButton>
        </>
      )}
    >
      <div className="space-y-4">
        {error && <p role="alert" className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">{error}</p>}

        <div className="flex items-center gap-4">
          {shownLogo ? (
            <div className="relative">
              <img src={shownLogo} alt="Logótipo" className="w-16 h-16 rounded-xl object-contain bg-white" />
              <button
                type="button"
                onClick={removeLogo}
                aria-label="Remover logótipo"
                className="absolute -top-2 -right-2 bg-black rounded-full p-1 text-white border border-white/20"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <SponsorLogo sponsor={{ name: form.name }} size="w-16 h-16" />
          )}
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 cursor-pointer">
            <Upload className="w-4 h-4" /> {shownLogo ? 'Trocar logótipo' : 'Carregar logótipo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pickLogo} />
          </label>
        </div>

        <p className="text-xs text-gray-500 uppercase tracking-wide">Público (aparece na app)</p>
        <label className="block">
          <span className="text-sm text-gray-400 block mb-1">Nome da marca</span>
          <input className={inputClass} value={form.name} onChange={set('name')} maxLength={60} placeholder="Ex: Bar Praia do Wimbi" />
        </label>
        <label className="block">
          <span className="text-sm text-gray-400 block mb-1">Site ou página (opcional)</span>
          <input className={inputClass} value={form.website} onChange={set('website')} placeholder="https://..." />
        </label>

        <p className="text-xs text-gray-500 uppercase tracking-wide pt-2">Interno (só no painel)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-gray-400 block mb-1">Pessoa de contacto</span>
            <input className={inputClass} value={form.contactName} onChange={set('contactName')} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-400 block mb-1">Telefone</span>
            <input className={inputClass} value={form.contactPhone} onChange={set('contactPhone')} inputMode="tel" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-gray-400 block mb-1">Email</span>
          <input className={inputClass} value={form.contactEmail} onChange={set('contactEmail')} type="email" />
        </label>
        <label className="block">
          <span className="text-sm text-gray-400 block mb-1">Notas</span>
          <textarea className={`${inputClass} min-h-[80px]`} value={form.notes} onChange={set('notes')} placeholder="Condições combinadas, histórico..." />
        </label>
      </div>
    </Modal>
  );
}
