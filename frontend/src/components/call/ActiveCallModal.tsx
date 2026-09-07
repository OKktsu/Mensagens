import { useEffect, useRef, useState, useCallback } from "react";
import { Avatar } from "../common/Avatar";
import type { CallState, CallType } from "../../hooks/useWebRTCCall";

type ActiveCallModalProps = {
  peerName: string;
  peerAvatarUrl?: string | null;
  currentUserName: string;
  callState: CallState;
  callType: CallType;
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing?: boolean;
  isDeafened?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare?: () => void;
  onToggleDeafen?: () => void;
  onMinimize?: () => void;
  onEndCall: () => void;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function ActiveCallModal({
  peerName,
  peerAvatarUrl,
  currentUserName,
  callState,
  callType,
  callDuration,
  isMuted,
  isVideoOff,
  isScreenSharing = false,
  isDeafened = false,
  errorMessage,
  onRetry,
  localStream,
  remoteStream,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleDeafen,
  onMinimize,
  onEndCall,
}: ActiveCallModalProps) {
  const isConnected = callState === "connected";
  const isCalling = callState === "calling";
  const [layoutMode, setLayoutMode] = useState<"speaker" | "grid">("speaker");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const setLocalVideoNode = useCallback(
    (node: HTMLVideoElement | null) => {
      localVideoRef.current = node;
      if (node && localStream) {
        node.srcObject = localStream;
      }
    },
    [localStream]
  );

  const setRemoteVideoNode = useCallback(
    (node: HTMLVideoElement | null) => {
      remoteVideoRef.current = node;
      if (node && remoteStream) {
        node.srcObject = remoteStream;
      }
    },
    [remoteStream]
  );

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const hasRemoteVideo = Boolean(
    remoteStream &&
      remoteStream.getVideoTracks().length > 0 &&
      remoteStream.getVideoTracks()[0].enabled
  );

  const hasLocalVideo = Boolean(
    !isVideoOff &&
      localStream &&
      localStream.getVideoTracks().length > 0 &&
      localStream.getVideoTracks()[0].enabled
  );

  const isVideoCall = callType === "video";

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
      aria-label="Chamada PulseChat"
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

      {/* 1. PALCO PRINCIPAL (MAIN STAGE) */}
      <main className="pulse-call-main-stage">
        {/* MODO GRADE (GRID) */}
        {layoutMode === "grid" ? (
          <div className="pulse-call-grid-stage">
            {/* Tile 1: Contato */}
            <div className="pulse-call-remote-video-frame">
              {hasRemoteVideo ? (
                <video
                  ref={setRemoteVideoNode}
                  autoPlay
                  playsInline
                  className="pulse-call-video-element"
                />
              ) : (
                <div className="pulse-call-remote-avatar-card">
                  <div className="pulse-call-avatar-resonance small">
                    <div className="pulse-call-glow-ring ring-1 small" />
                    <div className="pulse-call-glow-ring ring-2 small" />
                    <div className="pulse-call-speaker-avatar small">
                      <Avatar name={peerName} src={peerAvatarUrl} size="large" />
                      <div className="speaker-talking-pill">
                        <span className="talking-dot" />
                        <span className="talking-label">{isCalling ? "Chamando" : "Conectado"}</span>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-sm">{peerName}</h3>
                </div>
              )}
              <div className="pulse-call-peer-tag">
                <span className="font-bold text-white text-xs">{peerName}</span>
              </div>
            </div>

            {/* Tile 2: Você */}
            <div className="pulse-call-remote-video-frame">
              {hasLocalVideo ? (
                <video
                  ref={setLocalVideoNode}
                  autoPlay
                  playsInline
                  muted
                  className="pulse-call-video-element local-preview"
                />
              ) : (
                <div className="pulse-call-remote-avatar-card">
                  <div className="pulse-call-avatar-resonance small">
                    <div className="pulse-call-speaker-avatar small">
                      <Avatar name={currentUserName} size="large" />
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-sm">{currentUserName} (Você)</h3>
                </div>
              )}
              <div className="pulse-call-peer-tag">
                <span className="font-bold text-white text-xs">{currentUserName} (Você)</span>
                {isMuted && (
                  <span className="material-symbols-outlined text-[13px] text-rose-400 ml-1">mic_off</span>
                )}
              </div>
            </div>
          </div>
        ) : isVideoCall && hasLocalVideo ? (
          <div className="pulse-call-video-stage">
            <div className="pulse-call-remote-video-frame preview-mode">
              <video
                ref={setLocalVideoNode}
                autoPlay
                playsInline
                muted
                className="pulse-call-video-element local-preview"
              />

              <div className="pulse-calling-overlay-card">
                <div className="pulse-calling-avatar-box">
                  <div className="pulse-call-glow-ring ring-1" />
                  <Avatar name={peerName} src={peerAvatarUrl} size="large" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">{peerName}</h2>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-mono font-semibold text-emerald-300 uppercase">
                      {isCalling ? "Chamando..." : "Conectado • Aguardando Vídeo"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pulse-call-video-tag">
                <span className="font-bold text-white text-xs">Sua Câmera (Prévia ao Vivo)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="pulse-call-voice-stage">
            <div className="pulse-call-avatar-resonance">
              <div className="pulse-call-glow-ring ring-1" />
              <div className="pulse-call-glow-ring ring-2" />
              
              <div className="pulse-call-speaker-avatar-wrap">
                {peerAvatarUrl ? (
                  <img
                    src={peerAvatarUrl}
                    alt={peerName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center text-4xl font-extrabold text-white select-none shadow-inner"
                    style={{
                      background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    }}
                  >
                    {peerName.trim().slice(0, 1).toUpperCase() || "U"}
                  </div>
                )}
              </div>
            </div>

            <div className="pulse-call-speaker-meta">
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{peerName}</h1>
              <p className="text-sm text-slate-400 font-mono">@{peerName.toLowerCase().replace(/\s+/g, ".")}</p>

              <div className="pulse-call-eq-container">
                <span className="eq-bar bar-1" />
                <span className="eq-bar bar-2" />
                <span className="eq-bar bar-3" />
                <span className="eq-bar bar-4" />
                <span className="eq-bar bar-5" />
                <span className="eq-bar bar-6" />
                <span className="eq-bar bar-7" />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 2. BARRA DE CONTROLE INFERIOR (APENAS 2 BOTÕES) */}
      <footer className="pulse-call-footer">
        <div className="pulse-glass-dock">
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

          <button
            type="button"
            className="dock-hangup-btn"
            onClick={onEndCall}
            title="Desligar Chamada"
          >
            <span className="material-symbols-outlined text-[20px] rotate-[135deg]">
              call_end
            </span>
            <span className="dock-btn-label">Desligar</span>
          </button>
        </div>
      </footer>

      {/* OVERLAY DE AVISO DE PERMISSÃO / DISPOSITIVO */}
      {errorMessage && (
        <div className="pulse-permission-overlay" role="alert">
          <div className="pulse-permission-card">
            <div className="pulse-permission-icon-wrap">
              <span className="material-symbols-outlined text-[32px] text-amber-400">lock_reset</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Acesso a Câmera / Microfone</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">{errorMessage}</p>
            <div className="flex items-center gap-3">
              {onRetry && (
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-lg shadow-[#2563eb]/30"
                  onClick={onRetry}
                >
                  Tentar Novamente
                </button>
              )}
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-[#1f212e] hover:bg-[#2a2d3d] text-slate-200 text-xs font-semibold transition-all border border-[#2a2d3d]"
                onClick={onEndCall}
              >
                Fechar Chamada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}