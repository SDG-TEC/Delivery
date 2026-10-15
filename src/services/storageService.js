import { getSupabaseClient, isSupabaseConfigured } from './supabase';

/**
 * Converte um arquivo ou Blob para Data URL (Base64) como fallback se o storage estiver indisponível.
 */
export const fileToDataUrl = (fileOrBlob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(fileOrBlob);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Detecta o tipo de mídia básico a partir do MIME type: 'image' | 'video' | 'audio' | 'unknown'
 */
export const getMediaType = (fileOrBlob) => {
  if (!fileOrBlob || !fileOrBlob.type) return 'unknown';
  const type = fileOrBlob.type.toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'unknown';
};

/**
 * Comprime e redimensiona uma imagem no navegador antes de enviar ao Supabase.
 * Transforma fotos pesadas de celulares (4-12MB) em arquivos leves (~100-250KB).
 */
export const compressImage = (file, maxDimension = 1200, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith('image/')) {
      return reject(new Error('O arquivo selecionado não é uma imagem válida.'));
    }

    // Se for GIF ou SVG, não altera
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Fundo branco para imagens com transparência convertidas para JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Falha ao processar e comprimir a imagem.'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Detecta o melhor MIME type de gravação de áudio suportado pelo navegador atual.
 */
export const getSupportedAudioMimeType = () => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/wav'
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
};

/**
 * Utilitário para gravação de voz no navegador usando a MediaRecorder API.
 */
export class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.startTime = null;
  }

  async start() {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('A gravação de áudio não é suportada ou permitida neste navegador.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    this.audioChunks = [];
    const mimeType = getSupportedAudioMimeType();
    const options = mimeType ? { mimeType } : undefined;

    this.mediaRecorder = new MediaRecorder(this.stream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.startTime = Date.now();
    this.mediaRecorder.start(200);
  }

  stop() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Nenhuma gravação de áudio ativa.'));
      }

      this.mediaRecorder.onstop = () => {
        try {
          const duration = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
          const mimeType = this.mediaRecorder.mimeType || getSupportedAudioMimeType() || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });

          // Liberar stream do microfone
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }

          resolve({
            blob: audioBlob,
            duration,
            mimeType,
            size: audioBlob.size
          });
        } catch (err) {
          reject(err);
        }
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    });
  }

  cancel() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.audioChunks = [];
    this.mediaRecorder = null;
  }
}

/**
 * Faz o upload de qualquer mídia (Foto, Vídeo ou Áudio) para o Supabase Storage
 * (bucket 'delivery-media') mantendo fallback resiliente em Base64 Data URL.
 *
 * @param {File|Blob} fileOrBlob - Arquivo ou Blob de imagem, vídeo ou áudio
 * @param {Object} options - Configurações { folder, maxDim, bucket, duration, filename }
 * @returns {Promise<{ url: string, type: string, name: string, size: number, duration?: number, isFallback: boolean, error: string|null }>}
 */
export const uploadMediaToSupabase = async (fileOrBlob, options = {}) => {
  const {
    folder = 'general',
    maxDim = 1200,
    bucket = 'delivery-media',
    duration = 0,
    filename: customFilename = ''
  } = options;

  if (!fileOrBlob) {
    return { url: '', type: 'unknown', name: '', size: 0, isFallback: false, error: 'Nenhum arquivo fornecido' };
  }

  const mediaType = getMediaType(fileOrBlob);
  const size = fileOrBlob.size || 0;

  // Validação de tamanhos máximos recomendados
  const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

  if (mediaType === 'image' && size > MAX_IMAGE_SIZE) {
    return { url: '', type: mediaType, name: '', size, isFallback: false, error: 'A foto excede o limite de 15MB.' };
  }
  if (mediaType === 'video' && size > MAX_VIDEO_SIZE) {
    return { url: '', type: mediaType, name: '', size, isFallback: false, error: 'O vídeo excede o limite de 50MB.' };
  }
  if (mediaType === 'audio' && size > MAX_AUDIO_SIZE) {
    return { url: '', type: mediaType, name: '', size, isFallback: false, error: 'O áudio excede o limite de 25MB.' };
  }

  const supabase = getSupabaseClient();

  // Fallback offline se o Supabase não estiver configurado
  if (!supabase || !isSupabaseConfigured()) {
    try {
      const dataUrl = await fileToDataUrl(fileOrBlob);
      return {
        url: dataUrl,
        type: mediaType,
        name: customFilename || fileOrBlob.name || `${mediaType}_local`,
        size,
        duration,
        isFallback: true,
        error: 'Supabase offline. Mídia salva localmente no navegador (DataURL).'
      };
    } catch (err) {
      return { url: '', type: mediaType, name: '', size, isFallback: true, error: err.message };
    }
  }

  try {
    let uploadPayload = fileOrBlob;
    let contentType = fileOrBlob.type || 'application/octet-stream';
    let fileExtension = 'bin';

    if (mediaType === 'image') {
      try {
        uploadPayload = await compressImage(fileOrBlob, maxDim, 0.85);
        contentType = 'image/jpeg';
        fileExtension = 'jpg';
      } catch (compErr) {
        console.warn('Compressão de imagem não aplicável, enviando arquivo original:', compErr);
        uploadPayload = fileOrBlob;
        fileExtension = fileOrBlob.name ? fileOrBlob.name.split('.').pop() : 'jpg';
      }
    } else if (mediaType === 'video') {
      contentType = fileOrBlob.type || 'video/mp4';
      fileExtension = fileOrBlob.name ? fileOrBlob.name.split('.').pop() : (contentType.includes('webm') ? 'webm' : 'mp4');
    } else if (mediaType === 'audio') {
      contentType = fileOrBlob.type || getSupportedAudioMimeType() || 'audio/webm';
      fileExtension = fileOrBlob.name ? fileOrBlob.name.split('.').pop() : (contentType.includes('mp4') ? 'm4a' : 'webm');
    }

    // Gerar nome de arquivo único
    const timestamp = Date.now();
    const randomHash = Math.random().toString(36).substring(2, 8);
    const baseName = customFilename || (fileOrBlob.name ? fileOrBlob.name.replace(/\.[^/.]+$/, '') : `${mediaType}_${timestamp}`);
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const cleanFileName = `${cleanBaseName}.${fileExtension}`;
    const filePath = `${folder}/${timestamp}_${randomHash}_${cleanFileName}`;

    // Upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, uploadPayload, {
        contentType,
        cacheControl: '31536000', // 1 ano de cache
        upsert: true
      });

    if (error) {
      console.warn(`Aviso de Storage (${error.message}). Utilizando fallback seguro.`);
      const fallbackUrl = await fileToDataUrl(fileOrBlob);
      return {
        url: fallbackUrl,
        type: mediaType,
        name: cleanFileName,
        size,
        duration,
        isFallback: true,
        error: `Supabase Storage: ${error.message}`
      };
    }

    // Obter URL pública
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    const publicUrl = publicData?.publicUrl || '';

    return {
      url: publicUrl,
      type: mediaType,
      name: cleanFileName,
      size,
      duration,
      isFallback: false,
      error: null
    };
  } catch (error) {
    console.error('Erro no upload de mídia:', error);
    try {
      const fallbackUrl = await fileToDataUrl(fileOrBlob);
      return {
        url: fallbackUrl,
        type: mediaType,
        name: fileOrBlob.name || `${mediaType}_fallback`,
        size,
        duration,
        isFallback: true,
        error: error.message
      };
    } catch (e) {
      return { url: '', type: mediaType, name: '', size, isFallback: true, error: error.message };
    }
  }
};
