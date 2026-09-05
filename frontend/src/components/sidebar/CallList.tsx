import type { CallRecord } from "../../services/api";
import { Avatar } from "../common/Avatar";
import { formatDateDivider, formatTime } from "../../utils/chat-helpers";

type CallListProps = {
  calls: CallRecord[];
  currentUserId: string;
  onStartVoiceCall: (userId: string, userName: string, conversationId?: string) => void;
  onStartVideoCall: (userId: string, userName: string, conversationId?: string) => void;
};

function formatCallDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `(${secs}s)`;
  return `(${mins}m ${secs}s)`;
}

export function CallList({
  calls,
  currentUserId,
  onStartVoiceCall,
  onStartVideoCall,
}: CallListProps) {
  if (calls.length === 0) {
    return (
      <div className="empty-calls">
        <span className="empty-calls-icon">📞</span>
        <strong>Nenhuma chamada recente</strong>
        <p>Inicie uma chamada de voz ou vídeo com seus contatos.</p>
      </div>
    );
  }

  return (
    <section className="call-list" aria-label="Histórico de chamadas">
      {calls.map((call) => {
        const isOutgoing = call.callerId === currentUserId;
        const contact = isOutgoing ? call.receiver : call.caller;
        const isMissed = !isOutgoing && (call.status === "missed" || call.status === "rejected");
        const isVideo = call.type === "video";
        const dateText = `${formatDateDivider(call.startedAt)}, ${formatTime(call.startedAt)}`;
        const durationText = formatCallDuration(call.duration);

        return (
          <div key={call.id} className="call-item">
            <Avatar name={contact.name} size="normal" />

            <div className="call-item-content">
              <strong className={isMissed ? "missed-call-name" : ""}>
                {call.conversation?.title ?? contact.name}
              </strong>

              <div className="call-item-meta">
                <span
                  className={`call-direction-icon ${
                    isOutgoing
                      ? "outgoing"
                      : isMissed
                      ? "missed"
                      : "incoming"
                  }`}
                  title={isOutgoing ? "Efetuada" : isMissed ? "Perdida" : "Recebida"}
                >
                  {isOutgoing ? "↗" : "↙"}
                </span>

                <span className="call-type-badge">{isVideo ? "📹" : "📞"}</span>

                <span className="call-item-time">{dateText}</span>

                {durationText && <span className="call-item-duration">{durationText}</span>}
              </div>
            </div>

            <div className="call-item-actions">
              <button
                type="button"
                className="call-callback-btn"
                onClick={() => onStartVoiceCall(contact.id, contact.name, call.conversationId ?? undefined)}
                title="Ligar de volta por voz"
                aria-label="Ligar por voz"
              >
                📞
              </button>

              <button
                type="button"
                className="call-callback-btn video"
                onClick={() => onStartVideoCall(contact.id, contact.name, call.conversationId ?? undefined)}
                title="Ligar de volta por vídeo"
                aria-label="Ligar por vídeo"
              >
                📹
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
