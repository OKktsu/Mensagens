import type { Message } from "../../services/api";
import { getMediaUrl } from "../../services/api";
import { formatTime } from "../../utils/chat-helpers";
import { AudioPlayer } from "./AudioPlayer";

type MessageItemProps = {
  message: Message;
  isMine: boolean;
  isRead?: boolean;
  onImageClick?: (url: string) => void;
};

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageItem({ message, isMine, isRead, onImageClick }: MessageItemProps) {
  const className = isMine ? "message mine" : "message";
  const type = message.type || "text";

  return (
    <article className={`${className} ${type !== "text" ? `media-${type}` : ""}`}>
      {!isMine && <span className="message-sender">{message.sender.name}</span>}

      {/* RENDERIZAÇÃO DE IMAGEM */}
      {type === "image" && message.fileUrl && (
        <div className="message-image-container">
          <img
            src={getMediaUrl(message.fileUrl)}
            alt={message.content || "Foto enviada"}
            className="message-image-thumb"
            onClick={() => onImageClick?.(getMediaUrl(message.fileUrl))}
            loading="lazy"
          />
          {message.content && <p className="message-text image-caption">{message.content}</p>}
        </div>
      )}

      {/* RENDERIZAÇÃO DE ÁUDIO DE VOZ */}
      {type === "audio" && message.fileUrl && (
        <AudioPlayer src={getMediaUrl(message.fileUrl)} duration={message.duration} />
      )}

      {/* RENDERIZAÇÃO DE ARQUIVO/DOCUMENTO */}
      {type === "file" && message.fileUrl && (
        <div className="message-file-wrapper">
          <a
            href={getMediaUrl(message.fileUrl)}
            download={message.fileName || "arquivo"}
            target="_blank"
            rel="noopener noreferrer"
            className="message-file-card"
          >
            <div className="file-icon-box">📄</div>
            <div className="file-info-box">
              <strong className="file-name">{message.fileName || "Documento"}</strong>
              {message.fileSize && <span className="file-size">{formatBytes(message.fileSize)}</span>}
            </div>
            <span className="file-download-icon" title="Baixar arquivo">
              ⬇
            </span>
          </a>
          {message.content && <p className="message-text file-caption">{message.content}</p>}
        </div>
      )}

      {/* RENDERIZAÇÃO DE TEXTO PURO */}
      {type === "text" && <p className="message-text">{message.content}</p>}

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
