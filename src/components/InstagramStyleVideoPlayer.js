import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const InstagramStyleVideoPlayer = ({ url, thumbnailUrl }) => {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false); // Changed from true to false
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef(null);

  // Atualiza o estado de reprodução quando o vídeo é pausado/playado
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleTimeUpdate = () => {
      setProgress(video.currentTime / video.duration || 0);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  // Esconde controles após 3 segundos de inatividade
  useEffect(() => {
    if (playing) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(controlsTimeout.current);
  }, [playing, showControls]);

  const togglePlay = () => {
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setShowControls(true);
  };

  const toggleMute = () => {
    videoRef.current.muted = !muted;
    setMuted(!muted);
    setShowControls(true);
  };

  const handleSeek = (e) => {
    const rect = e.target.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
    setProgress(pos);
    setShowControls(true);
  };

  const handleVideoClick = () => {
    togglePlay();
  };

  return (
    <div 
      className="relative w-full h-full bg-black rounded-lg overflow-hidden"
      onMouseMove={() => setShowControls(true)}
    >
      {/* Elemento de vídeo nativo */}
      <video
        ref={videoRef}
        src={url}
        poster={thumbnailUrl}
        playsInline
        loop
        muted={muted}
        className="w-full h-full object-contain"
        onClick={handleVideoClick}
      />

      {/* Overlay de controles personalizados */}
      {showControls && (
        <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/70 to-transparent">
          {/* Barra de progresso */}
          <div 
            className="w-full h-1.5 bg-gray-600/50 rounded-full cursor-pointer relative"
            onClick={(e) => {
              e.stopPropagation();
              handleSeek(e);
            }}
          >
            <div 
              className="h-full bg-white rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          
          {/* Controles inferiores */}
          <div 
            className="flex justify-between items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={togglePlay}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              {playing ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <button 
              onClick={toggleMute}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          </div>
        </div>
      )}

      {/* Botão de play inicial */}
      {!playing && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={togglePlay}
            className="p-4 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <Play size={48} />
          </button>
        </div>
      )}
    </div>
  );
};

export default InstagramStyleVideoPlayer;