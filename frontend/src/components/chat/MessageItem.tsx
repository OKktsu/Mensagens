import { useState, useMemo } from "react";
import type { Message } from "../../services/api";
import { getMediaUrl } from "../../services/api";
import { formatTime } from "../../utils/chat-helpers";
import { extractFirstUrl, parseTextWithLinks } from "../../utils/link-extractor";
import { useCachedMedia } from "../../utils/media-cache";
import { AudioPlayer } from "./AudioPlayer";
import { LinkPreviewCard } from "./LinkPreviewCard";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

type MessageItemProps = {
  message: Message;
  currentUserId: string;
  isMine: boolean;
  isRead?: boolean;
  isPinned?: boolean;
  token?: string | null;
  onImageClick?: (url: string) => void;
  onPdfClick?: (url: string, fileName?: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onToggleStar?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onJumpToQuotedMessage?: (messageId: string) => void;
};

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageItem({
  message,
  currentUserId,
  isMine,
  isRead,
  isPinned,
  token,
  onImageClick,
  onPdfClick,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReaction,
  onToggleStar,
  onPin,
  onJumpToQuotedMessage,
}: MessageItemProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const className = isMine ? "message mine" : "message";
  const type = message.type || "text";
  const isDeleted = Boolean(message.isDeleted);
  const isStarred = message.starredBy?.some((s) => s.userId === currentUserId) ?? false;

  // Cache local permanente no IndexedDB (0ms de carregamento após primeira visualização)
  const rawMediaUrl = message.fileUrl ? getMediaUrl(message.fileUrl) : null;
  const { mediaUrl: cachedMediaUrl } = useCachedMedia(rawMediaUrl);
  const effectiveMediaUrl = cachedMediaUrl || rawMediaUrl || "";

  // Detecção de link e PDF
  const firstUrl = useMemo(
    () => (type === "text" && !isDeleted ? extractFirstUrl(message.content) : null),
    [type, isDeleted, message.content],
  );

  const textSegments = useMemo(
    () => (message.content ? parseTextWithLinks(message.content) : []),
    [message.content],
  );

  const isPdf = useMemo(() => {
    return (
      message.fileName?.toLowerCase().endsWith(".pdf") ||
      effectiveMediaUrl.toLowerCase().includes(".pdf")
    );
  }, [message.fileName, effectiveMediaUrl]);

  // Agrupa reações por emoji: { "👍": { count: 2, hasMine: true }, ... }
  const groupedReactions = useMemo(() => {
    const map = new Map<string, { count: number; hasMine: boolean }>();
    if (!message.reactions) return map;

    for (const r of message.reactions) {
      const existing = map.get(r.emoji) ?? { count: 0, hasMine: false };
      existing.count += 1;
      if (r.userId === currentUserId) {
        existing.hasMine = true;
      }
      map.set(r.emoji, existing);
    }
    return map;
  }, [message.reactions, currentUserId]);

  const getQuotedPreviewText = (replyTo: NonNullable<Message["replyTo"]>) => {
    if (replyTo.type === "image") return "📷 Foto";
    if (replyTo.type === "audio") return "🎙️ Áudio";
    if (replyTo.type === "file") return `📄 ${replyTo.fileName || "Arquivo"}`;
    return replyTo.content || "";
  };

  return (
    <div id={`message-${message.id}`} className="message-container">
      <article
        className={`${className} ${type !== "text" ? `media-${type}` : ""} ${
          isDeleted ? "deleted" : ""
        }`}
      >
        {/* INDICADOR DE MENSAGEM ENCAMINHADA */}
        {message.isForwarded && (
          <div className="message-forwarded-tag">
            <span>↪ Encaminhada</span>
          </div>
        )}

        {/* NOME DO AUTOR (SE NÃO FOR EU) */}
        {!isMine && !isDeleted && <span className="message-sender">{message.sender.name}</span>}

        {/* CITAÇÃO DE RESPOSTA */}
        {message.replyTo && !isDeleted && (
          <div
            className="message-reply-quote"
            onClick={() => onJumpToQuotedMessage?.(message.replyTo!.id)}
            role="button"
            tabIndex={0}
            title="Ir para mensagem citada"
          >
            <div className="quote-bar" />
            <div className="quote-body">
              <strong className="quote-sender">{message.replyTo.sender.name}</strong>
              <p className="quote-text">{getQuotedPreviewText(message.replyTo)}</p>
            </div>
          </div>
        )}

        {/* RENDERIZAÇÃO QUANDO APAGADA */}
        {isDeleted ? (
          <p className="message-text deleted-text">
            <span>🚫 Esta mensagem foi apagada</span>
          </p>
        ) : (
          <>
            {/* RENDERIZAÇÃO DE IMAGEM */}
            {type === "image" && effectiveMediaUrl && (
              <div className="message-image-container">
                <img
                  src={effectiveMediaUrl}
                  alt={message.content || "Foto enviada"}
                  className="message-image-thumb"
                  onClick={() => onImageClick?.(effectiveMediaUrl)}
                  loading="lazy"
                />
                {message.content && <p className="message-text image-caption">{message.content}</p>}
              </div>
            )}

            {/* RENDERIZAÇÃO DE ÁUDIO DE VOZ */}
            {type === "audio" && effectiveMediaUrl && (
              <AudioPlayer src={effectiveMediaUrl} duration={message.duration} />
            )}

            {/* RENDERIZAÇÃO DE ARQUIVO/DOCUMENTO */}
            {type === "file" && effectiveMediaUrl && (
              <div className="message-file-wrapper">
                <div
                  className={`message-file-card ${isPdf ? "is-pdf-clickable" : ""}`}
                  onClick={() => {
                    if (isPdf && onPdfClick) {
                      onPdfClick(effectiveMediaUrl, message.fileName || "documento.pdf");
                    }
                  }}
                  title={isPdf ? "Clique para visualizar o PDF no app" : undefined}
                >
                  <div className={`file-icon-box ${isPdf ? "pdf-box" : ""}`}>
                    {isPdf ? "📕" : "📄"}
                  </div>
                  <div className="file-info-box">
                    <strong className="file-name">{message.fileName || "Documento"}</strong>
                    <div className="file-meta-row">
                      {message.fileSize && (
                        <span className="file-size">{formatBytes(message.fileSize)}</span>
                      )}
                      {isPdf && <span className="file-preview-badge">Visualizar PDF</span>}
                    </div>
                  </div>

                  <a
                    href={effectiveMediaUrl}
                    download={message.fileName || "arquivo"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="file-download-icon"
                    title="Baixar arquivo"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⬇
                  </a>
                </div>
                {message.content && <p className="message-text file-caption">{message.content}</p>}
              </div>
            )}

            {/* RENDERIZAÇÃO DE TEXTO COM LINKS CLICÁVEIS E PREVIEW */}
            {type === "text" && (
              <div className="message-text-wrapper">
                <p className="message-text">
                  {textSegments.map((segment, idx) =>
                    segment.type === "link" ? (
                      <a
                        key={idx}
                        href={segment.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chat-inline-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {segment.content}
                      </a>
                    ) : (
                      <span key={idx}>{segment.content}</span>
                    ),
                  )}
                </p>
                {firstUrl && <LinkPreviewCard url={firstUrl} token={token} />}
              </div>
            )}
          </>
        )}

        {/* RODAPÉ: HORÁRIO, TAG EDITADA, ESTRELA, CHECKS */}
        <footer className="message-footer">
          {message.isEdited && !isDeleted && <span className="message-edited-tag">(editada)</span>}
          {isStarred && <span className="message-star-icon" title="Favorita">⭐</span>}
          <time className="message-time">{formatTime(message.createdAt)}</time>
          {isMine && !isDeleted && (
            <span
              className={`read-status ${isRead ? "read" : "delivered"}`}
              title={isRead ? "Lida" : "Enviada"}
            >
              {isRead ? "✓✓" : "✓"}
            </span>
          )}
        </footer>
      </article>

      {/* REAÇÕES ABAIXO DO BALÃO */}
      {groupedReactions.size > 0 && !isDeleted && (
        <div className={`message-reactions-row ${isMine ? "mine" : ""}`}>
          {Array.from(groupedReactions.entries()).map(([emoji, data]) => (
            <button
              key={emoji}
              type="button"
              className={`reaction-pill ${data.hasMine ? "reacted" : ""}`}
              onClick={() => onReaction?.(message.id, emoji)}
              title={`${data.count} reaç${data.count === 1 ? "ão" : "ões"}`}
            >
              <span className="reaction-emoji">{emoji}</span>
              {data.count > 1 && <span className="reaction-count">{data.count}</span>}
            </button>
          ))}
        </div>
      )}

      {/* BARRA DE AÇÕES FLUTUANTE NO HOVER */}
      {!isDeleted && (
        <div className={`message-action-menu ${isMine ? "mine" : ""}`}>
          {/* Seletor rápido de reações */}
          {showReactionPicker && (
            <div className="reaction-quick-bar">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="quick-emoji-btn"
                  onClick={() => {
                    onReaction?.(message.id, emoji);
                    setShowReactionPicker(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="action-menu-btn"
            onClick={() => setShowReactionPicker((prev) => !prev)}
            title="Reagir com emoji"
            aria-label="Reagir"
          >
            😀
          </button>

          <button
            type="button"
            className="action-menu-btn"
            onClick={() => onReply?.(message)}
            title="Responder"
            aria-label="Responder"
          >
            ↩️
          </button>

          <button
            type="button"
            className="action-menu-btn"
            onClick={() => onForward?.(message)}
            title="Encaminhar"
            aria-label="Encaminhar"
          >
            ➡️
          </button>

          <button
            type="button"
            className={`action-menu-btn ${isStarred ? "active" : ""}`}
            onClick={() => onToggleStar?.(message.id)}
            title={isStarred ? "Remover dos favoritos" : "Favoritar"}
            aria-label="Favoritar"
          >
            {isStarred ? "⭐" : "☆"}
          </button>

          <button
            type="button"
            className={`action-menu-btn ${isPinned ? "active" : ""}`}
            onClick={() => onPin?.(message.id)}
            title={isPinned ? "Desafixar" : "Fixar no topo"}
            aria-label="Fixar"
          >
            📌
          </button>

          {/* EDITAR (somente se for minha e for texto) */}
          {isMine && type === "text" && (
            <button
              type="button"
              className="action-menu-btn"
              onClick={() => onEdit?.(message)}
              title="Editar mensagem"
              aria-label="Editar"
            >
              ✏️
            </button>
          )}

          {/* EXCLUIR (somente se for minha) */}
          {isMine && (
            <button
              type="button"
              className="action-menu-btn delete-btn"
              onClick={() => {
                if (window.confirm("Deseja realmente apagar esta mensagem para todos?")) {
                  onDelete?.(message.id);
                }
              }}
              title="Apagar mensagem"
              aria-label="Apagar"
            >
              🗑️
            </button>
          )}
        </div>
      )}
    </div>
  );
}

