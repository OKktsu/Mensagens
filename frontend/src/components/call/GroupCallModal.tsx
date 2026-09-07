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
  onMinimize?: () => void;
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
  onMinimize,
  onLeaveCall,
}: GroupCallModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
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
      if (containerRef.current) {
        containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      }
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="pulse-call-screen"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        flex: 1,
        backgroundColor: "#0d0f14",
        backgroundImage: "radial-gradient(circle at 50% 50%, #171922 0%, #0a0b0f 100%)",
        color: "#e2e8f0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }}
      role="region"
      aria-label="Chamada em Grupo"
    >
      {/* BOTÃO FLUTUANTE DE MINIMIZAR */}
      {onMinimize && (
        <button
          type="button"
          className="pulse-call-top-minimize-btn"
          onClick={onMinimize}
          title="Minimizar chamada (continuar navegando no chat)"
        >
          <span className="material-symbols-outlined text-[18px]">expand_more</span>
          <span className="text-xs font-semibold">Minimizar</span>
        </button>
      )}

      {/* 1. MAIN STAGE (GRADE DE PARTICIPANTES) */}
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

      {/* 2. BARRA DE CONTROLE INFERIOR (APENAS 2 BOTÕES) */}
      <footer className="pulse-call-footer">
        <div className="pulse-glass-dock">
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
                {isScreenSharing ? "Compartilhando" : "Compartilhar Tela"}
              </span>
            </button>
          )}

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
            <span className="dock-btn-label">Desligar</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
