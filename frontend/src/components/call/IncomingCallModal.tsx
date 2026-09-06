import { Avatar } from "../common/Avatar";

type IncomingCallModalProps = {
  callerName: string;
  callerAvatarUrl?: string | null;
  callType?: "audio" | "video";
  onAccept: () => void;
  onReject: () => void;
};

export function IncomingCallModal({
  callerName,
  callerAvatarUrl,
  callType = "audio",
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  const isVideo = callType === "video";

  return (
    <div
      className="pulse-incoming-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Chamada recebida"
    >
      <div className="pulse-incoming-card">
        {/* Anéis de ressonância pulsantes */}
        <div className="pulse-incoming-avatar-wrap">
          <div className="pulse-incoming-ring ring-1" />
          <div className="pulse-incoming-ring ring-2" />
          
          <div className="pulse-incoming-avatar">
            <Avatar name={callerName} src={callerAvatarUrl} size="large" />
          </div>
        </div>

        <div className="pulse-incoming-info">
          <span className="pulse-incoming-badge">
            <span className="material-symbols-outlined text-[14px]">
              {isVideo ? "videocam" : "call"}
            </span>
            <span>{isVideo ? "Chamada de Vídeo" : "Chamada de Voz"}</span>
          </span>

          <h2 className="pulse-incoming-title">{callerName}</h2>
          <p className="pulse-incoming-subtitle">está ligando para você...</p>
        </div>

        <div className="pulse-incoming-actions">
          <button
            type="button"
            className="pulse-incoming-btn reject"
            onClick={onReject}
            aria-label="Recusar chamada"
            title="Recusar"
          >
            <span className="material-symbols-outlined text-[24px]">call_end</span>
            <span>Recusar</span>
          </button>

          <button
            type="button"
            className="pulse-incoming-btn accept"
            onClick={onAccept}
            aria-label="Atender chamada"
            title="Atender"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isVideo ? "videocam" : "call"}
            </span>
            <span>Atender</span>
          </button>
        </div>
      </div>
    </div>
  );
}
