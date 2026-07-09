import React from 'react';
import {
  Sparkles, Shield, Database, Eye, Server, Share2, Clock,
  UserCheck, ShieldCheck, Lock, RefreshCw, Mail, MapPin,
  Phone, Instagram, ExternalLink, CheckCircle2, XCircle,
  AlertTriangle, Wifi, HardDrive, Trash2, Baby, FileCheck,
} from 'lucide-react';

const CONTACT = {
  developer: 'Mohammad Vicente Saide',
  handle: '@Mohvi',
  instagram: 'eu.mohvi',
  phone: '+258 84 023 7100',
  email: 'geral@votasnap.com',
  city: 'Pemba, Cabo Delgado, Moçambique',
  lastUpdated: '2 de julho de 2026',
};

const SECTIONS = [
  { id: 'quem-somos', label: 'Quem somos' },
  { id: 'dados', label: 'Dados que recolhemos' },
  { id: 'uso', label: 'Como usamos' },
  { id: 'terceiros', label: 'Serviços de terceiros' },
  { id: 'partilha', label: 'Partilha de dados' },
  { id: 'retencao', label: 'Retenção' },
  { id: 'direitos', label: 'Os teus direitos' },
  { id: 'menores', label: 'Privacidade de menores' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'play-safety', label: 'Play Store Safety' },
  { id: 'alteracoes', label: 'Alterações' },
  { id: 'contacto', label: 'Contacto' },
];

