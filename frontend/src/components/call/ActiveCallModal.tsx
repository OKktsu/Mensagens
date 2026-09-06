import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
  onEndCall,
}: ActiveCallModalProps) {
  const isConnected = callState === "connected";
  const isCalling = callState === "calling";
  const [layoutMode, setLayoutMode] = useState<"speaker" | "grid">("speaker");
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const modalContent = (
    <div
      className="pulse-call-screen"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 99999,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Chamada PulseChat"
    >
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
            <span className="breadcrumb-parent">Conversa Direta</span>
            <span className="breadcrumb-slash">/</span>
            <div className="breadcrumb-active-room">
              <span className="material-symbols-outlined text-[15px] text-[#a78bfa]">
                {isVideoCall ? "videocam" : "call"}
              </span>
              <span>{peerName}</span>
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
            <span className="live-label">{isConnected ? "AO VIVO" : "CHAMANDO..."}</span>
            <span className="live-sep">•</span>
            <span className="live-timer">{formatDuration(callDuration)}</span>
          </div>

          <div className="pulse-call-webrtc-pill">
            <span className="material-symbols-outlined text-[14px] text-[#a78bfa]">trending_up</span>
            <span>96kbps</span>
            <span className="text-[#4b5563]">•</span>
            <span className="text-emerald-400 font-semibold">16ms WebRTC</span>
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

          <button
            type="button"
            className="pulse-call-icon-btn"
            title="Configurações da Sala"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
          </button>
        </div>
      </header>

      {/* 2. PALCO PRINCIPAL (MAIN STAGE) */}
      <main className="pulse-call-stage">
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
                <Avatar
                  name={peerName}
                  src={peerAvatarUrl}
                  size="large"
                  className="w-full h-full text-4xl shadow-2xl"
                />
                <div className="pulse-call-status-badge">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase">
                    {isConnected ? "Conectado" : "Chamando..."}
                  </span>
                </div>
              </div>
            </div>

            <div className="pulse-call-speaker-meta">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">{peerName}</h1>
                <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[#8b5cf6]/20 text-[#c084fc] border border-[#8b5cf6]/30">
                  {isVideoCall ? "Vídeo HD" : "Voz HQ"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">@{peerName.toLowerCase().replace(/\s+/g, ".")}</p>

              <div className="pulse-call-eq-container">
                <span className="eq-bar bar-1" />
                <span className="eq-bar bar-2" />
                <span className="eq-bar bar-3" />
                <span className="eq-bar bar-4" />
                <span className="eq-bar bar-5" />
                <span className="eq-bar bar-6" />
                <span className="eq-bar bar-7" />
              </div>

              <div className="pulse-call-hardware-badge">
                <span className="material-symbols-outlined text-[14px] text-slate-400">mic</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {isMuted ? "Microfone Silenciado" : "Microfone • Ativo"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. SECONDARY PARTICIPANT STRIP */}
        <div className="pulse-call-participant-strip">
          <div className="participant-strip-scroll">
            <div className="pulse-participant-card self">
              <div className="participant-card-top">
                <div className="flex items-center gap-2.5">
                  <Avatar name={currentUserName} size="small" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-100 truncate">{currentUserName} (Você)</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {isScreenSharing ? "Compartilhando Tela" : "Conectado"}
                    </p>
                  </div>
                </div>
                {isMuted && (
                  <span className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[13px]">mic_off</span>
                  </span>
                )}
              </div>
              <div className="participant-card-bottom">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${hasLocalVideo ? "bg-emerald-400" : "bg-slate-500"}`} />
                  {hasLocalVideo ? "Câmera Ativa" : "Câmera Desligada"}
                </span>
                <span className="text-slate-500 font-mono text-[10px]">{isMuted ? "Mudo" : "Voz Ativa"}</span>
              </div>
            </div>

            <div className="pulse-participant-card">
              <div className="participant-card-top">
                <div className="flex items-center gap-2.5">
                  <Avatar name={peerName} src={peerAvatarUrl} size="small" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-100 truncate">{peerName}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {isCalling ? "Chamando..." : "Conectado"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="participant-card-bottom">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${hasRemoteVideo ? "bg-emerald-400" : isCalling ? "bg-amber-400" : "bg-slate-500"}`} />
                  {hasRemoteVideo ? "Câmera Ligada" : isCalling ? "Aguardando..." : "Apenas Áudio"}
                </span>
                <span className="text-emerald-400 font-mono text-[10px]">HD</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. BOTTOM PERSISTENT GLASS DOCK */}
      <footer className="pulse-call-footer">
        <div className="pulse-call-footer-side left">
          <div className="pulse-call-device-pill">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px] truncate max-w-[140px]">Dispositivo de Áudio</span>
          </div>
        </div>

        <div className="pulse-glass-dock">
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

          <button
            type="button"
            className="dock-hangup-btn"
            onClick={onEndCall}
            title="Encerrar Chamada"
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
                  className="px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold transition-all shadow-lg shadow-[#7c3aed]/30"
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

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
}