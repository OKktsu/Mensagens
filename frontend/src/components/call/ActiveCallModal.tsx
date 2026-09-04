import { useEffect, useRef } from "react";
import { Avatar } from "../common/Avatar";
import type { CallState, CallType } from "../../hooks/useWebRTCCall";

type ActiveCallModalProps = {
  peerName: string;
  callState: CallState;
  callType: CallType;
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function ActiveCallModal({
  peerName,
  callState,
  callType,
  callDuration,
  isMuted,
  isVideoOff,
  localStream,
  remoteStream,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}: ActiveCallModalProps) {
  const isConnected = callState === "connected";
  const isVideo = callType === "video";

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Vincula localStream ao elemento de vídeo local
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Vincula remoteStream ao elemento de vídeo remoto
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // RENDERIZAÇÃO PARA CHAMADA DE VÍDEO
  if (isVideo && isConnected) {
    return (
      <div className="video-call-overlay" role="dialog" aria-modal="true" aria-label="Chamada de vídeo em andamento">
        <div className="video-call-container">
          {/* Vídeo Remoto (Tela Principal) */}
          <div className="remote-video-wrapper">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="remote-video-element"
            />
            {(!remoteStream || remoteStream.getVideoTracks().length === 0) && (
              <div className="video-fallback-avatar">
                <Avatar name={peerName} size="normal" />
                <p>{peerName}</p>
              </div>
            )}
          </div>

          {/* Vídeo Local (Picture-in-Picture flutuante) */}
          <div className={`local-video-pip ${isVideoOff ? "video-disabled" : ""}`}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="local-video-element"
            />
            {isVideoOff && (
              <div className="pip-video-off">
                <span>🚫 Câmera desligada</span>
              </div>
            )}
          </div>

          {/* Barra de Controles Flutuante */}
          <div className="video-call-controls">
            <div className="video-call-info">
              <strong>{peerName}</strong>
              <span className="call-timer">{formatDuration(callDuration)}</span>
            </div>

            <div className="video-control-buttons">
              <button
                type="button"
                className={`control-btn ${isMuted ? "active-off" : ""}`}
                onClick={onToggleMute}
                title={isMuted ? "Desmutar microfone" : "Mutar microfone"}
                aria-label={isMuted ? "Desmutar" : "Mutar"}
              >
                <span>{isMuted ? "🔇" : "🎙️"}</span>
                <small>{isMuted ? "Mudo" : "Microfone"}</small>
              </button>

              <button
                type="button"
                className={`control-btn ${isVideoOff ? "active-off" : ""}`}
                onClick={onToggleVideo}
                title={isVideoOff ? "Ligar câmera" : "Desligar câmera"}
                aria-label={isVideoOff ? "Ligar câmera" : "Desligar câmera"}
              >
                <span>{isVideoOff ? "🚫" : "📹"}</span>
                <small>{isVideoOff ? "Sem Câmera" : "Câmera"}</small>
              </button>

              <button
                type="button"
                className="control-btn end-btn"
                onClick={onEndCall}
                title="Encerrar chamada"
                aria-label="Encerrar chamada"
              >
                <span>📞</span>
                <small>Desligar</small>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDERIZAÇÃO PARA CHAMADA DE VOZ OU ESTADO DE DISCANDO
  return (
    <div className="call-modal-overlay" role="dialog" aria-modal="true" aria-label="Chamada em andamento">
      <div className="call-modal active">
        <div className={`call-avatar-container ${isConnected ? "connected" : "calling"}`}>
          <Avatar name={peerName} size="normal" />
        </div>

        <h3>{peerName}</h3>

        <div className="call-status">
          {isConnected ? (
            <span className="call-timer">{formatDuration(callDuration)}</span>
          ) : (
            <span className="call-calling-text">
              {isVideo ? "Chamando por vídeo" : "Chamando por voz"}
              <span className="calling-dots">...</span>
            </span>
          )}
        </div>

        <div className="call-modal-actions">
          {isConnected && (
            <>
              <button
                type="button"
                className={`call-btn mute-btn ${isMuted ? "muted" : ""}`}
                onClick={onToggleMute}
                aria-label={isMuted ? "Desmutar microfone" : "Mutar microfone"}
                title={isMuted ? "Desmutar" : "Mutar"}
              >
                <span className="call-icon">{isMuted ? "🔇" : "🎙️"}</span>
                <span>{isMuted ? "Mudo" : "Mutar"}</span>
              </button>

              {isVideo && (
                <button
                  type="button"
                  className={`call-btn mute-btn ${isVideoOff ? "muted" : ""}`}
                  onClick={onToggleVideo}
                  aria-label={isVideoOff ? "Ligar câmera" : "Desligar câmera"}
                  title={isVideoOff ? "Ligar câmera" : "Desligar câmera"}
                >
                  <span className="call-icon">{isVideoOff ? "🚫" : "📹"}</span>
                  <span>{isVideoOff ? "Câmera off" : "Câmera"}</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            className="call-btn end-btn"
            onClick={onEndCall}
            aria-label="Encerrar chamada"
            title="Desligar"
          >
            <span className="call-icon">📞</span>
            <span>Desligar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
