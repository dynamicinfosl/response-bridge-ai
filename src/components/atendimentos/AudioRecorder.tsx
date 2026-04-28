import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, X, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import fixWebmDuration from 'fix-webm-duration';

interface AudioRecorderProps {
  chatId: string;
  onSend: (blob: Blob) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AudioRecorder({ chatId, onSend, onCancel, isLoading }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
      streamRef.current = stream;
      setHasPermission(true);

      // Verifica se a stream tem tracks de áudio ativas
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0 || !audioTracks[0].enabled) {
        console.error('Nenhuma track de áudio ativa na stream');
        onCancel();
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const finalType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const recordedDurationMs = Date.now() - startTimeRef.current;
        let blob = new Blob(chunksRef.current, { type: finalType });

        // Corrige metadata de duração no container WebM (MediaRecorder não escreve)
        // Sem esta correção, o player exibe "Infinity:NaN" e alguns clientes não
        // conseguem reproduzir o áudio.
        if (finalType.includes('webm')) {
          try {
            blob = await fixWebmDuration(blob, recordedDurationMs, { logger: false });
          } catch (e) {
            console.warn('[AudioRecorder] Falha ao corrigir duração do WebM:', e);
          }
        }

        console.log('[AudioRecorder] Áudio gravado:', {
          size: blob.size,
          type: finalType,
          durationMs: recordedDurationMs,
          chunks: chunksRef.current.length,
        });
        if (blob.size > 0) {
          onSend(blob);
        } else {
          console.warn('[AudioRecorder] Blob vazio — gravação não capturou dados');
        }
        chunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());
      };

      // Timeslice de 250ms garante que ondataavailable seja chamado
      // periodicamente, evitando blobs vazios/corrompidos em alguns navegadores
      startTimeRef.current = Date.now();
      mediaRecorder.start(250);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      setHasPermission(false);
      onCancel();
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          chunksRef.current = [];
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        };
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
      setDuration(0);
    }
    onCancel();
  };

  const handleStopAndSend = () => {
    stopRecording();
  };

  useEffect(() => {
    // Inicia a gravação automaticamente assim que o componente monta
    startRecording();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-2 w-full">
      {!isRecording ? (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-11 w-11 p-0 rounded-full flex-shrink-0",
            "bg-[#00a884] hover:bg-[#008f72] text-white"
          )}
          onClick={startRecording}
          disabled={isLoading}
        >
          <Mic className="w-5 h-5" />
        </Button>
      ) : (
        <>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-11 w-11 p-0 rounded-full flex-shrink-0",
              "bg-[#ff3b30] hover:bg-[#d63030] text-white"
            )}
            onClick={handleCancel}
            disabled={isLoading}
          >
            <Trash2 className="w-5 h-5" />
          </Button>

          <div className="flex-1 flex items-center gap-3 bg-white rounded-lg px-4 h-11">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-sm font-medium text-red-500 tabular-nums">
              {formatDuration(duration)}
            </span>
            <div className="flex-1 h-6 flex items-end gap-[2px]">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-red-500/60 rounded-sm animate-pulse"
                  style={{
                    height: `${Math.max(20, Math.random() * 100)}%`,
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-11 w-11 p-0 rounded-full flex-shrink-0",
              "bg-[#00a884] hover:bg-[#008f72] text-white"
            )}
            onClick={handleStopAndSend}
            disabled={isLoading}
          >
            <Send className="w-5 h-5" />
          </Button>
        </>
      )}
    </div>
  );
}
