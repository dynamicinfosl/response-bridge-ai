import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, X, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Recorder from 'opus-recorder';

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

  const recorderRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef<boolean>(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      try {
        recorderRef.current.stop();
      } catch (e) {
        console.warn('[AudioRecorder] stop error:', e);
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = async () => {
    try {
      cancelledRef.current = false;

      // Verifica suporte (Recorder.isRecordingSupported usa AudioContext + Worker)
      if (!Recorder.isRecordingSupported()) {
        console.error('[AudioRecorder] Navegador não suporta gravação OGG/Opus');
        setHasPermission(false);
        onCancel();
        return;
      }

      const recorder = new Recorder({
        encoderPath: '/encoderWorker.min.js',
        encoderApplication: 2048, // VOIP — ideal para voz
        encoderSampleRate: 48000,
        numberOfChannels: 1,
        encoderBitRate: 32000, // 32 kbps mono é suficiente para voz e mantém arquivo pequeno
        streamPages: false, // entrega tudo num único Blob no ondataavailable
      });

      recorder.ondataavailable = (typedArray: Uint8Array) => {
        if (cancelledRef.current) return;
        // Copia para um ArrayBuffer "fresco" para evitar incompatibilidade
        // entre Uint8Array<ArrayBufferLike> e BlobPart no TS estrito.
        const buf = new ArrayBuffer(typedArray.byteLength);
        new Uint8Array(buf).set(typedArray);
        const blob = new Blob([buf], { type: 'audio/ogg; codecs=opus' });
        console.log('[AudioRecorder] Áudio OGG/Opus gerado:', {
          size: blob.size,
          type: blob.type,
        });
        if (blob.size > 0) {
          onSend(blob);
        } else {
          console.warn('[AudioRecorder] Blob vazio — gravação não capturou dados');
        }
      };

      recorder.onstart = () => {
        setIsRecording(true);
        setDuration(0);
        timerRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
      };

      recorder.onstop = () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsRecording(false);
      };

      recorderRef.current = recorder;

      await recorder.start();
      setHasPermission(true);
    } catch (err) {
      console.error('Erro ao iniciar gravação:', err);
      setHasPermission(false);
      onCancel();
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    if (recorderRef.current) {
      try {
        recorderRef.current.stop();
      } catch { /* noop */ }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setDuration(0);
    onCancel();
  };

  const handleStopAndSend = () => {
    stopRecording();
  };

  useEffect(() => {
    startRecording();
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current) {
        try { recorderRef.current.stop(); } catch { /* noop */ }
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
