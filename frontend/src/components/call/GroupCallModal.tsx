import { useEffect, useRef } from "react";
import { Avatar } from "../common/Avatar";
import type { RemoteGroupParticipant } from "../../hooks/useGroupWebRTCCall";

type GroupCallModalProps = {
  conversationTitle: string;
  callType: "audio" | "video";
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  currentUserName: string;
  localStream: MediaStream | null;
  remoteParticipants: RemoteGroupParticipant[];
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onLeaveCall: () => void;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Subcomponente para renderizar cada stream de vídeo remoto
function RemoteParticipantTile({ participant }: { participant: RemoteGroupParticipant }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const hasVideo = Boolean(
    participant.stream &&
      participant.stream.getVideoTracks().length > 0 &&
      participant.stream.getVideoTracks()[0].enabled,
  );

  return (
    <div className="group-call-tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`tile-video ${!hasVideo ? "hidden" : ""}`}
      />

      {!hasVideo && (
        <div className="tile-avatar-fallback">
          <Avatar name={participant.userName} size="normal" />
        </div>
      )}

      <div className="tile-name-tag">
        <span>{participant.userName}</span>
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
  currentUserName,
  localStream,
  remoteParticipants,
  onToggleMute,
  onToggleVideo,
  onLeaveCall,
}: GroupCallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const totalParticipants = remoteParticipants.length + 1;
  const isVideo = callType === "video";

  // Determina classe do grid: 1, 2, 3-4, 5-6
  let gridClass = "grid-1";
  if (totalParticipants === 2) gridClass = "grid-2";
  else if (totalParticipants <= 4) gridClass = "grid-4";
  else gridClass = "grid-6";

  return (
    <div className="group-call-overlay" role="dialog" aria-modal="true" aria-label="Chamada em grupo">
      <div className="group-call-container">
        {/* Cabeçalho da Chamada */}
        <div className="group-call-header">
          <div className="group-call-title-info">
            <h2>{conversationTitle || "Chamada em Grupo"}</h2>
            <span className="group-call-badge">
              {isVideo ? "📹 Vídeo" : "📞 Voz"} • {totalParticipants} participantes
            </span>
          </div>

          <div className="group-call-timer">
            <span>{formatDuration(callDuration)}</span>
          </div>
        </div>

        {/* Grade de Vídeos / Participantes */}
        <div className={`group-call-grid ${gridClass}`}>
          {/* Tile Local (Você) */}
          <div className="group-call-tile local">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`tile-video local-video ${isVideoOff ? "hidden" : ""}`}
            />

            {isVideoOff && (
              <div className="tile-avatar-fallback">
                <Avatar name={currentUserName} size="normal" />
              </div>
            )}

            <div className="tile-name-tag">
              <span>{currentUserName} (Você)</span>
              {isMuted && <span className="tag-muted">🔇</span>}
            </div>
          </div>

          {/* Tiles Remotos */}
          {remoteParticipants.map((participant) => (
            <RemoteParticipantTile key={participant.userId} participant={participant} />
          ))}
        </div>

        {/* Barra de Controles Inferior */}
        <div className="group-call-footer">
          <div className="group-control-buttons">
            <button
              type="button"
              className={`control-btn ${isMuted ? "active-off" : ""}`}
              onClick={onToggleMute}
              title={isMuted ? "Desmutar microfone" : "Mutar microfone"}
            >
              <span>{isMuted ? "🔇" : "🎙️"}</span>
              <small>{isMuted ? "Mudo" : "Microfone"}</small>
            </button>

            {isVideo && (
              <button
                type="button"
                className={`control-btn ${isVideoOff ? "active-off" : ""}`}
                onClick={onToggleVideo}
                title={isVideoOff ? "Ligar câmera" : "Desligar câmera"}
              >
                <span>{isVideoOff ? "🚫" : "📹"}</span>
                <small>{isVideoOff ? "Sem Câmera" : "Câmera"}</small>
              </button>
            )}

            <button
              type="button"
              className="control-btn end-btn"
              onClick={onLeaveCall}
              title="Sair da chamada"
            >
              <span>📞</span>
              <small>Sair</small>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
