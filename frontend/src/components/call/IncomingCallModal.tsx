import { Avatar } from "../common/Avatar";

type IncomingCallModalProps = {
  callerName: string;
  callType?: "audio" | "video";
  onAccept: () => void;
  onReject: () => void;
};

export function IncomingCallModal({
  callerName,
  callType = "audio",
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  const isVideo = callType === "video";

  return (
    <div className="call-modal-overlay" role="dialog" aria-modal="true" aria-label="Chamada recebida">
      <div className="call-modal incoming">
        <div className="call-avatar-pulse">
          <Avatar name={callerName} size="normal" />
        </div>
        <h3>{callerName}</h3>
        <p>{isVideo ? "Chamada de vídeo recebida..." : "Chamada de voz recebida..."}</p>

        <div className="call-modal-actions">
          <button
            type="button"
            className="call-btn reject-btn"
            onClick={onReject}
            aria-label="Recusar chamada"
            title="Recusar"
          >
            <span className="call-icon material-symbols-outlined text-[20px]">call_end</span>
            <span>Recusar</span>
          </button>

          <button
            type="button"
            className="call-btn accept-btn"
            onClick={onAccept}
            aria-label="Atender chamada"
            title="Atender"
          >
            <span className="call-icon material-symbols-outlined text-[20px]">{isVideo ? "videocam" : "call"}</span>
            <span>Atender</span>
          </button>
        </div>
      </div>
    </div>
  );
}

