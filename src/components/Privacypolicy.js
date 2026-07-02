import React from 'react';
import {
  Sparkles, Shield, Database, Eye, Server, Share2, Clock,
  UserCheck, ShieldCheck, Lock, RefreshCw, Mail, MapPin,
  Phone, Instagram, ArrowLeft, ExternalLink
} from 'lucide-react';

// ============================================================
// CONFIGURAÇÃO — dados da empresa/developer
// Centralizado aqui para ser fácil de atualizar no futuro.
// ============================================================
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

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0A0A12] text-white font-sans antialiased">
      {/* Efeitos de brilho de fundo — mesmo estilo do Sidebar */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-5 md:px-8 pb-24">

        {/* TOPO / VOLTAR */}
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

        {/* SECÇÕES */}
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
              <DataRow
                category="Conta"
                data="Número de telefone (autenticação)"
                purpose="Criar e proteger a tua conta"
              />
              <DataRow
                category="Perfil"
                data="Nome, username, biografia, foto de perfil"
                purpose="Identificar-te na comunidade"
              />
              <DataRow
                category="Localização geral"
                data="Província e cidade/distrito (seleção manual, sem GPS)"
                purpose="Contexto de participação regional"
              />
              <DataRow
                category="Conteúdo"
                data="Fotos e vídeos submetidos, legendas"
                purpose="Participar nos desafios e aparecer no feed"
              />
              <DataRow
                category="Atividade"
                data="Votos dados/recebidos, desafios, denúncias"
                purpose="Funcionamento da votação e moderação"
              />
              <DataRow
                category="Dispositivo"
                data="Token de notificações push"
                purpose="Notificações e deteção de contas duplicadas"
              />
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
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs font-medium mt-4 transition-colors"
            >
              Política de Privacidade da Google
              <ExternalLink className="w-3 h-3" />
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

          <SectionCard id="alteracoes" icon={RefreshCw} iconColor="from-blue-600 to-cyan-500" title="10. Alterações a esta política">
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
              <h2 className="text-white text-lg font-semibold tracking-tight">11. Contacto</h2>
            </div>
            <p className="text-gray-400 text-sm mb-5">
              Para dúvidas sobre esta política ou sobre os teus dados no VotaSnap:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                <Mail className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Email</p>
                  <a href={`mailto:${CONTACT.email}`} className="text-white text-sm font-medium hover:text-purple-300">
                    {CONTACT.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                <Phone className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Telefone</p>
                  <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`} className="text-white text-sm font-medium hover:text-purple-300">
                    {CONTACT.phone}
                  </a>
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
                  <a
                    href={`https://instagram.com/${CONTACT.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white text-sm font-medium hover:text-purple-300"
                  >
                    @{CONTACT.instagram}
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
        {/* FOOTER */}
        <p className="text-center text-gray-600 text-xs mt-10">
          VotaSnap — Política de Privacidade. Documento gerado para cumprir os requisitos de
          transparência de dados da Google Play Store.
        </p>
      </div>
    </div>
  );
}