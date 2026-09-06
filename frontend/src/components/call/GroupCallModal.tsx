import { useEffect, useRef, useState } from "react";
import { Avatar } from "../common/Avatar";
import type { RemoteGroupParticipant } from "../../hooks/useGroupWebRTCCall";

type GroupCallModalProps = {
  conversationTitle: string;
  callType: "audio" | "video";
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing?: boolean;
  isDeafened?: boolean;
  currentUserName: string;
  localStream: MediaStream | null;
  remoteParticipants: RemoteGroupParticipant[];
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare?: () => void;
  onToggleDeafen?: () => void;
  onLeaveCall: () => void;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function RemoteTile({ participant }: { participant: RemoteGroupParticipant }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const hasVideo = Boolean(
    participant.stream &&
      participant.stream.getVideoTracks().length > 0 &&
      participant.stream.getVideoTracks()[0].enabled
  );

  return (
    <div className="pulse-grid-tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`pulse-grid-video ${!hasVideo ? "hidden" : ""}`}
      />
      {!hasVideo && (
        <div className="pulse-grid-avatar-fallback">
          <Avatar name={participant.userName} size="large" />
          <p className="text-xs font-semibold text-slate-300 mt-2">{participant.userName}</p>
        </div>
      )}
      <div className="pulse-grid-tag">
        <span className="font-bold text-white text-xs">{participant.userName}</span>
      </div>
    </div>
  );
}

export function GroupCallModal({
  conversationTitle,
  callType,
  callDuration,
  isMuted,
  isVideoOff,
  isScreenSharing = false,
  isDeafened = false,
  currentUserName,
  localStream,
  remoteParticipants,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleDeafen,
  onLeaveCall,
}: GroupCallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [layoutMode, setLayoutMode] = useState<"speaker" | "grid">("grid");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const totalParticipants = remoteParticipants.length + 1;
  const hasLocalVideo = Boolean(
    !isVideoOff &&
      localStream &&
      localStream.getVideoTracks().length > 0 &&
      localStream.getVideoTracks()[0].enabled
  );

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="pulse-call-screen" role="dialog" aria-modal="true" aria-label="Chamada em Grupo">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="pulse-call-header">
        <div className="pulse-call-header-left">
          <div className="pulse-call-brand">
            <div className="pulse-call-logo-box">
              <span className="material-symbols-outlined text-[20px] text-white">bolt</span>
            </div>
            <span className="pulse-call-brand-text">
              Pulse<span className="text-[#a78bfa]">Chat</span>
            </span>
          </div>

          <div className="pulse-call-header-divider" />

          <nav className="pulse-call-breadcrumbs">
            <span className="breadcrumb-parent">Squad</span>
            <span className="breadcrumb-slash">/</span>
            <div className="breadcrumb-active-room">
              <span className="material-symbols-outlined text-[15px] text-[#a78bfa]">
                {callType === "video" ? "videocam" : "groups"}
              </span>
              <span>{conversationTitle || "Sala de Voz - Squad"}</span>
            </div>
            <span className="pulse-call-crypto-badge">
              <span className="material-symbols-outlined text-[13px]">lock</span>
              <span>E2E Criptografado</span>
            </span>
          </nav>
        </div>

        <div className="pulse-call-header-center">
          <div className="pulse-call-live-pill">
            <span className="live-dot-wrapper">
              <span className="live-dot-ping" />
              <span className="live-dot" />
            </span>
            <span className="live-label">AO VIVO</span>
            <span className="live-sep">•</span>
            <span className="live-timer">{formatDuration(callDuration)}</span>
          </div>

          <div className="pulse-call-webrtc-pill">
            <span className="material-symbols-outlined text-[14px] text-[#a78bfa]">group</span>
            <span>{totalParticipants} membros</span>
            <span className="text-[#4b5563]">•</span>
            <span className="text-emerald-400 font-semibold">Mesh WebRTC</span>
          </div>
        </div>

        <div className="pulse-call-header-right">
          <div className="pulse-call-layout-toggle">
            <button
              type="button"
              className={`layout-btn ${layoutMode === "speaker" ? "active" : ""}`}
              onClick={() => setLayoutMode("speaker")}
              title="Orador Principal"
            >
              <span className="material-symbols-outlined text-[16px]">person</span>
            </button>
            <button
              type="button"
              className={`layout-btn ${layoutMode === "grid" ? "active" : ""}`}
              onClick={() => setLayoutMode("grid")}
              title="Visão em Grade"
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
            </button>
          </div>

          <button
            type="button"
            className="pulse-call-icon-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isFullscreen ? "fullscreen_exit" : "fullscreen"}
            </span>
          </button>
        </div>
      </header>

      {/* 2. MAIN STAGE (GRADE DE PARTICIPANTES) */}
      <main className="pulse-call-main-stage">
        <div className={`pulse-group-grid total-${Math.min(totalParticipants, 6)}`}>
          {/* Tile do Usuário Local */}
          <div className="pulse-grid-tile local">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`pulse-grid-video ${!hasLocalVideo ? "hidden" : ""}`}
            />
            {!hasLocalVideo && (
              <div className="pulse-grid-avatar-fallback">
                <Avatar name={currentUserName} size="large" />
                <p className="text-xs font-semibold text-slate-300 mt-2">{currentUserName} (Você)</p>
              </div>
            )}
            <div className="pulse-grid-tag">
              <span className="font-bold text-white text-xs">{currentUserName} (Você)</span>
              {isMuted && (
                <span className="material-symbols-outlined text-[13px] text-rose-400 ml-1">mic_off</span>
              )}
            </div>
          </div>

          {/* Tiles Remotos */}
          {remoteParticipants.map((p) => (
            <RemoteTile key={p.userId} participant={p} />
          ))}
        </div>
      </main>

      {/* 3. BOTTOM PERSISTENT GLASS DOCK */}
      <footer className="pulse-call-footer">
        <div className="pulse-call-footer-side left">
          <div className="pulse-call-device-pill">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px] truncate max-w-[140px]">Dispositivo Padrão</span>
          </div>
        </div>

        <div className="pulse-glass-dock">
          {/* Mute Button */}
          <button
            type="button"
            className={`dock-action-btn ${isMuted ? "muted" : ""}`}
            onClick={onToggleMute}
            title={isMuted ? "Desmutar microfone" : "Mutar microfone"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isMuted ? "mic_off" : "mic"}
            </span>
            <span className="dock-btn-label">{isMuted ? "Mudo" : "Mutar"}</span>
          </button>

          {/* Camera Button */}
          <button
            type="button"
            className={`dock-action-btn ${isVideoOff ? "off" : ""}`}
            onClick={onToggleVideo}
            title={isVideoOff ? "Ligar câmera" : "Desligar câmera"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isVideoOff ? "videocam_off" : "videocam"}
            </span>
            <span className="dock-btn-label">{isVideoOff ? "Sem Vídeo" : "Câmera"}</span>
          </button>

          {/* Screen Share Button */}
          {onToggleScreenShare && (
            <button
              type="button"
              className={`dock-action-btn screen ${isScreenSharing ? "active-screen" : ""}`}
              onClick={onToggleScreenShare}
              title={isScreenSharing ? "Parar Compartilhamento" : "Compartilhar Tela"}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isScreenSharing ? "stop_screen_share" : "screen_share"}
              </span>
              <span className="dock-btn-label">
                {isScreenSharing ? "Compartilhando" : "Tela"}
              </span>
            </button>
          )}

          {/* Deafen Button */}
          {onToggleDeafen && (
            <button
              type="button"
              className={`dock-action-btn ${isDeafened ? "deafened" : ""}`}
              onClick={onToggleDeafen}
              title={isDeafened ? "Ativar Áudio da Sala" : "Desativar Áudio da Sala"}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isDeafened ? "headset_off" : "headphones"}
              </span>
              <span className="dock-btn-label">{isDeafened ? "Surdo" : "Áudio"}</span>
            </button>
          )}

          <div className="dock-divider" />

          {/* Leave Button */}
          <button
            type="button"
            className="dock-hangup-btn"
            onClick={onLeaveCall}
            title="Sair da Chamada"
          >
            <span className="material-symbols-outlined text-[20px] rotate-[135deg]">
              call_end
            </span>
            <span className="dock-btn-label">Sair</span>
          </button>
        </div>

        <div className="pulse-call-footer-side right">
          <div className="pulse-call-health-pill">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Opus UHD</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400">0% loss</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
