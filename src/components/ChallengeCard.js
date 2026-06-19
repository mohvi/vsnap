import { ArrowRight, Trophy, Users, Clock, Camera, Sparkles, Flame } from "lucide-react";


const ChallengeCard = ({ 
  title, 
  description, 
  prize, 
  bannerUrl,
  participants = 0,
  endDate,
  entryFee = 0 
}) => {
  
  // Calcular tempo restante
  const getTimeRemaining = (endTime) => {
    if (!endTime) return null;
    
    const now = Date.now();
    const remaining = endTime - now;
    
    if (remaining <= 0) return 'Encerrado';
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h restantes`;
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/90 via-purple-800/90 to-pink-800/90 p-0.5 shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-purple-500/25">
      
      {/* Camada interna com blur e bordas brilhantes */}
      <div className="relative h-full w-full rounded-2xl bg-slate-900/95 backdrop-blur-sm overflow-hidden border border-white/10 group-hover:border-purple-400/50 transition-all">
        
        {/* Padrão de fundo sutil - CORRIGIDO */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }} />
        
        {/* Efeito de brilho no hover */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500 -z-10"></div>
        
        <div className="relative z-10 p-5">
        

          {/* Área principal com imagem e título lado a lado */}
          <div className="flex gap-4 mb-4">
            {/* Thumbnail de imagem com efeito polaroid */}
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl opacity-70 group-hover:opacity-100 blur-md transition-opacity"></div>
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
                <img 
                  src={bannerUrl} 
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {/* Overlay com ícone de câmera no hover */}
                <div className="absolute inset-0 bg-purple-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Título e descrição */}
            <div className="flex-1">
              <h3 className="text-xl font-black text-white mb-1 line-clamp-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-300 group-hover:to-pink-300 transition-all">
                {title}
              </h3>
              <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
          
          {/* Estatísticas e tempo */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Participantes */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
              <div className="p-1.5 bg-purple-500/20 rounded-lg">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <span className="text-sm font-bold text-white">{participants.toLocaleString()}</span>
              </div>
            </div>

            {/* Tempo restante */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
              <div className="p-1.5 bg-amber-500/20 rounded-lg">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Encerra em</span>
                <span className="text-sm font-mono font-bold text-white">{prize}</span>
              </div>
            </div>
          </div>

          {/* Botão de ação com efeito chamativo */}
          <button className="group/btn relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 p-0.5 shadow-xl shadow-purple-500/30 transition-all hover:shadow-2xl hover:shadow-purple-500/50">
            <div className="relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3.5 text-sm font-black text-white transition-all group-hover/btn:scale-105">
              <span className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></span>
              <Sparkles className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{prize} PARTICIPAR</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeCard;