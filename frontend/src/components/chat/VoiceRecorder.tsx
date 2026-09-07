import { useEffect, useRef, useState } from "react";

type VoiceRecorderProps = {
  isRecording: boolean;
  onCancel: () => void;
  onSendVoiceNote: (audioBlob: Blob, duration: number) => void;
};

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function VoiceRecorder({ isRecording, onCancel, onSendVoiceNote }: VoiceRecorderProps) {
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const durationRef = useRef(0);

  useEffect(() => {
    let isCancelled = false;

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        chunksRef.current = [];
        durationRef.current = 0;
        setDuration(0);

        // Define o tipo MIME suportado pelo navegador
        let mimeType = "audio/webm";
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorder.start(250);

        timerRef.current = window.setInterval(() => {
          durationRef.current += 1;
          setDuration(durationRef.current);
        }, 1000);
      } catch (err) {
        console.error("Erro ao acessar microfone para gravação:", err);
        onCancel();
      }
    }

    if (isRecording) {
      startRecording();
    }

    return () => {
      isCancelled = true;
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording, onCancel]);

  const handleStopAndSend = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      onCancel();
      return;
    }

    recorder.onstop = () => {
      const finalDuration = durationRef.current || 1;
      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      onSendVoiceNote(blob, finalDuration);
    };

    recorder.stop();
  };

  const handleCancelRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    chunksRef.current = [];
    onCancel();
  };

  if (!isRecording) return null;

  return (
    <div className="voice-recorder-bar" role="region" aria-label="Gravando áudio">
      <div className="voice-recording-info">
        <span className="recording-indicator-dot" />
        <span className="recording-timer">{formatTimer(duration)}</span>
        <div className="voice-recording-waves" aria-hidden="true">
          <span className="voice-wave-bar bar-1" />
          <span className="voice-wave-bar bar-2" />
          <span className="voice-wave-bar bar-3" />
          <span className="voice-wave-bar bar-4" />
        </div>
        <span className="recording-hint">Gravando áudio...</span>
      </div>

      <div className="voice-recorder-actions">
        <button
          type="button"
          className="voice-cancel-btn"
          onClick={handleCancelRecording}
          title="Cancelar e apagar gravação"
          aria-label="Cancelar e apagar gravação"
        >
          <span className="material-symbols-outlined">delete</span>
        </button>

        <button
          type="button"
          className="voice-send-btn"
          onClick={handleStopAndSend}
          title="Enviar áudio gravado"
          aria-label="Enviar áudio"
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  );
}
