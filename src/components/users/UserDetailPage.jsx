import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import {
  ArrowLeft, Ban, BadgeCheck, Calendar, CheckCircle2, Coins, ExternalLink, Flag, Image as ImageIcon,
  MapPin, MessageSquareWarning, Phone, ShieldOff, Smartphone, StickyNote, Trash2, Trophy, UserX, Vote, Activity,
  Crown, PlusCircle, Eye, AlertTriangle, UserPlus,
} from 'lucide-react';
import { db } from '../../fb';
import { useAdminData } from '../../data/AdminDataProvider';
import { addAdminNote, deleteAdminNote, unbanUsers } from '../../data/actions';
import { getUserEntries, getUserVotesGiven } from '../../data/metrics';
import {
  buildUserIndex, buildUserTimeline, indexRow, isBanExpired, userReports, userSnapsHistory,
} from '../../data/users';
import { runAction } from '../../utils/runAction';
import { provinceName } from '../../utils/provinces';
import { formatDate, formatDateTime, formatNumber, timeAgo } from '../../utils/format';
import { PageLoader } from '../ui/Spinner';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Tabs from '../ui/Tabs';
import { inputClass } from '../ui/fields';
import { BanModal, SnapsModal, WarnModal } from './UserActionModals';

const TIMELINE_ICONS = {
  signup: [UserPlus, 'text-blue-400'],
  entry: [PlusCircle, 'text-green-400'],
  vote: [Eye, 'text-sky-400'],
  win: [Crown, 'text-yellow-400'],
  warning: [MessageSquareWarning, 'text-amber-400'],
  ban: [Ban, 'text-red-400'],
  snaps: [Coins, 'text-yellow-400'],
};

const REPORT_STATUS = { pending: ['Pendente', 'amber'], dismissed: ['Arquivada', 'gray'], removed: ['Removida', 'red'] };

