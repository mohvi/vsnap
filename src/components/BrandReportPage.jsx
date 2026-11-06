import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Video } from 'lucide-react';
import { useAdminData } from '../data/AdminDataProvider';
import { buildBrandReport, executiveSummary, leadsCsvRows, reportReference } from '../data/brandReport';
import { downloadCsv, toCsv } from '../utils/csv';
import { formatDate, formatNumber } from '../utils/format';
import { PageLoader } from './ui/Spinner';

// Relatório de campanha para a marca. Desenhado como folhas A4: o botão
// "Descarregar PDF" abre a impressão do navegador ("Guardar como PDF"), que
// mantém o texto pesquisável e as imagens nítidas.

const money = (n) => `${Number(n).toLocaleString('pt-MZ', { maximumFractionDigits: 2 })} MZN`;
const pct = (x) => `${Math.round(x * 100)}%`;
// 258841234567 → +258 84 123 4567
const phone = (p) => {
  const d = String(p || '').replace(/[^0-9]/g, '');
  const m = d.match(/^(258)(8[2-7])([0-9]{3})([0-9]{4})$/);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]}` : (d ? `+${d}` : '—');
};
const fullDate = (t) => (t ? new Date(t).toLocaleDateString('pt-MZ', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const STATUS = { active: 'Em curso', pending_confirmation: 'Concluído (a validar vencedor)', completed: 'Concluído', cancelled: 'Cancelado' };

function Sheet({ children, className = '' }) {
  return (
    <section className={`report-sheet bg-white text-gray-900 mx-auto w-full max-w-[210mm] shadow-xl print:shadow-none px-[14mm] py-[14mm] print:px-0 print:py-0 mb-8 print:mb-0 ${className}`}>
      {children}
    </section>
  );
}

function SectionTitle({ n, children, hint }) {
  return (
    <div className="mb-4 border-b-2 border-brand-600 pb-1.5 flex items-end justify-between gap-3">
      <h2 className="text-[15pt] font-bold text-gray-900">
        <span className="text-brand-600 mr-2">{n}.</span>{children}
      </h2>
      {hint && <span className="text-[8pt] text-gray-500 text-right">{hint}</span>}
    </div>
  );
}

function Kpi({ label, value, note }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 break-inside-avoid">
      <p className="text-[7.5pt] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-[17pt] font-bold text-gray-900 leading-tight mt-0.5 tabular-nums">{value}</p>
      {note && <p className="text-[7.5pt] text-gray-500 mt-0.5">{note}</p>}
    </div>
  );
}

function Logo({ src, name, size = 'h-14 w-14' }) {
  if (src) return <img src={src} alt="" className={`${size} object-contain rounded-lg`} />;
  return (
    <div className={`${size} rounded-lg bg-gradient-to-br from-brand-600 to-accent-600 text-white font-bold flex items-center justify-center text-xl`}>
      {(name || '?').slice(0, 1).toUpperCase()}
    </div>
  );
}

function DailyChart({ daily }) {
  if (!daily.length) return <p className="text-gray-500 text-[9pt]">Sem actividade registada.</p>;
  const W = 700;
  const H = 160;
  const TOP = 14; // espaço para o ponto acima da barra mais alta
  const LEFT = 26; // escala
  const max = Math.max(1, ...daily.map((d) => d.votes));
  const ticks = [...new Set([0.5, 1].map((f) => Math.round(max * f)))].filter((v) => v > 0);
  const bw = (W - LEFT) / daily.length;
  const every = Math.ceil(daily.length / 10);
  const y = (v) => TOP + H - (v / max) * H;
  return (
    <svg viewBox={`0 0 ${W} ${TOP + H + 22}`} className="w-full" role="img" aria-label="Votos e publicações por dia">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={LEFT} x2={W} y1={y(v)} y2={y(v)} stroke="#e5e7eb" strokeWidth="1" />
          <text x={LEFT - 6} y={y(v) + 3} fontSize="9" fill="#9ca3af" textAnchor="end">{v}</text>
        </g>
      ))}
      <line x1={LEFT} x2={W} y1={TOP + H} y2={TOP + H} stroke="#d1d5db" strokeWidth="1" />
      {daily.map((d, i) => {
        const x = LEFT + i * bw;
        return (
          <g key={d.day}>
            <rect x={x + bw * 0.15} y={y(d.votes)} width={bw * 0.7} height={TOP + H - y(d.votes)} rx="2" fill="#FF286A" />
            {d.entries > 0 && <circle cx={x + bw / 2} cy={y(d.votes) - 7} r="3.5" fill="#111827" />}
            {i % every === 0 && (
              <text x={x + bw / 2} y={TOP + H + 15} fontSize="9" fill="#6b7280" textAnchor="middle">{d.day.slice(8)}/{d.day.slice(5, 7)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Footer({ company }) {
  const bits = [company.legalName || company.name, company.nuit && `NUIT ${company.nuit}`, company.email, company.phone].filter(Boolean);
  return <p className="text-[7.5pt] text-gray-400 mt-6 pt-2 border-t border-gray-100 print:hidden">{bits.join(' · ')}</p>;
}

export default function BrandReportPage() {
  const { challengeId } = useParams();
  const data = useAdminData();
  const challenge = data.challenges[challengeId] ? { id: challengeId, ...data.challenges[challengeId] } : null;
  const sponsor = challenge?.sponsorId ? data.sponsors[challenge.sponsorId] || {} : {};
  const sponsorInfo = challenge?.sponsorId ? data.sponsorPrivate[challenge.sponsorId] || {} : {};
  const company = { name: 'VotaSnap', ...(data.company || {}) };
  const issuedAt = useMemo(() => Date.now(), []);

  const report = useMemo(() => (challenge ? buildBrandReport({
    challenge,
    entries: data.entries[challengeId],
    votes: data.votes[challengeId],
    users: data.users,
    consents: data.sponsorConsents[challengeId],
    deal: data.challengeDeals[challengeId],
    demographics: data.userDemographics,
    reminders: data.challengeReminders?.[challengeId],
    deliveries: data.prizeDeliveries?.[challengeId],
    now: issuedAt,
  }) : null), [challenge?.id, data.entries, data.votes, data.users, data.sponsorConsents, data.challengeDeals, data.userDemographics, data.challengeReminders, data.prizeDeliveries, issuedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const brandName = sponsor.name || challenge?.sponsor || 'Marca';
  const reference = reportReference(challengeId, issuedAt);

  // Nome sugerido para o ficheiro PDF.
  useEffect(() => {
    const previous = document.title;
    document.title = `Relatorio VotaSnap - ${brandName} - ${reference}`;
    return () => { document.title = previous; };
  }, [brandName, reference]);

  if (data.loading) return <PageLoader fullScreen />;
  if (!challenge || !report) {
    return (
      <div className="p-10 text-center text-gray-400">
        Desafio não encontrado. <Link to="/marcas" className="text-brand-400">Voltar às marcas</Link>
      </div>
    );
  }

  const k = report.kpis;
  const exportLeads = () => downloadCsv(`contactos-${brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${reference}.csv`, toCsv(leadsCsvRows(report)));
  const maxProvince = Math.max(1, ...report.provinces.map((p) => p.total));
  let section = 0;
  const next = () => { section += 1; return section; };

  return (
    <div className="min-h-screen bg-ink-950 print:bg-white py-6 print:py-0 px-3 print:px-0">
      {/* Barra de acções (não sai no PDF) */}
      <div className="max-w-[210mm] mx-auto mb-5 flex flex-wrap items-center gap-2 print:hidden">
        <Link to={challenge.sponsorId ? `/marcas/${challenge.sponsorId}` : '/marcas'} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mr-auto">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        {report.leads.length > 0 && (
          <button type="button" onClick={exportLeads} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-200">
            <FileSpreadsheet className="w-4 h-4" /> Contactos (CSV)
          </button>
        )}
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 text-sm font-semibold text-white">
          <Download className="w-4 h-4" /> Descarregar PDF
        </button>
        <p className="basis-full text-xs text-gray-500">Na janela de impressão escolhe “Guardar como PDF”, papel A4 e activa “Gráficos de fundo”.</p>
      </div>

      {/* ── Capa ── */}
      <Sheet className="report-cover flex flex-col min-h-[297mm] print:min-h-[265mm]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* O ficheiro do logótipo tem muita margem: mostra só o símbolo. */}
            <div className="h-12 w-12 overflow-hidden flex-shrink-0">
              <img src="/logo512.png" alt="VotaSnap" className="h-full w-full" style={{ transform: 'scale(3.6) translate(3%, 4.2%)' }} />
            </div>
            <div>
              <p className="text-[16pt] font-extrabold tracking-tight">Vota<span className="text-brand-600">Snap</span></p>
              <p className="text-[8pt] text-gray-500">Marketing participativo · Moçambique</p>
            </div>
          </div>
          <div className="text-right text-[8pt] text-gray-500">
            <p>Ref. <span className="font-semibold text-gray-800">{reference}</span></p>
            <p>Emitido a {fullDate(issuedAt)}</p>
          </div>
        </div>

        <div className="h-1.5 w-full bg-gradient-to-r from-brand-600 to-accent-600 rounded-full mt-6" />

        <div className="mt-16">
          <p className="text-[9pt] font-semibold uppercase tracking-[0.2em] text-brand-600">Relatório de campanha</p>
          <h1 className="text-[30pt] font-extrabold leading-tight mt-2 break-words">{challenge.title}</h1>
          <p className="text-[11pt] text-gray-600 mt-3">
            {fullDate(report.period.start)} — {fullDate(report.period.end)} · {report.period.days} dia(s) · {STATUS[challenge.status] || challenge.status}
          </p>
        </div>

        <div className="mt-12 border border-gray-200 rounded-xl p-5 flex gap-5 items-start break-inside-avoid">
          <Logo src={sponsor.logoUrl} name={brandName} size="h-20 w-20" />
          <div className="min-w-0 text-[9.5pt] space-y-0.5">
            <p className="text-[8pt] uppercase tracking-wide text-gray-500">Preparado para</p>
            <p className="text-[15pt] font-bold">{brandName}</p>
            {sponsorInfo.legalName && <p>{sponsorInfo.legalName}</p>}
            {sponsorInfo.nuit && <p>NUIT: {sponsorInfo.nuit}</p>}
            {sponsorInfo.sector && <p>Sector: {sponsorInfo.sector}</p>}
            {sponsorInfo.address && <p>{sponsorInfo.address}</p>}
            {(sponsorInfo.contactName || sponsorInfo.contactEmail || sponsorInfo.contactPhone) && (
              <p className="text-gray-600">
                Contacto: {[sponsorInfo.contactName, sponsorInfo.contactPhone, sponsorInfo.contactEmail].filter(Boolean).join(' · ')}
              </p>
            )}
            {sponsor.website && <p className="text-gray-600">{sponsor.website}</p>}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-8">
          <Kpi label="Pessoas envolvidas" value={formatNumber(k.audience)} />
          <Kpi label="Publicações" value={formatNumber(k.entries)} />
          <Kpi label="Votos" value={formatNumber(k.votes)} />
          <Kpi label="Contactos autorizados" value={formatNumber(k.leads)} />
        </div>

        <div className="mt-auto pt-10 text-[8pt] text-gray-500 border-t border-gray-200">
          <p className="font-semibold text-gray-800">{company.legalName || company.name}</p>
          <p>{[company.nuit && `NUIT ${company.nuit}`, company.address].filter(Boolean).join(' · ')}</p>
          <p>{[company.email, company.phone, company.website].filter(Boolean).join(' · ')}</p>
          <p className="mt-2">Documento confidencial, destinado exclusivamente a {brandName}.</p>
        </div>
      </Sheet>

      {/* ── Resumo e resultados ── */}
      <Sheet>
        <SectionTitle n={next()}>Resumo executivo</SectionTitle>
        <p className="text-[10.5pt] leading-relaxed text-gray-700">{executiveSummary(report, challenge, brandName)}</p>

        <div className="grid grid-cols-4 gap-3 mt-5">
          <Kpi label="Participantes" value={formatNumber(k.participants)} note="pessoas que publicaram" />
          <Kpi label="Votantes" value={formatNumber(k.voters)} note="pessoas que votaram" />
          <Kpi label="Votos por publicação" value={k.votesPerEntry.toLocaleString('pt-MZ')} />
          <Kpi label="Novos utilizadores" value={formatNumber(k.newUsers)} note="contas criadas na campanha" />
          <Kpi label="Províncias" value={formatNumber(k.provinces)} note="com audiência" />
          <Kpi label="Contactos autorizados" value={formatNumber(k.leads)} note={k.participants ? `${pct(k.consentRate)} dos participantes` : undefined} />
          <Kpi label="Dia de pico" value={report.peakDay?.votes ? report.peakDay.day.split('-').reverse().slice(0, 2).join('/') : '—'} note={report.peakDay?.votes ? `${report.peakDay.votes} votos` : undefined} />
          <Kpi label="Duração" value={`${report.period.days} d`} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-[9.5pt] break-inside-avoid">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-[8pt] uppercase tracking-wide text-gray-500 mb-2">A campanha</p>
            <dl className="space-y-1">
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Desafio</dt><dd className="text-right font-medium">{challenge.title}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Prémio</dt><dd className="text-right font-medium">{challenge.prize || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Formato</dt><dd className="text-right">{challenge.allowedMediaType === 'video' ? 'Vídeo' : challenge.allowedMediaType === 'photo' ? 'Foto' : 'Foto e vídeo'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Vence</dt><dd className="text-right">{challenge.voteGoal ? `1.º a ${challenge.voteGoal} votos ou mais votado no fim` : 'Mais votado no fim'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Público</dt><dd className="text-right">{report.minAge ? `Só ${report.minAge}+ (idade declarada${challenge.alcohol ? '; álcool' : ''})` : 'Todas as idades (13+)'}</dd></div>
              {report.reminders > 0 && (
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Pediram aviso antes do lançamento</dt><dd className="text-right font-medium">{formatNumber(report.reminders)}</dd></div>
              )}
            </dl>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-[8pt] uppercase tracking-wide text-gray-500 mb-2">Investimento e eficiência</p>
            {report.investment ? (
              <dl className="space-y-1">
                {report.investment.prizeValue > 0 && (
                  <>
                    <div className="flex justify-between gap-3"><dt className="text-gray-500">Campanha VotaSnap</dt><dd>{money(report.investment.fee)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-gray-500">Prémios (valor estimado)</dt><dd>{money(report.investment.prizeValue)}</dd></div>
                  </>
                )}
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Investimento{report.investment.prizeValue > 0 ? ' total' : ''}</dt><dd className="font-semibold">{money(report.investment.amount)}</dd></div>
                {report.investment.perAudience != null && <div className="flex justify-between gap-3"><dt className="text-gray-500">Custo por pessoa envolvida</dt><dd>{money(report.investment.perAudience)}</dd></div>}
                {report.investment.perParticipant != null && <div className="flex justify-between gap-3"><dt className="text-gray-500">Custo por participante</dt><dd>{money(report.investment.perParticipant)}</dd></div>}
                {report.investment.perVote != null && <div className="flex justify-between gap-3"><dt className="text-gray-500">Custo por voto</dt><dd>{money(report.investment.perVote)}</dd></div>}
                {report.investment.perLead != null && <div className="flex justify-between gap-3"><dt className="text-gray-500">Custo por contacto</dt><dd>{money(report.investment.perLead)}</dd></div>}
              </dl>
            ) : (
              <p className="text-gray-500">Sem valor de investimento registado para esta campanha.</p>
            )}
          </div>
        </div>

        <div className="mt-8 break-inside-avoid">
          <SectionTitle n={next()} hint="barras: votos · pontos: dias com novas publicações">Evolução diária</SectionTitle>
          <DailyChart daily={report.daily} />
        </div>
        <Footer company={company} />
      </Sheet>

      {/* ── Geografia e conteúdo ── */}
      <Sheet className="report-break">
        <SectionTitle n={next()} hint="quem publicou e quem votou">Alcance geográfico</SectionTitle>
        {report.provinces.length === 0 ? (
          <p className="text-gray-500 text-[9.5pt]">Sem audiência registada.</p>
        ) : (
          <table className="w-full text-[9pt]">
            <thead>
              <tr className="text-left text-gray-500 text-[8pt] uppercase tracking-wide">
                <th className="py-1.5 font-medium">Província</th>
                <th className="py-1.5 font-medium w-[45%]" />
                <th className="py-1.5 font-medium text-right">Participantes</th>
                <th className="py-1.5 font-medium text-right">Votantes</th>
                <th className="py-1.5 font-medium text-right">% audiência</th>
              </tr>
            </thead>
            <tbody>
              {report.provinces.map((p) => (
                <tr key={p.code} className="border-t border-gray-100 break-inside-avoid">
                  <td className="py-1.5 font-medium">{p.name}</td>
                  <td className="py-1.5 pr-3">
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-accent-600" style={{ width: `${(p.total / maxProvince) * 100}%` }} />
                    </div>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{p.participants}</td>
                  <td className="py-1.5 text-right tabular-nums">{p.voters}</td>
                  <td className="py-1.5 text-right tabular-nums">{pct(p.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-8 break-inside-avoid">
          <SectionTitle n={next()} hint="idade declarada na app; números agregados">Faixa etária</SectionTitle>
          {report.ages.audience.known === 0 ? (
            <p className="text-gray-500 text-[9.5pt]">Ainda sem idades declaradas para esta audiência.</p>
          ) : (
            <>
              <table className="w-full text-[9pt]">
                <thead>
                  <tr className="text-left text-gray-500 text-[8pt] uppercase tracking-wide">
                    <th className="py-1.5 font-medium">Idade</th>
                    <th className="py-1.5 font-medium w-[45%]" />
                    <th className="py-1.5 font-medium text-right">Participantes</th>
                    <th className="py-1.5 font-medium text-right">Audiência</th>
                    <th className="py-1.5 font-medium text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {report.ages.audience.bands.map((b, i) => (
                    <tr key={b.label} className="border-t border-gray-100">
                      <td className="py-1.5 font-medium">{b.label}</td>
                      <td className="py-1.5 pr-3">
                        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-accent-600" style={{ width: `${b.share * 100}%` }} />
                        </div>
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{report.ages.participants.bands[i].count}</td>
                      <td className="py-1.5 text-right tabular-nums">{b.count}</td>
                      <td className="py-1.5 text-right tabular-nums">{pct(b.share)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.ages.audience.unknown > 0 && (
                <p className="text-[8pt] text-gray-500 mt-1.5">
                  {formatNumber(report.ages.audience.unknown)} pessoa(s) sem idade declarada não entram nas percentagens.
                </p>
              )}
            </>
          )}
        </div>

        <div className="mt-8">
          <SectionTitle n={next()}>Vencedor e publicações mais votadas</SectionTitle>
          {report.winner && (
            <div className="flex items-center gap-4 border border-amber-300 bg-amber-50 rounded-lg p-3 mb-4 break-inside-avoid">
              {report.winner.mediaUrl && report.winner.mediaType !== 'video' && <img src={report.winner.mediaUrl} alt="" className="w-16 h-16 rounded-md object-cover" />}
              <div className="text-[9.5pt]">
                <p className="text-[8pt] uppercase tracking-wide text-amber-700 font-semibold">Vencedor</p>
                <p className="font-bold text-[12pt]">@{report.winner.username}</p>
                <p className="text-gray-600">{formatNumber(report.winner.votes)} votos · Prémio: {challenge.prize}</p>
              </div>
            </div>
          )}
          {report.prizes.some((p) => p.username) && (
            <table className="w-full text-[9pt] mb-4 break-inside-avoid">
              <thead>
                <tr className="text-left text-gray-500 text-[8pt] uppercase tracking-wide">
                  <th className="py-1.5 font-medium">Posição</th>
                  <th className="py-1.5 font-medium">Premiado</th>
                  <th className="py-1.5 font-medium">Prémio</th>
                  <th className="py-1.5 font-medium text-right">Entrega</th>
                </tr>
              </thead>
              <tbody>
                {report.prizes.map((p) => (
                  <tr key={p.place} className="border-t border-gray-100 align-middle">
                    <td className="py-1.5 font-semibold">{p.place}.º</td>
                    <td className="py-1.5">{p.username ? `@${p.username}` : '—'}</td>
                    <td className="py-1.5">{p.prize}</td>
                    <td className="py-1.5 text-right">
                      <span className="inline-flex items-center gap-2 justify-end">
                        {p.photoUrl && <img src={p.photoUrl} alt="" className="w-8 h-8 rounded object-cover" />}
                        {p.status === 'delivered'
                          ? `Entregue a ${fullDate(p.deliveredAt)}${p.idChecked ? ' · BI verificado' : ''}`
                          : p.status === 'forfeited' ? 'Não atribuído' : p.username ? 'Por entregar' : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {report.topEntries.length === 0 ? (
            <p className="text-gray-500 text-[9.5pt]">Ainda sem publicações.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {report.topEntries.map((e) => (
                <figure key={e.id} className="border border-gray-200 rounded-lg overflow-hidden break-inside-avoid">
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {e.mediaType === 'video' || !e.mediaUrl ? (
                      <div className="w-full h-full flex items-center justify-center text-gray-400"><Video className="w-7 h-7" /></div>
                    ) : (
                      <img src={e.mediaUrl} alt="" className="w-full h-full object-cover" />
                    )}
                    <span className="absolute top-1.5 left-1.5 text-[8pt] font-bold bg-white/90 text-gray-900 px-1.5 rounded">#{e.position}</span>
                  </div>
                  <figcaption className="p-2 text-[8.5pt]">
                    <p className="font-semibold truncate">@{e.username}</p>
                    <p className="text-brand-600 font-medium">{formatNumber(e.votes)} votos</p>
                    {e.caption && <p className="text-gray-500 text-[7.5pt] line-clamp-2">{e.caption}</p>}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
        <Footer company={company} />
      </Sheet>

      {/* ── Potenciais clientes ── */}
      <Sheet className="report-break">
        <SectionTitle n={next()} hint={`${k.leads} de ${k.participants} participantes`}>Potenciais clientes</SectionTitle>
        <p className="text-[9pt] text-gray-600 mb-4">
          Participantes que, ao publicar, aceitaram expressamente ser contactados por {brandName}. O nível de interesse
          reflecte o envolvimento na campanha (votos angariados). Os dados destinam-se apenas a contactos comerciais de {brandName} e
          não podem ser cedidos a terceiros.
        </p>
        {report.leads.length === 0 ? (
          <p className="text-gray-500 text-[9.5pt] border border-dashed border-gray-300 rounded-lg p-4">
            Nenhum participante autorizou ainda o contacto. O pedido de autorização aparece na app ao participar em desafios patrocinados.
          </p>
        ) : (
          <table className="w-full text-[8.5pt]">
            <thead>
              <tr className="text-left text-gray-500 text-[7.5pt] uppercase tracking-wide border-b border-gray-200">
                <th className="py-1.5 font-medium">Nome</th>
                <th className="py-1.5 font-medium">Utilizador</th>
                <th className="py-1.5 font-medium">Telefone</th>
                <th className="py-1.5 font-medium">Localização</th>
                <th className="py-1.5 font-medium text-right">Votos</th>
                <th className="py-1.5 font-medium text-right">Interesse</th>
              </tr>
            </thead>
            <tbody>
              {report.leads.map((l) => (
                <tr key={l.uid} className="border-b border-gray-100 break-inside-avoid">
                  <td className="py-1.5 font-medium">{l.name || '—'}</td>
                  <td className="py-1.5">@{l.username}</td>
                  <td className="py-1.5 tabular-nums">{phone(l.phone)}</td>
                  <td className="py-1.5">{[l.city, l.province].filter(Boolean).join(', ') || '—'}</td>
                  <td className="py-1.5 text-right tabular-nums">{l.votesReceived}</td>
                  <td className="py-1.5 text-right">
                    <span className={`px-1.5 py-0.5 rounded text-[7.5pt] font-semibold ${l.interest === 'Alto' ? 'bg-green-100 text-green-800' : l.interest === 'Médio' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>{l.interest}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-8">
          <SectionTitle n={next()} hint="sem dados de contacto">Todos os participantes</SectionTitle>
          {report.participants.length === 0 ? (
            <p className="text-gray-500 text-[9.5pt]">Sem participantes.</p>
          ) : (
            <table className="w-full text-[8.5pt]">
              <thead>
                <tr className="text-left text-gray-500 text-[7.5pt] uppercase tracking-wide border-b border-gray-200">
                  <th className="py-1.5 font-medium">#</th>
                  <th className="py-1.5 font-medium">Utilizador</th>
                  <th className="py-1.5 font-medium">Província</th>
                  <th className="py-1.5 font-medium">Publicou em</th>
                  <th className="py-1.5 font-medium text-right">Votos</th>
                  <th className="py-1.5 font-medium text-right">Novo na VotaSnap</th>
                </tr>
              </thead>
              <tbody>
                {report.participants.map((p) => (
                  <tr key={p.uid} className="border-b border-gray-100 break-inside-avoid">
                    <td className="py-1 text-gray-500">{p.position}</td>
                    <td className="py-1 font-medium">@{p.username}</td>
                    <td className="py-1">{p.province || '—'}</td>
                    <td className="py-1">{formatDate(p.firstAt)}</td>
                    <td className="py-1 text-right tabular-nums">{p.votesReceived}</td>
                    <td className="py-1 text-right">{p.isNewUser ? 'Sim' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Footer company={company} />
      </Sheet>

      {/* ── Notas e validação ── */}
      <Sheet className="report-break">
        <SectionTitle n={next()}>Metodologia e privacidade</SectionTitle>
        <ul className="text-[9pt] text-gray-700 space-y-1.5 list-disc pl-5">
          <li><b>Pessoas envolvidas</b>: utilizadores únicos que publicaram ou votaram no desafio. Cada pessoa conta uma vez.</li>
          <li><b>Votos</b>: um voto por conta verificada por número de telefone. Contas banidas e votos removidos pela moderação não contam.</li>
          <li><b>Novos utilizadores</b>: pessoas envolvidas cuja conta foi criada durante o período da campanha.</li>
          <li><b>Província</b>: indicada pelo próprio utilizador no perfil.</li>
          <li><b>Faixa etária</b>: a partir da data de nascimento declarada na app; só números agregados, sem datas individuais.{report.minAge ? ` Desafio restrito a ${report.minAge}+: não aparece a menores nem a quem não indicou a idade, e a idade do vencedor é confirmada com documento na entrega do prémio.` : ''}</li>
          <li><b>Contactos autorizados</b>: só constam participantes que aceitaram, na app, ser contactados por {brandName}. Os restantes aparecem apenas pelo nome de utilizador público.</li>
          <li><b>Custos por resultado</b>: investimento dividido pelo número de resultados; valores indicativos.</li>
          <li>Dados extraídos da plataforma VotaSnap a {fullDate(issuedAt)}{challenge.status === 'active' ? ', com a campanha ainda em curso' : ''}.</li>
        </ul>

        <div className="grid grid-cols-2 gap-10 mt-20 text-[9pt] break-inside-avoid">
          <div>
            <div className="border-t border-gray-400 pt-1.5">
              <p className="font-semibold">{company.legalName || company.name}</p>
              <p className="text-gray-500">{company.signatory || 'Assinatura e carimbo'}</p>
            </div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-1.5">
              <p className="font-semibold">{sponsorInfo.legalName || brandName}</p>
              <p className="text-gray-500">{sponsorInfo.contactName || 'Recebido por'}</p>
            </div>
          </div>
        </div>
        <Footer company={company} />
      </Sheet>
    </div>
  );
}
