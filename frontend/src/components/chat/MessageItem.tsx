import type { Message } from "../../services/api";
import { formatTime } from "../../utils/chat-helpers";

type MessageItemProps = {
  message: Message;
  isMine: boolean;
  isRead?: boolean;
};

export function MessageItem({ message, isMine, isRead }: MessageItemProps) {
  const className = isMine ? "message mine" : "message";

  return (
    <article className={className}>
      {!isMine && <span className="message-sender">{message.sender.name}</span>}
      <p className="message-text">{message.content}</p>
      <footer className="message-footer">
        <time className="message-time">{formatTime(message.createdAt)}</time>
        {isMine && (
          <span
            className={`read-status ${isRead ? "read" : "delivered"}`}
            title={isRead ? "Lida" : "Enviada"}
          >
            {isRead ? "✓✓" : "✓"}
          </span>
        )}
      </footer>
    </article>
  );
}