function ActionButton({ icon: Icon, tone = 'default', children, ...props }) {
  const tones = {
    default: 'bg-white/5 hover:bg-white/10 text-gray-200',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400',
    success: 'bg-green-500/10 hover:bg-green-500/20 text-green-400',
  };
  return (
    <button className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${tones[tone]}`} {...props}>
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

function MiniStat({ icon: Icon, color, label, value }) {
  return (
    <div className="bg-ink-900 border border-white/5 rounded-2xl p-3 sm:p-4">
      <Icon className={`w-4 h-4 ${color} mb-2`} />
      <p className="text-white text-lg font-bold tabular-nums">{formatNumber(value)}</p>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  );
}

function useAdminNotes(uid) {
  const [notes, setNotes] = useState([]);
  useEffect(() => onValue(ref(db, `adminNotes/${uid}`), (snap) => {
    const list = Object.entries(snap.val() || {}).map(([id, n]) => ({ id, ...n }));
    setNotes(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  }), [uid]);
  return notes;
}

export default function UserDetailPage() {
  const { uid } = useParams();
  const data = useAdminData();
  const { loading, users, challenges, entries, votes, reports, snapsHistory } = data;
  const [tab, setTab] = useState('activity');
  const [modal, setModal] = useState(null); // 'ban' | 'warn' | 'snaps'
  const notes = useAdminNotes(uid);

  const user = users[uid] ? { ...users[uid], uid } : null;

  const derived = useMemo(() => {
    if (!user) return null;
    const userEntries = getUserEntries(uid, entries, challenges);
    const votesGiven = getUserVotesGiven(uid, votes, challenges);
    const snaps = userSnapsHistory(snapsHistory[uid]);
    return {
      userEntries,
      votesGiven,
      snaps,
      reports: userReports(uid, reports),
      row: indexRow(buildUserIndex({ users: { [uid]: user }, entries, votes, reports }), uid),
      timeline: buildUserTimeline(user, { entries: userEntries, votesGiven, snaps, challenges }),
      warnings: Object.entries(user.warnings || {}).map(([id, w]) => ({ id, ...w })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    };
    // `user` é recriado a cada render; users[uid] é a referência estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, users[uid], entries, votes, challenges, reports, snapsHistory]);

  if (loading) return <PageLoader />;
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <EmptyState icon={UserX} title="Utilizador não encontrado" hint="A conta pode ter sido eliminada.">
          <Link to="/ul" className="text-brand-400 text-sm hover:underline">Voltar aos utilizadores</Link>
        </EmptyState>
      </div>
    );
  }

  const { userEntries, votesGiven, snaps, row, timeline, warnings } = derived;
  const expired = isBanExpired(user);

  const tabs = [
    ['activity', 'Actividade'],
    ['entries', `Publicações (${userEntries.length})`],
    ['votes', `Votos (${votesGiven.length})`],
    ['reports', `Denúncias (${derived.reports.received.length + derived.reports.made.length})`],
    ['snaps', `Snaps (${snaps.length})`],
    ['notes', `Notas (${notes.length})`],
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Link to="/ul" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> Utilizadores
      </Link>

      {/* Cabeçalho */}
      <div className="bg-ink-900 border border-white/5 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          <Avatar user={user} size="w-16 h-16 sm:w-20 sm:h-20" textSize="text-2xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-xl sm:text-2xl font-bold flex items-center gap-2">
              <span className="truncate">{user.name || 'Sem nome'}</span>
              {user.verified && <BadgeCheck className="w-5 h-5 text-blue-400 flex-shrink-0" />}
            </h1>
            <p className="text-gray-500 text-sm">@{user.username || 'sem-username'}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {user.banned
                ? <Badge tone="red" icon={Ban}>{user.bannedUntil ? `Banido até ${formatDate(user.bannedUntil)}` : 'Banido'}</Badge>
                : <Badge tone="green">Activo</Badge>}
              {expired && <Badge tone="amber" icon={AlertTriangle}>Prazo do banimento terminou</Badge>}
              {user.riskFlags?.sharedPushToken && <Badge tone="amber" icon={Smartphone}>Aparelho partilhado</Badge>}
              {warnings.length > 0 && <Badge tone="amber" icon={MessageSquareWarning}>{warnings.length} aviso(s)</Badge>}
              {user.isFake && <Badge tone="gray">Mock</Badge>}
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-4 text-sm text-gray-400">
              <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{user.phone || 'Sem telefone'}</span>
              <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{[user.city, provinceName(user.province)].filter(Boolean).join(', ') || 'Sem localização'}</span>
              <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" />Registado em {formatDate(user.createdAt)}</span>
              <span className="flex items-center gap-2"><Activity className="w-3.5 h-3.5" />Última actividade há {timeAgo(row.lastActiveAt)}</span>
              {user.phoneVerifiedAt && (
                <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" />Telefone verificado em {formatDate(user.phoneVerifiedAt)}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap md:flex-col gap-2 md:w-44">
            <ActionButton icon={MessageSquareWarning} onClick={() => setModal('warn')}>Avisar</ActionButton>
            <ActionButton icon={Coins} onClick={() => setModal('snaps')}>Acertar Snaps</ActionButton>
            {user.banned ? (
              <ActionButton
                icon={ShieldOff}
                tone="success"
                onClick={() => runAction(() => unbanUsers([uid]), { success: 'Banimento levantado' })}
              >
                Levantar banimento
              </ActionButton>
            ) : (
              <ActionButton icon={Ban} tone="danger" onClick={() => setModal('ban')}>Banir</ActionButton>
            )}
          </div>
        </div>

        {user.bio && <p className="text-gray-400 text-sm mt-5 p-3 bg-white/5 rounded-xl break-words">{user.bio}</p>}

        {user.banned && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm">
            <p className="text-red-400 font-medium">Banido em {formatDateTime(user.bannedAt)}</p>
            <p className="text-red-400/70 text-xs mt-1 break-words">{user.banReason}</p>
          </div>
        )}

        {user.riskFlags?.sharedPushToken && Array.isArray(user.riskFlags.sharedWithUids) && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm">
            <p className="text-amber-400 font-medium">Mesmo aparelho que:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {user.riskFlags.sharedWithUids.map((other) => (
                <Link key={other} to={`/ul/${other}`} className="text-xs px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20">
                  {users[other]?.username ? `@${users[other].username}` : other}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniStat icon={Coins} color="text-yellow-400" label="Snaps" value={user.snaps || 0} />
        <MiniStat icon={Trophy} color="text-brand-400" label="Vitórias" value={user.wins || 0} />
        <MiniStat icon={ImageIcon} color="text-green-400" label="Publicações" value={row.entriesCount} />
        <MiniStat icon={Vote} color="text-sky-400" label="Votos dados" value={row.votesCount} />
        <MiniStat icon={Flag} color="text-red-400" label="Denúncias recebidas" value={row.reportsReceived} />
        <MiniStat icon={MessageSquareWarning} color="text-amber-400" label="Avisos" value={warnings.length} />
      </div>

      <Card bodyClass="pt-0 sm:pt-0">
        <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4 -mx-4 sm:-mx-5 px-4 sm:px-5 pt-2" />

        {tab === 'activity' && (
          timeline.length === 0 ? <EmptyState icon={Activity} title="Sem actividade registada" /> : (
            <ol className="relative border-l border-white/10 ml-2 space-y-4">
              {timeline.map((ev, i) => {
                const [Icon, color] = TIMELINE_ICONS[ev.type] || [Activity, 'text-gray-400'];
                return (
                  <li key={`${ev.type}-${ev.at}-${i}`} className="ml-5">
                    <span className="absolute -left-3 w-6 h-6 rounded-full bg-ink-800 border border-white/10 flex items-center justify-center">
                      <Icon className={`w-3 h-3 ${color}`} />
                    </span>
                    <p className="text-white text-sm break-words">{ev.text}</p>
                    <p className="text-gray-500 text-xs">{formatDateTime(ev.at)}</p>
                  </li>
                );
              })}
            </ol>
          )
        )}

        {tab === 'entries' && (
          userEntries.length === 0 ? <EmptyState icon={ImageIcon} title="Ainda não publicou" /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {userEntries.map((e) => (
                <a key={e.entryId} href={e.mediaUrl} target="_blank" rel="noreferrer" className="group bg-white/5 rounded-xl overflow-hidden">
                  {e.mediaType === 'photo' || !e.mediaType ? (
                    <img src={e.mediaUrl} alt={e.caption || 'Publicação'} loading="lazy" className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-black flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-600" /></div>
                  )}
                  <div className="p-2.5">
                    <p className="text-white text-xs font-medium truncate">{e.challengeTitle}</p>
                    <p className="text-gray-500 text-xs flex items-center justify-between gap-2 mt-0.5">
                      <span className="flex items-center gap-1"><Vote className="w-3 h-3" />{e.votes || 0}</span>
                      <span>{formatDate(e.createdAt)}</span>
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )
        )}

        {tab === 'votes' && (
          votesGiven.length === 0 ? <EmptyState icon={Vote} title="Ainda não votou" /> : (
            <ul className="divide-y divide-white/5">
              {votesGiven.map((v) => (
                <li key={v.challengeId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-white truncate">{v.challengeTitle}</span>
                  <span className="text-gray-500 text-xs flex-shrink-0">{formatDateTime(v.votedAt)}</span>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'reports' && <ReportsTab reports={derived.reports} users={users} />}

        {tab === 'snaps' && (
          snaps.length === 0 ? <EmptyState icon={Coins} title="Sem movimentos de Snaps" /> : (
            <ul className="divide-y divide-white/5">
              {snaps.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="text-white truncate">{tx.reason || tx.description || tx.type || 'Movimento'}</p>
                    <p className="text-gray-500 text-xs">{formatDateTime(tx.at)}{tx.by ? ` · ${tx.by}` : ''}</p>
                  </div>
                  <span className={`font-semibold tabular-nums flex-shrink-0 ${Number(tx.amount) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {Number(tx.amount) > 0 ? '+' : ''}{formatNumber(tx.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'notes' && <NotesTab uid={uid} notes={notes} warnings={warnings} />}
      </Card>

      {modal === 'ban' && <BanModal users={[user]} onClose={() => setModal(null)} />}
      {modal === 'warn' && <WarnModal users={[user]} onClose={() => setModal(null)} />}
      {modal === 'snaps' && <SnapsModal user={user} onClose={() => setModal(null)} />}
    </div>
  );
}

function ReportList({ title, list, users, field }) {
  return (
    <div>
      <h3 className="text-gray-300 text-sm font-semibold mb-2">{title}</h3>
      {list.length === 0 ? <p className="text-gray-600 text-sm py-3">Nenhuma.</p> : (
        <ul className="space-y-2">
          {list.map((r) => {
            const [label, tone] = REPORT_STATUS[r.status] || [r.status, 'gray'];
            const other = r[field];
            return (
              <li key={r.id} className="p-3 bg-white/5 rounded-xl text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white">{r.reason || 'Sem motivo'}</span>
                  <Badge tone={tone}>{label}</Badge>
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  {formatDateTime(r.createdAt)}
                  {other && (
                    <>
                      {' · '}
                      <Link to={`/ul/${other}`} className="hover:text-white">
                        {users[other]?.username ? `@${users[other].username}` : other}
                      </Link>
                    </>
                  )}
                  {r.mediaUrl && (
                    <a href={r.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 ml-2 hover:text-white">
                      <ExternalLink className="w-3 h-3" /> conteúdo
                    </a>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ReportsTab({ reports, users }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <ReportList title={`Recebidas (${reports.received.length})`} list={reports.received} users={users} field="reportedBy" />
      <ReportList title={`Feitas (${reports.made.length})`} list={reports.made} users={users} field="reportedUserId" />
    </div>
  );
}

function NotesTab({ uid, notes, warnings }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const ok = await runAction(() => addAdminNote(uid, text), { success: 'Nota guardada' });
    setBusy(false);
    if (ok) setText('');
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-gray-300 text-sm font-semibold mb-2 flex items-center gap-2"><StickyNote className="w-4 h-4" />Notas internas</h3>
        <p className="text-gray-500 text-xs mb-3">Só os administradores vêem estas notas.</p>
        <form onSubmit={save} className="flex gap-2 mb-4">
          <input className={inputClass} placeholder="Escreve uma nota..." value={text} onChange={(e) => setText(e.target.value)} />
          <button disabled={busy || !text.trim()} className="px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50">
            Guardar
          </button>
        </form>
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="p-3 bg-white/5 rounded-xl text-sm flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white break-words whitespace-pre-wrap">{n.text}</p>
                <p className="text-gray-500 text-xs mt-1">{formatDateTime(n.createdAt)}{n.by ? ` · ${n.by}` : ''}</p>
              </div>
              <button
                aria-label="Apagar nota"
                onClick={() => runAction(() => deleteAdminNote(uid, n.id), { success: 'Nota apagada' })}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-gray-300 text-sm font-semibold mb-2 flex items-center gap-2"><MessageSquareWarning className="w-4 h-4" />Avisos</h3>
        {warnings.length === 0 ? <p className="text-gray-600 text-sm py-3">Sem avisos.</p> : (
          <ul className="space-y-2">
            {warnings.map((w) => (
              <li key={w.id} className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-sm">
                <p className="text-amber-200 break-words">{w.reason}</p>
                <p className="text-gray-500 text-xs mt-1">{formatDateTime(w.createdAt)}{w.by ? ` · ${w.by}` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
