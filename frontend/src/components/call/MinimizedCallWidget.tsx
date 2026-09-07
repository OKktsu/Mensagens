import { useState, useRef, useEffect } from "react";

type MinimizedCallWidgetProps = {
  peerName: string;
  peerAvatarUrl?: string | null;
  callDuration: number;
  callType: "audio" | "video";
  callState: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  onMaximize: () => void;
  onToggleMute?: () => void;
  onEndCall: () => void;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function MinimizedCallWidget({
  peerName,
  peerAvatarUrl,
  callDuration,
  callState,
  onMaximize,
  onEndCall,
}: MinimizedCallWidgetProps) {
  const isConnected = callState === "connected";
  const isCalling = callState === "calling";

  // Dimensões do quadrado 1:1 perfeito
  const CARD_SIZE = 144;

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const initialX = typeof window !== "undefined" ? Math.max(20, window.innerWidth - CARD_SIZE - 28) : 800;
    const initialY = typeof window !== "undefined" ? Math.max(20, window.innerHeight - CARD_SIZE - 32) : 500;
    return { x: initialX, y: initialY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    hasMoved: boolean;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
      hasMoved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    if (Math.hypot(deltaX, deltaY) > 4) {
      dragRef.current.hasMoved = true;
    }

    const maxX = Math.max(10, window.innerWidth - CARD_SIZE - 10);
    const maxY = Math.max(10, window.innerHeight - CARD_SIZE - 10);

    const nextX = Math.min(Math.max(10, dragRef.current.origX + deltaX), maxX);
    const nextY = Math.min(Math.max(10, dragRef.current.origY + deltaY), maxY);

    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const moved = dragRef.current.hasMoved;
    dragRef.current = null;
    setIsDragging(false);

    // Se foi apenas clique (não arrastou), maximiza a chamada
    if (!moved) {
      onMaximize();
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = Math.max(10, window.innerWidth - CARD_SIZE - 10);
        const maxY = Math.max(10, window.innerHeight - CARD_SIZE - 10);
        return {
          x: Math.min(prev.x, maxX),
          y: Math.min(prev.y, maxY),
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className={`pulse-pip-square ${isDragging ? "is-dragging" : ""}`}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="region"
      aria-label="Chamada Minimizada (Arraste para mover ou clique para expandir)"
      title="Clique para voltar para a chamada ou arraste para mover"
    >
      {/* 1. AVATAR CENTRALIZADO COM STATUS */}
      <div className="pulse-pip-avatar-container">
        <div className="pulse-pip-glow-aura" />
        {peerAvatarUrl ? (
          <img
            src={peerAvatarUrl}
            alt={peerName}
            className="pulse-pip-avatar-img"
            draggable={false}
          />
        ) : (
          <div className="pulse-pip-avatar-fallback">
            {peerName.trim().slice(0, 1).toUpperCase() || "U"}
          </div>
        )}
        <span
          className={`pulse-pip-status-dot ${isConnected ? "connected" : "calling"}`}
        />
      </div>

      {/* 2. INFORMAÇÕES DO CONTATO */}
      <div className="pulse-pip-info">
        <span className="pulse-pip-name" title={peerName}>
          {peerName}
        </span>
        <div className="pulse-pip-timer">
          <span className="pulse-pip-dot-live" />
          <span>{isCalling ? "Chamando..." : formatDuration(callDuration)}</span>
        </div>
      </div>

      {/* 3. BOTÃO DE DESLIGAR */}
      <button
        type="button"
        className="pulse-pip-hangup-btn"
        onClick={(e) => {
          e.stopPropagation();
          onEndCall();
        }}
        title="Desligar Chamada"
      >
        <span className="material-symbols-outlined pulse-pip-hangup-icon">
          call_end
        </span>
        <span>Desligar</span>
      </button>
    </div>
  );
}
