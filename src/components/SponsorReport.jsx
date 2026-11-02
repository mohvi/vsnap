import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, Download, Printer, Trophy, Users, Vote, TrendingUp, Video, Crown,
} from 'lucide-react';
import { useAdminData } from '../data/AdminDataProvider';
import { updateChallengeDeal } from '../data/actions';
import { buildReportCsv, computeSponsorReport, computeSponsorSummary, toList } from '../data/metrics';
import { runAction } from '../utils/runAction';
import { downloadCsv } from '../utils/csv';
import { formatDate, formatNumber } from '../utils/format';
import { PageLoader } from './ui/Spinner';
import { SponsorLogo } from './SponsorsPage';

const STATUS_LABELS = {
  active: 'Activo',
  pending_confirmation: 'A confirmar vencedor',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const PRIZE_PROVIDERS = {
  sponsor: 'A marca entrega o prémio',
  votasnap: 'A VotaSnap entrega o prémio',
};

export default function SponsorReport() {
  const { sponsorId } = useParams();
  const { loading, sponsors, challenges, entries, votes, users, challengeDeals } = useAdminData();
  const sponsor = sponsors[sponsorId];

  const sponsorChallenges = useMemo(
    () => toList(challenges).filter((c) => c.sponsorId === sponsorId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [challenges, sponsorId],
  );
  const [selectedId, setSelectedId] = useState(null);
  const selected = sponsorChallenges.find((c) => c.id === selectedId) || sponsorChallenges[0];

  if (loading) return <PageLoader />;

  if (!sponsor) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-gray-400">
        <p>Marca não encontrada.</p>
        <Link to="/marcas" className="text-brand-400 text-sm">Voltar às marcas</Link>
      </div>
    );
  }

  const summary = computeSponsorSummary(sponsorId, challenges, challengeDeals);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 print:p-0">
      <Link to="/marcas" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4 print:hidden">
        <ArrowLeft className="w-4 h-4" /> Marcas
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <SponsorLogo sponsor={sponsor} size="w-14 h-14" />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white break-words">{sponsor.name}</h1>
          <p className="text-gray-500 text-sm">
            {summary.challengesCount} desafio(s) · {formatNumber(summary.participants)} participantes · {formatNumber(summary.votes)} votos
          </p>
        </div>
      </div>

      {sponsorChallenges.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          Esta marca ainda não tem desafios. <Link to="/cc" className="text-brand-400">Criar desafio patrocinado</Link>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 print:hidden">
            {sponsorChallenges.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl border text-sm text-left ${
                  c.id === selected.id ? 'border-brand-500 bg-brand-500/10 text-white' : 'border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <span className="block font-medium truncate max-w-[220px]">{c.title}</span>
                <span className="block text-[11px] text-gray-500">{STATUS_LABELS[c.status] || c.status} · {formatDate(c.createdAt)}</span>
              </button>
            ))}
          </div>

          <ChallengeReport
            key={selected.id}
            challenge={selected}
            report={computeSponsorReport(selected, entries[selected.id], votes[selected.id], users)}
            deal={challengeDeals[selected.id]}
          />
        </>
      )}
    </div>
  );
}

