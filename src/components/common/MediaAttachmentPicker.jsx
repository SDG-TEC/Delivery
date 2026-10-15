import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, Video, Mic, Square, Trash2, Play, Pause,
  Upload, Loader2, X, Image as ImageIcon, Volume2, Film, CheckCircle2, AlertCircle
} from 'lucide-react';
import { uploadMediaToSupabase, VoiceRecorder } from '../../services/storageService';

/**
 * Componente moderno para gravação de áudio e seleção de fotos e vídeos,
 * seguindo a mesma lógica limpa e design escuro (Tailwind) do sistema.
 */
export const MediaAttachmentPicker = ({
  mediaList = [],
  onChange,
  folder = 'orders',
  title = 'Anexar Foto, Vídeo ou Áudio',
  subtitle = 'Comprovante PIX, fotos, gravação de voz com instruções ou vídeo curto',
  compact = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewMedia, setPreviewMedia] = useState(null);

  // Player de áudio interno para testes
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const audioElementsRef = useRef({});

  // Referência do gravador de voz
  const recorderRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Inputs de arquivos
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recorderRef.current) recorderRef.current.cancel();
    };
  }, []);

  // Formatador de segundos (00:00)
  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. UPLOAD DE IMAGEM / FOTO
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgressText('Otimizando e enviando foto...');
    setErrorMsg('');

    try {
      const res = await uploadMediaToSupabase(file, { folder, maxDim: 1280 });
      if (res.url) {
        const newMedia = {
          id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'image',
          url: res.url,
          name: file.name || 'Foto Anexada',
          size: res.size || file.size,
          isFallback: res.isFallback || false,
          createdAt: new Date().toISOString()
        };
        onChange?.([...mediaList, newMedia]);
      } else {
        setErrorMsg(res.error || 'Falha ao enviar foto.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Erro no envio da foto.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // 2. UPLOAD DE VÍDEO
  const handleVideoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgressText('Enviando vídeo...');
    setErrorMsg('');

    try {
      const res = await uploadMediaToSupabase(file, { folder });
      if (res.url) {
        const newMedia = {
          id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'video',
          url: res.url,
          name: file.name || 'Vídeo Anexado',
          size: res.size || file.size,
          isFallback: res.isFallback || false,
          createdAt: new Date().toISOString()
        };
        onChange?.([...mediaList, newMedia]);
      } else {
        setErrorMsg(res.error || 'Falha ao enviar vídeo.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Erro no envio do vídeo.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  // 3. UPLOAD DE ARQUIVO DE ÁUDIO MANUAL
  const handleAudioSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgressText('Enviando arquivo de áudio...');
    setErrorMsg('');

    try {
      const res = await uploadMediaToSupabase(file, { folder });
      if (res.url) {
        const newMedia = {
          id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'audio',
          url: res.url,
          name: file.name || 'Áudio Gravado',
          size: res.size || file.size,
          isFallback: res.isFallback || false,
          createdAt: new Date().toISOString()
        };
        onChange?.([...mediaList, newMedia]);
      } else {
        setErrorMsg(res.error || 'Falha ao enviar áudio.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Erro no envio do áudio.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  // 4. GRAVAÇÃO DE VOZ AO VIVO
  const startRecording = async () => {
    setErrorMsg('');
    try {
      const recorder = new VoiceRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || 'Não foi possível acessar o microfone.');
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const stopAndSaveRecording = async () => {
    if (!recorderRef.current) return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    setIsUploading(true);
    setUploadProgressText('Processando gravação de áudio...');
    setErrorMsg('');

    try {
      const { blob, duration } = await recorderRef.current.stop();
      recorderRef.current = null;
      setIsRecording(false);

      const filename = `audio_gravado_${Date.now()}`;
      const res = await uploadMediaToSupabase(blob, {
        folder: `${folder}/audio`,
        duration,
        filename
      });

      if (res.url) {
        const newMedia = {
          id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: 'audio',
          url: res.url,
          name: `Áudio (${formatSeconds(duration)})`,
          duration,
          size: res.size || blob.size,
          isFallback: res.isFallback || false,
          createdAt: new Date().toISOString()
        };
        onChange?.([...mediaList, newMedia]);
      } else {
        setErrorMsg(res.error || 'Falha ao salvar áudio gravado.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao finalizar gravação de áudio.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      setRecordingSeconds(0);
    }
  };

  // Remover mídia
  const handleRemove = (mediaId) => {
    const updated = mediaList.filter((m) => m.id !== mediaId);
    onChange?.(updated);
  };

  // Play / Pause de áudio rápido na lista
  const togglePlayAudio = (id, url) => {
    let audio = audioElementsRef.current[id];
    if (!audio) {
      audio = new Audio(url);
      audioElementsRef.current[id] = audio;
      audio.onended = () => setPlayingAudioId(null);
    }

    if (playingAudioId === id) {
      audio.pause();
      setPlayingAudioId(null);
    } else {
      // Pausa qualquer outro áudio tocando
      Object.entries(audioElementsRef.current).forEach(([k, a]) => {
        if (k !== id) a.pause();
      });
      audio.play().catch(() => {});
      setPlayingAudioId(id);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/mp4,video/webm,video/quicktime,video/*"
        onChange={handleVideoSelect}
        className="hidden"
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*"
        onChange={handleAudioSelect}
        className="hidden"
      />

      {/* Header (se não for compacto) */}
      {!compact && (
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>{title}</span>
            {mediaList.length > 0 && (
              <span className="text-[11px] text-amber-400 font-bold">
                {mediaList.length} {mediaList.length === 1 ? 'anexo' : 'anexos'}
              </span>
            )}
          </label>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      )}

      {/* Gravação em andamento (Painel Ativo) */}
      {isRecording ? (
        <div className="p-3.5 bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping"></span>
            <div>
              <div className="text-xs font-extrabold text-white flex items-center space-x-1.5">
                <Mic className="w-4 h-4 text-rose-400" />
                <span>Gravando áudio de voz...</span>
              </div>
              <div className="text-[11px] font-mono font-black text-rose-400">
                {formatSeconds(recordingSeconds)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={stopAndSaveRecording}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all flex items-center space-x-1 shadow-lg shadow-rose-600/30 active:scale-95"
            >
              <Square className="w-3 h-3 fill-white" />
              <span>Concluir</span>
            </button>
          </div>
        </div>
      ) : (
        /* Barra de Botões de Ação para Anexar */
        <div className="grid grid-cols-3 gap-2">
          {/* Botão Foto */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => imageInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-400 flex flex-col items-center justify-center space-y-1 transition-all group disabled:opacity-50 cursor-pointer"
            title="Tirar foto ou selecionar imagem da galeria"
          >
            <Camera className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold">Foto</span>
          </button>

          {/* Botão Vídeo */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => videoInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 text-slate-300 hover:text-blue-400 flex flex-col items-center justify-center space-y-1 transition-all group disabled:opacity-50 cursor-pointer"
            title="Enviar um vídeo curto"
          >
            <Video className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold">Vídeo</span>
          </button>

          {/* Botão Gravar Áudio */}
          <button
            type="button"
            disabled={isUploading}
            onClick={startRecording}
            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 flex flex-col items-center justify-center space-y-1 transition-all group disabled:opacity-50 cursor-pointer"
            title="Gravar áudio com observações do pedido usando o microfone"
          >
            <Mic className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold">Gravar Voz</span>
          </button>
        </div>
      )}

      {/* Uploading Status Indicator */}
      {isUploading && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center space-x-2 text-amber-300 text-xs font-bold animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>{uploadProgressText || 'Enviando mídia...'}</span>
        </div>
      )}

      {/* Error Feedback */}
      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-rose-400 text-xs font-bold">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Lista de Mídias Já Anexadas */}
      {mediaList.length > 0 && (
        <div className="space-y-2 pt-1">
          {mediaList.map((media, idx) => (
            <div
              key={media.id || idx}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-inner hover:border-slate-700 transition-all"
            >
              {/* Media Icon & Info */}
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                {/* Visual Thumbnail */}
                {media.type === 'image' && (
                  <div
                    onClick={() => setPreviewMedia(media)}
                    className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0 cursor-pointer group relative"
                  >
                    <img
                      src={media.url}
                      alt={media.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                )}

                {media.type === 'video' && (
                  <div
                    onClick={() => setPreviewMedia(media)}
                    className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 cursor-pointer text-blue-400 hover:bg-blue-500/20 transition-all"
                  >
                    <Film className="w-5 h-5" />
                  </div>
                )}

                {media.type === 'audio' && (
                  <button
                    type="button"
                    onClick={() => togglePlayAudio(media.id, media.url)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      playingAudioId === media.id
                        ? 'bg-emerald-500 text-slate-950 font-black animate-pulse'
                        : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                    }`}
                    title={playingAudioId === media.id ? 'Pausar áudio' : 'Ouvir áudio'}
                  >
                    {playingAudioId === media.id ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                )}

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-white truncate flex items-center space-x-1.5">
                    <span>
                      {media.type === 'image' && '📸 Foto'}
                      {media.type === 'video' && '🎥 Vídeo'}
                      {media.type === 'audio' && '🎙️ Mensagem de Voz'}
                    </span>
                    {media.isFallback && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                        local
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {media.name || (media.duration ? `${media.duration}s de áudio` : 'Anexo')}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1">
                {(media.type === 'image' || media.type === 'video') && (
                  <button
                    type="button"
                    onClick={() => setPreviewMedia(media)}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-bold transition-all"
                  >
                    Visualizar
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleRemove(media.id)}
                  className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                  title="Remover anexo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal de Preview (Foto ou Vídeo) */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
                {previewMedia.type === 'image' ? (
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                ) : (
                  <Film className="w-4 h-4 text-blue-400" />
                )}
                <span>{previewMedia.name || 'Visualização da Mídia'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center items-center rounded-2xl overflow-hidden bg-slate-950 max-h-[70vh]">
              {previewMedia.type === 'image' ? (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.name}
                  className="max-h-[68vh] w-auto object-contain"
                />
              ) : (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  className="max-h-[68vh] w-full object-contain"
                />
              )}
            </div>

            <div className="flex justify-end">
              <a
                href={previewMedia.url}
                target="_blank"
                rel="noreferrer"
                download
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Abrir em Nova Guia / Baixar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
