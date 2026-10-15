import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, Video, Mic, Play, Pause, X, Download, Volume2,
  Film, Image as ImageIcon, ExternalLink, Sparkles, Plus, Clock
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

/**
 * Componente Player de Áudio Inline com barra de progresso e controle de velocidade (1x, 1.5x, 2x)
 */
export const InlineAudioPlayer = ({ src, duration: initialDuration = 0, title = 'Instrução em Áudio' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const cycleSpeed = () => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-2.5 sm:p-3 space-y-2">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20 active:scale-95 shrink-0 cursor-pointer"
            title={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <div className="min-w-0">
            <div className="text-[11px] font-black text-emerald-300 flex items-center space-x-1 truncate">
              <Mic className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">{title}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {fmt(currentTime)} / {fmt(duration || initialDuration || 0)}
            </div>
          </div>
        </div>

        {/* Speed button (1x, 1.5x, 2x) */}
        <button
          type="button"
          onClick={cycleSpeed}
          className="px-2 py-1 rounded-lg bg-slate-900 border border-emerald-500/30 text-emerald-400 text-[10px] font-black hover:bg-slate-800 transition-all cursor-pointer"
          title="Alternar velocidade de reprodução"
        >
          {playbackRate}x
        </button>
      </div>

      {/* Progress slider */}
      <input
        type="range"
        min={0}
        max={duration || initialDuration || 1}
        step={0.1}
        value={currentTime}
        onChange={handleSeek}
        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
      />
    </div>
  );
};

/**
 * Componente principal para visualizar mídias de um pedido (Fotos, Vídeos e Áudios)
 */
export const OrderMediaViewer = ({
  media = [],
  showInlineAudio = true,
  showThumbnails = true,
  maxInlinePhotos = 4,
  badgeOnly = false,
  className = ''
}) => {
  const [selectedMedia, setSelectedMedia] = useState(null);

  if (!media || media.length === 0) return null;

  const photos = media.filter((m) => m.type === 'image');
  const videos = media.filter((m) => m.type === 'video');
  const audios = media.filter((m) => m.type === 'audio');

  // Modo Badge Simplificado (apenas indicador compacto)
  if (badgeOnly) {
    return (
      <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-300 shadow-inner ${className}`}>
        <span>📎 {media.length}</span>
        {photos.length > 0 && <span title={`${photos.length} foto(s)`}>📸 {photos.length}</span>}
        {audios.length > 0 && <span title={`${audios.length} áudio(s)`}>🎙️ {audios.length}</span>}
        {videos.length > 0 && <span title={`${videos.length} vídeo(s)`}>🎥 {videos.length}</span>}
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* 1. SEÇÃO DE ÁUDIOS (Reprodução Inline Rápida) */}
      {showInlineAudio && audios.length > 0 && (
        <div className="space-y-2">
          {audios.map((audio, idx) => (
            <InlineAudioPlayer
              key={audio.id || idx}
              src={audio.url}
              duration={audio.duration || 0}
              title={audio.name || `Áudio do Pedido #${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* 2. SEÇÃO DE FOTOS E VÍDEOS */}
      {showThumbnails && (photos.length > 0 || videos.length > 0) && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            <span>Fotos & Vídeos do Pedido ({photos.length + videos.length})</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Fotos */}
            {photos.slice(0, maxInlinePhotos).map((photo, idx) => (
              <div
                key={photo.id || idx}
                onClick={() => setSelectedMedia(photo)}
                className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-amber-500 transition-all cursor-pointer shadow-md"
                title="Clique para ampliar foto"
              >
                <img
                  src={photo.url}
                  alt={photo.name || 'Foto do pedido'}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                  <span className="text-[9px] font-bold text-white truncate">Ampliar</span>
                </div>
              </div>
            ))}

            {/* Vídeos */}
            {videos.map((video, idx) => (
              <div
                key={video.id || idx}
                onClick={() => setSelectedMedia(video)}
                className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-blue-500/10 border border-blue-500/30 hover:border-blue-400 transition-all cursor-pointer flex flex-col items-center justify-center text-blue-400 hover:bg-blue-500/20 shadow-md"
                title="Clique para assistir vídeo"
              >
                <Film className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-black uppercase mt-1">Vídeo</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal de Foto ou Vídeo em Tela Cheia */}
      {selectedMedia && (
        <div
          onClick={() => setSelectedMedia(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 min-w-0">
                {selectedMedia.type === 'image' ? (
                  <ImageIcon className="w-5 h-5 text-amber-400 shrink-0" />
                ) : (
                  <Film className="w-5 h-5 text-blue-400 shrink-0" />
                )}
                <h3 className="text-sm font-black text-white truncate">
                  {selectedMedia.name || (selectedMedia.type === 'image' ? 'Foto Anexada' : 'Vídeo Anexado')}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMedia(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Media Body */}
            <div className="rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[70vh]">
              {selectedMedia.type === 'image' ? (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.name}
                  className="max-h-[68vh] w-auto object-contain rounded-xl"
                />
              ) : (
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  className="max-h-[68vh] w-full object-contain rounded-xl"
                />
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-slate-400">
                {selectedMedia.createdAt && `Enviado em: ${formatDateTime(selectedMedia.createdAt)}`}
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={selectedMedia.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Arquivo</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