function ChallengeReport({ challenge, report, deal }) {
  const maxDay = Math.max(1, ...report.votesByDay.map((d) => d.count));
  const exportCsv = () => downloadCsv(
    `relatorio-${(challenge.sponsor || 'marca').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${challenge.id}.csv`,
    buildReportCsv(challenge, report),
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-white text-lg font-semibold flex items-center gap-2 break-words">
            <BarChart3 className="w-5 h-5 text-brand-400 flex-shrink-0" /> {challenge.title}
          </h2>
          <p className="text-gray-500 text-sm">
            {formatDate(challenge.createdAt)} – {formatDate(challenge.endsAt)} · Prémio: <span className="text-yellow-400">{challenge.prize}</span>
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-200">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-200">
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Publicações', formatNumber(report.participants), Users],
          ['Pessoas a publicar', formatNumber(report.uniqueParticipants), Users],
          ['Votos', formatNumber(report.votes), Vote],
          ['Dia com mais votos', report.peakDay ? `${report.peakDay.count} (${report.peakDay.day.slice(5)})` : '—', TrendingUp],
        ].map(([label, value, Icon]) => (
          <div key={label} className="bg-ink-900 border border-white/10 rounded-2xl p-4">
            <p className="text-gray-500 text-xs flex items-center gap-1"><Icon className="w-3 h-3" />{label}</p>
            <p className="text-white text-xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      {report.votesByDay.length > 0 && (
        <div className="bg-ink-900 border border-white/10 rounded-2xl p-4">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Votos por dia</p>
          <div className="flex items-end gap-1 h-32" role="img" aria-label="Votos por dia">
            {report.votesByDay.map((d) => (
              <div key={d.day} className="flex-1 min-w-[6px] flex flex-col items-center justify-end h-full" title={`${d.day}: ${d.count} votos`}>
                <div className="w-full rounded-t bg-gradient-to-t from-brand-600 to-accent-500" style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? 2 : 0 }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>{report.votesByDay[0].day}</span>
            <span>{report.votesByDay[report.votesByDay.length - 1].day}</span>
          </div>
        </div>
      )}

      {report.winner && (
        <div className="flex items-center gap-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
          {report.winner.mediaUrl && <img src={report.winner.mediaUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />}
          <div>
            <p className="text-yellow-400 text-xs font-semibold flex items-center gap-1"><Crown className="w-3 h-3" /> Vencedor</p>
            <p className="text-white font-semibold">@{report.winner.username}</p>
            <p className="text-gray-400 text-sm">{formatNumber(report.winner.votes)} votos</p>
          </div>
        </div>
      )}

      <div>
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1">
          <Trophy className="w-3 h-3" /> Publicações mais votadas
        </p>
        {report.topEntries.length === 0 ? (
          <p className="text-gray-600 text-sm">Ainda sem publicações.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {report.topEntries.map((e) => (
              <a
                key={e.id}
                href={e.mediaUrl || undefined}
                target="_blank"
                rel="noreferrer"
                className="block bg-ink-900 border border-white/10 rounded-xl overflow-hidden hover:border-brand-500/50"
              >
                <div className="relative aspect-square bg-black">
                  {e.mediaType === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-500"><Video className="w-8 h-8" /></div>
                  ) : e.mediaUrl ? (
                    <img src={e.mediaUrl} alt={e.caption} loading="lazy" className="w-full h-full object-cover" />
                  ) : null}
                  <span className="absolute top-1.5 left-1.5 text-[11px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded">#{e.position}</span>
                </div>
                <div className="p-2">
                  <p className="text-white text-xs font-medium truncate">@{e.username}</p>
                  <p className="text-brand-400 text-xs">{formatNumber(e.votes)} votos</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <DealPanel challengeId={challenge.id} deal={deal} />
    </section>
  );
}

// Acordo comercial (só admin): não entra no CSV nem na impressão.
function DealPanel({ challengeId, deal }) {
  const [amount, setAmount] = useState(deal?.amountMzn ?? '');
  const [saving, setSaving] = useState(false);

  const save = async (fields, success) => {
    setSaving(true);
    await runAction(() => updateChallengeDeal(challengeId, fields), { success });
    setSaving(false);
  };

  const paid = deal?.paymentStatus === 'paid';

  return (
    <div className="bg-ink-900 border border-white/10 rounded-2xl p-4 print:hidden">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Acordo com a marca (interno)</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <label className="block">
          <span className="text-sm text-gray-400 block mb-1">Valor acordado (MZN)</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            className="w-full bg-ink-800 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-brand-500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => {
              const value = amount === '' ? 0 : Number(amount);
              if (Number.isFinite(value) && value >= 0 && value !== Number(deal?.amountMzn || 0)) {
                save({ amountMzn: value }, 'Valor actualizado');
              }
            }}
          />
        </label>
        <div>
          <span className="text-sm text-gray-400 block mb-1">Pagamento da marca</span>
          <button
            disabled={saving}
            onClick={() => save(
              { paymentStatus: paid ? 'pending' : 'paid', paidAt: paid ? null : Date.now() },
              paid ? 'Marcado como por receber' : 'Marcado como recebido',
            )}
            className={`w-full py-3 rounded-xl text-sm font-medium disabled:opacity-50 ${
              paid ? 'bg-green-600/20 text-green-300' : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            {paid ? `Recebido${deal?.paidAt ? ` em ${formatDate(deal.paidAt)}` : ''}` : 'Por receber — marcar como recebido'}
          </button>
        </div>
        <p className="text-sm text-gray-400">
          {PRIZE_PROVIDERS[deal?.prizeProvider] || 'Entrega do prémio não definida'}
          {deal?.prizeNotes && <span className="block text-xs text-gray-500 mt-1 break-words">{deal.prizeNotes}</span>}
        </p>
      </div>
    </div>
  );
}