function SectionCard({ id, icon: Icon, iconColor, title, children }) {
  return (
    <section
      id={id}
      className="bg-[#14141F] border border-white/5 rounded-2xl p-6 md:p-7 scroll-mt-24"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${iconColor} bg-opacity-10`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-white text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="text-gray-400 text-sm leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function DataRow({ category, data, purpose }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 py-3 border-b border-white/5 last:border-none">
      <p className="text-white text-sm font-medium">{category}</p>
      <p className="text-gray-400 text-sm md:col-span-1">{data}</p>
      <p className="text-gray-500 text-xs md:text-sm">{purpose}</p>
    </div>
  );
}

// ── Componente para o resumo de Segurança da Play Store ──
// Replica o formato do painel "Segurança dos dados" que o Google mostra
// na página da app na Play Store, para que os utilizadores reconheçam.
function SafetyRow({ icon: Icon, iconColor, label, yes, detail }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-none">
      <div className={`p-2 rounded-lg ${iconColor} flex-shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white text-sm font-medium">{label}</span>
          {yes === true && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
          {yes === false && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
          {yes === 'partial' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
        </div>
        <p className="text-gray-500 text-xs leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

// Tabela de tipos de dados no formato exato que o Google Play usa
// na secção "Segurança dos dados" da ficha da app.
const PLAY_DATA_TYPES = [
  {
    category: 'Informações pessoais',
    items: [
      { name: 'Número de telefone', collected: true, shared: false, encrypted: true, deletable: true, required: true },
      { name: 'Nome e username', collected: true, shared: false, encrypted: false, deletable: true, required: true },
      { name: 'Foto de perfil', collected: true, shared: false, encrypted: false, deletable: true, required: false },
      { name: 'Biografia', collected: true, shared: false, encrypted: false, deletable: true, required: false },
    ],
  },
  {
    category: 'Informações de localização',
    items: [
      { name: 'Localização aproximada (província/cidade)', collected: true, shared: false, encrypted: false, deletable: true, required: true },
    ],
  },
  {
    category: 'Conteúdo do utilizador',
    items: [
      { name: 'Fotos e vídeos', collected: true, shared: false, encrypted: false, deletable: true, required: false },
      { name: 'Legendas e comentários', collected: true, shared: false, encrypted: false, deletable: true, required: false },
    ],
  },
  {
    category: 'Atividade na app',
    items: [
      { name: 'Votos dados e recebidos', collected: true, shared: false, encrypted: false, deletable: true, required: true },
      { name: 'Desafios em que participou', collected: true, shared: false, encrypted: false, deletable: true, required: true },
      { name: 'Denúncias submetidas', collected: true, shared: false, encrypted: false, deletable: true, required: false },
    ],
  },
  {
    category: 'Identificadores de dispositivo',
    items: [
      { name: 'Token de notificações push (Expo)', collected: true, shared: false, encrypted: false, deletable: true, required: false },
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0A0A12] text-white font-sans antialiased">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-5 md:px-8 pb-24">

        {/* TOPO */}
        <div className="flex items-center justify-between pt-8 pb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-tight">
              Vota<span className="text-purple-400">Snap</span>
            </span>
          </div>
        </div>

        {/* HERO */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600/10 border border-purple-500/20 mb-4">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
              Transparência de dados
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
            Política de Privacidade
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-2xl leading-relaxed">
            Como o VotaSnap recolhe, usa e protege os teus dados. Escrita em linguagem simples,
            sem letras miúdas escondidas.
          </p>
          <p className="text-gray-500 text-xs mt-3">
            Última atualização: <span className="text-gray-300 font-medium">{CONTACT.lastUpdated}</span>
          </p>
        </div>

        {/* NAVEGAÇÃO RÁPIDA */}
        <div className="flex flex-wrap gap-2 mb-10">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:border-purple-500/30 hover:bg-purple-600/10 transition-all duration-200"
            >
              {s.label}
            </a>
          ))}
        </div>

        <div className="space-y-5">

          <SectionCard id="quem-somos" icon={UserCheck} iconColor="from-purple-600 to-pink-600" title="1. Quem somos">
            <p>
              O VotaSnap é uma aplicação móvel de participação em desafios por voto da comunidade,
              desenvolvida por <strong className="text-white">{CONTACT.developer}</strong> ({CONTACT.handle}).
            </p>
            <p>
              Esta política explica que dados pessoais recolhemos através da app, para que servem,
              e que controlo tens sobre eles. Ao criar uma conta ou usar o VotaSnap, aceitas as
              práticas descritas aqui.
            </p>
          </SectionCard>

          <SectionCard id="dados" icon={Database} iconColor="from-blue-600 to-cyan-500" title="2. Dados que recolhemos">
            <p className="mb-2">
              Recolhemos apenas os dados necessários para o funcionamento da app — participação em
              desafios, votação e comunidade.
            </p>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 mt-4">
              <div className="hidden md:grid grid-cols-3 gap-4 py-3 border-b border-white/5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                <span>Categoria</span>
                <span>Dados</span>
                <span>Finalidade</span>
              </div>
              <DataRow category="Conta" data="Número de telefone (autenticação)" purpose="Criar e proteger a tua conta" />
              <DataRow category="Perfil" data="Nome, username, biografia, foto de perfil" purpose="Identificar-te na comunidade" />
              <DataRow category="Localização geral" data="Província e cidade/distrito (seleção manual, sem GPS)" purpose="Contexto de participação regional" />
              <DataRow category="Conteúdo" data="Fotos e vídeos submetidos, legendas" purpose="Participar nos desafios e aparecer no feed" />
              <DataRow category="Atividade" data="Votos dados/recebidos, desafios, denúncias" purpose="Funcionamento da votação e moderação" />
              <DataRow category="Dispositivo" data="Token de notificações push" purpose="Notificações e deteção de contas duplicadas" />
            </div>
            <p className="text-xs text-gray-500 mt-4 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              Não recolhemos localização GPS precisa nem dados de pagamento diretamente na app.
              Não usamos SDKs de publicidade nem partilhamos dados com anunciantes.
            </p>
          </SectionCard>

          <SectionCard id="uso" icon={Eye} iconColor="from-green-500 to-emerald-500" title="3. Como usamos os teus dados">
            <ul className="space-y-2 list-none">
              {[
                'Criar e manter a tua conta e perfil público dentro da app',
                'Mostrar as tuas participações no feed e permitir votação por outros utilizadores',
                'Calcular e apresentar vencedores de desafios',
                'Enviar notificações relevantes (ex: alguém votou na tua participação)',
                'Prevenir fraude e abuso, incluindo deteção de múltiplas contas no mesmo dispositivo — usada só para sinalização interna, nunca bloqueio automático',
                'Rever denúncias de conteúdo e aplicar as regras da comunidade',
                'Melhorar a estabilidade e o desempenho da app',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="terceiros" icon={Server} iconColor="from-yellow-500 to-orange-500" title="4. Serviços de terceiros">
            <p>
              O VotaSnap é construído sobre o <strong className="text-white">Firebase</strong>, um
              conjunto de serviços de backend da Google, usado para autenticação, base de dados em
              tempo real, armazenamento de ficheiros e notificações push. Estes dados são processados
              em servidores geridos pela Google.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 mt-4">
              {[
                ['Firebase Authentication', 'Login por número de telefone'],
                ['Realtime Database', 'Perfis, desafios, votos, denúncias'],
                ['Firebase Storage', 'Fotos, vídeos e avatares'],
                ['Cloud Messaging', 'Notificações push'],
              ].map(([name, desc]) => (
                <div key={name} className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2.5">
                  <p className="text-white text-xs font-semibold">{name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs font-medium mt-4 transition-colors">
              Política de Privacidade da Google <ExternalLink className="w-3 h-3" />
            </a>
          </SectionCard>

          <SectionCard id="partilha" icon={Share2} iconColor="from-pink-600 to-purple-600" title="5. Partilha de dados">
            <p className="mb-2">Não vendemos os teus dados pessoais. Só partilhamos dados nestas situações:</p>
            <ul className="space-y-2 list-none">
              {[
                'Com o Firebase/Google, como processador técnico necessário ao funcionamento da app',
                'Quando exigido por lei, ordem judicial, ou para proteger direitos e segurança do VotaSnap e dos seus utilizadores',
                'Conteúdo que publicas (nome, username, avatar, fotos/vídeos, votos recebidos) é visível publicamente para outros utilizadores, por ser o propósito central da votação em comunidade',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="retencao" icon={Clock} iconColor="from-cyan-500 to-blue-500" title="6. Retenção de dados">
            <p>
              Mantemos os teus dados enquanto a tua conta estiver ativa. Se pedires a eliminação da
              conta, removemos os teus dados de perfil e conteúdo associado dentro de um prazo
              razoável, exceto onde a lei exigir retenção adicional (ex: registos para prevenção de
              fraude).
            </p>
          </SectionCard>

          <SectionCard id="direitos" icon={UserCheck} iconColor="from-purple-600 to-pink-600" title="7. Os teus direitos">
            <p className="mb-2">Tens o direito de:</p>
            <ul className="space-y-2 list-none mb-3">
              {[
                'Aceder aos dados que temos sobre ti',
                'Corrigir informação incorreta do teu perfil, diretamente na app (Perfil → Editar perfil)',
                'Pedir a eliminação da tua conta e dados associados',
                'Retirar o consentimento para notificações push, nas definições do teu dispositivo',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              Para exercer qualquer um destes direitos, contacta-nos através de{' '}
              <a href={`mailto:${CONTACT.email}`} className="text-purple-400 hover:text-purple-300 font-medium">
                {CONTACT.email}
              </a>.
            </p>
          </SectionCard>

          <SectionCard id="menores" icon={ShieldCheck} iconColor="from-green-500 to-emerald-500" title="8. Privacidade de menores">
            <p>
              O VotaSnap exige que os utilizadores tenham pelo menos 13 anos de idade, confirmado no
              momento da criação do perfil. Não recolhemos intencionalmente dados de crianças menores
              de 13 anos. Se tomarmos conhecimento de uma conta pertencente a uma criança abaixo desta
              idade, a conta e os dados associados serão removidos.
            </p>
          </SectionCard>

          <SectionCard id="seguranca" icon={Lock} iconColor="from-red-500 to-orange-500" title="9. Segurança">
            <p>
              Usamos as proteções de segurança fornecidas pelo Firebase (regras de acesso à base de
              dados e armazenamento, autenticação segura) para proteger os teus dados contra acesso
              não autorizado. Nenhum sistema é 100% seguro — recomendamos que não partilhes a tua
              conta com terceiros.
            </p>
          </SectionCard>

          {/* ═══════════════════════════════════════════════════════════
              NOVA SECÇÃO — NORMAS DE SEGURANÇA DA GOOGLE PLAY STORE
              Replica o formato da secção "Segurança dos dados" que aparece
              na ficha da app na Play Store e que o Google exige documentar.
          ═══════════════════════════════════════════════════════════ */}
          <section id="play-safety" className="scroll-mt-24">
            {/* Header da secção */}
            <div className="bg-[#14141F] border border-white/5 rounded-2xl p-6 md:p-7 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-white text-lg font-semibold tracking-tight">
                  10. Segurança dos dados — Google Play Store
                </h2>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mt-3">
                Esta secção apresenta as práticas de segurança e privacidade do VotaSnap no
                formato exigido pela Google Play para a ficha da app. Responde às perguntas do
                formulário "Segurança dos dados" da Play Console.
              </p>
            </div>

            {/* Resumo de práticas — formato visual igual ao painel da Play Store */}
            <div className="bg-[#14141F] border border-white/5 rounded-2xl p-6 md:p-7 mb-4">
              <h3 className="text-white text-base font-semibold mb-4">Resumo de práticas de privacidade</h3>
              <div>
                <SafetyRow
                  icon={Wifi}
                  iconColor="bg-blue-500/10 text-blue-400"
                  label="Dados encriptados em trânsito"
                  yes={true}
                  detail="Toda a comunicação entre a app e o Firebase usa HTTPS/TLS. Os dados nunca viajam em texto simples."
                />
                <SafetyRow
                  icon={Trash2}
                  iconColor="bg-red-500/10 text-red-400"
                  label="Podes pedir a eliminação dos teus dados"
                  yes={true}
                  detail="Podes solicitar a eliminação da conta e de todos os dados associados por email para geral@votasnap.com. A eliminação é processada num prazo razoável."
                />
                <SafetyRow
                  icon={Share2}
                  iconColor="bg-amber-500/10 text-amber-400"
                  label="Dados partilhados com terceiros"
                  yes={false}
                  detail="Não partilhamos dados pessoais com terceiros para fins de publicidade, análise de marketing ou revenda. O Firebase (Google) é o único processador técnico."
                />
                <SafetyRow
                  icon={Database}
                  iconColor="bg-purple-500/10 text-purple-400"
                  label="Dados recolhidos"
                  yes={true}
                  detail="Recolhemos dados necessários ao funcionamento: conta, perfil, conteúdo, atividade e identificador de dispositivo para notificações. Ver tabela completa abaixo."
                />
                <SafetyRow
                  icon={Baby}
                  iconColor="bg-green-500/10 text-green-400"
                  label="Conformidade com política de famílias"
                  yes={'partial'}
                  detail="A app é classificada para maiores de 13 anos. Verificamos a confirmação de idade no registo. Não é direcionada a crianças e não contém publicidade nem compras integradas."
                />
                <SafetyRow
                  icon={ShieldCheck}
                  iconColor="bg-teal-500/10 text-teal-400"
                  label="Revisão de segurança independente"
                  yes={false}
                  detail="A app ainda não foi submetida a auditoria de segurança independente. Está planeada para uma versão futura antes da expansão nacional."
                />
              </div>
            </div>

            {/* Tabela detalhada de tipos de dados — formato da Play Console */}
            <div className="bg-[#14141F] border border-white/5 rounded-2xl p-6 md:p-7 mb-4">
              <h3 className="text-white text-base font-semibold mb-1">Tipos de dados recolhidos</h3>
              <p className="text-gray-500 text-xs mb-5">
                Formato correspondente ao formulário "Segurança dos dados" da Google Play Console.
              </p>
              {/* Legenda */}
              <div className="flex flex-wrap gap-3 mb-5 text-xs text-gray-500">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400"/>Sim</span>
                <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400"/>Não</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 pr-4 text-gray-500 font-medium w-44">Tipo de dado</th>
                      <th className="text-center py-2 px-2 text-gray-500 font-medium w-20">Recolhido</th>
                      <th className="text-center py-2 px-2 text-gray-500 font-medium w-20">Partilhado</th>
                      <th className="text-center py-2 px-2 text-gray-500 font-medium w-20">Encriptado</th>
                      <th className="text-center py-2 px-2 text-gray-500 font-medium w-20">Eliminável</th>
                      <th className="text-center py-2 px-2 text-gray-500 font-medium w-20">Obrigatório</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLAY_DATA_TYPES.map((group) => (
                      <React.Fragment key={group.category}>
                        <tr>
                          <td colSpan={6} className="pt-4 pb-1">
                            <span className="text-purple-400 font-semibold uppercase tracking-wider text-[10px]">
                              {group.category}
                            </span>
                          </td>
                        </tr>
                        {group.items.map((item) => (
                          <tr key={item.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                            <td className="py-2.5 pr-4 text-gray-300 font-medium">{item.name}</td>
                            <td className="py-2.5 px-2 text-center">{item.collected ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mx-auto"/> : <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto"/>}</td>
                            <td className="py-2.5 px-2 text-center">{item.shared ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mx-auto"/> : <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto"/>}</td>
                            <td className="py-2.5 px-2 text-center">{item.encrypted ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mx-auto"/> : <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto"/>}</td>
                            <td className="py-2.5 px-2 text-center">{item.deletable ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mx-auto"/> : <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto"/>}</td>
                            <td className="py-2.5 px-2 text-center">{item.required ? <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 mx-auto"/> : <XCircle className="w-3.5 h-3.5 text-gray-600 mx-auto"/>}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Finalidades de recolha — campo obrigatório na Play Console */}
            <div className="bg-[#14141F] border border-white/5 rounded-2xl p-6 md:p-7 mb-4">
              <h3 className="text-white text-base font-semibold mb-4">Finalidades de recolha declaradas</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: 'Funcionalidades da app', desc: 'Autenticação, perfil, feed, votação e desafios', color: 'border-l-purple-500' },
                  { label: 'Prevenção de fraude', desc: 'Deteção de contas duplicadas e votos suspeitos', color: 'border-l-red-500' },
                  { label: 'Notificações', desc: 'Alertas de votos, vencedores e novos desafios', color: 'border-l-blue-500' },
                  { label: 'Moderação de conteúdo', desc: 'Revisão de denúncias e aplicação de regras da comunidade', color: 'border-l-amber-500' },
                ].map((item) => (
                  <div key={item.label} className={`bg-white/[0.03] border border-white/5 border-l-2 ${item.color} rounded-lg px-4 py-3`}>
                    <p className="text-white text-xs font-semibold mb-1">{item.label}</p>
                    <p className="text-gray-500 text-xs">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Como pedir eliminação de dados — URL obrigatório na Play Console */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 md:p-7">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white text-base font-semibold mb-2">
                    Como pedir a eliminação dos teus dados
                  </h3>
                  <p className="text-gray-400 text-sm mb-3 leading-relaxed">
                    A Google Play exige que as apps com contas de utilizador ofereçam um mecanismo
                    claro de eliminação de dados. No VotaSnap, podes:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold flex-shrink-0">1.</span>
                      <span>Enviar email para <a href="mailto:geral@votasnap.com" className="text-amber-400 hover:text-amber-300 font-medium">geral@votasnap.com</a> com o assunto <strong className="text-white">"Eliminar conta"</strong> e o teu username. Processamos em até 30 dias.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold flex-shrink-0">2.</span>
                      <span>Ao eliminar, removemos: perfil, conteúdo publicado, votos, histórico de snaps e dados de sessão. Podemos reter registos de segurança e fraude por até 90 dias adicionais.</span>
                    </li>
                  </ul>
                  <div className="mt-4 p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">URL de eliminação de conta (para a Play Console)</p>
                    <code className="text-purple-400 text-xs">mailto:geral@votasnap.com?subject=Eliminar%20conta</code>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <SectionCard id="alteracoes" icon={RefreshCw} iconColor="from-blue-600 to-cyan-500" title="11. Alterações a esta política">
            <p>
              Podemos atualizar esta política periodicamente para refletir mudanças na app ou em
              requisitos legais. Alterações significativas serão comunicadas dentro da app ou por
              notificação. A data no topo desta página indica a versão mais recente.
            </p>
          </SectionCard>

          {/* CONTACTO */}
          <section id="contacto" className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-2xl p-6 md:p-7 scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-white text-lg font-semibold tracking-tight">12. Contacto</h2>
            </div>
            <p className="text-gray-400 text-sm mb-5">
              Para dúvidas sobre esta política ou sobre os teus dados no VotaSnap:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                <Mail className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Email</p>
                  <a href={`mailto:${CONTACT.email}`} className="text-white text-sm font-medium hover:text-purple-300">{CONTACT.email}</a>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                <Phone className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Telefone</p>
                  <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`} className="text-white text-sm font-medium hover:text-purple-300">{CONTACT.phone}</a>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                <UserCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Desenvolvedor</p>
                  <p className="text-white text-sm font-medium">{CONTACT.developer}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                <MapPin className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Localização</p>
                  <p className="text-white text-sm font-medium">{CONTACT.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 sm:col-span-2">
                <Instagram className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Instagram</p>
                  <a href={`https://instagram.com/${CONTACT.instagram}`} target="_blank" rel="noopener noreferrer"
                    className="text-white text-sm font-medium hover:text-purple-300">@{CONTACT.instagram}</a>
                </div>
              </div>
            </div>
          </section>
        </div>

        <p className="text-center text-gray-600 text-xs mt-10">
          VotaSnap — Política de Privacidade. Documento gerado para cumprir os requisitos de
          transparência de dados da Google Play Store, incluindo a secção obrigatória "Segurança dos dados".
        </p>
      </div>
    </div>
  );
}