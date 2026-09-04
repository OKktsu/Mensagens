import { Avatar } from "../common/Avatar";
import type { CallState } from "../../hooks/useWebRTCCall";

type ActiveCallModalProps = {
  peerName: string;
  callState: CallState;
  callDuration: number;
  isMuted: boolean;
  onToggleMute: () => void;
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
  callDuration,
  isMuted,
  onToggleMute,
  onEndCall,
}: ActiveCallModalProps) {
  const isConnected = callState === "connected";

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
              Chamando
              <span className="calling-dots">...</span>
            </span>
          )}
        </div>

        <div className="call-modal-actions">
          {isConnected && (
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
