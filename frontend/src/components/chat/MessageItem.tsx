import { useState, useMemo } from "react";
import type { Message } from "../../services/api";
import { getMediaUrl } from "../../services/api";
import { formatTime } from "../../utils/chat-helpers";
import { extractFirstUrl, parseTextWithLinks } from "../../utils/link-extractor";
import { useCachedMedia } from "../../utils/media-cache";
import { AudioPlayer } from "./AudioPlayer";
import { LinkPreviewCard } from "./LinkPreviewCard";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🚀"];

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

  const type = message.type || "text";
  const isDeleted = Boolean(message.isDeleted);
  const isStarred = message.starredBy?.some((s) => s.userId === currentUserId) ?? false;

  // Cache local permanente no IndexedDB (0ms de carregamento)
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

  // Agrupa reações por emoji
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
    if (replyTo.type === "image") return "Foto anexada";
    if (replyTo.type === "audio") return "Mensagem de voz";
    if (replyTo.type === "file") return replyTo.fileName || "Documento anexado";
    return replyTo.content || "";
  };

  const initial = message.sender?.name
    ? message.sender.name.slice(0, 2).toUpperCase()
    : "??";

  return (
    <div id={`message-${message.id}`} className="stitch-message-row group">
      {/* Coluna Esquerda: Avatar Squircle */}
      <div className="stitch-msg-avatar-col">
        <div className="stitch-msg-squircle-avatar">
          <span>{initial}</span>
        </div>
      </div>

      {/* Coluna Central: Conteúdo da Mensagem */}
      <div className="stitch-msg-content-col">
        {/* Linha de Cabeçalho: Nome + Badge + Timestamp + Checks */}
        <div className="stitch-msg-meta-line">
          <span className={`stitch-msg-author ${isMine ? "is-me" : "is-partner"}`}>
            {message.sender.name}
          </span>
          {isMine ? (
            <span className="stitch-msg-role-tag pro">PULSE PRO</span>
          ) : (
            <span className="stitch-msg-role-tag">AMIGO</span>
          )}
          <span className="stitch-msg-time">Hoje às {formatTime(message.createdAt)}</span>
          {isMine && !isDeleted && (
            <span
              className={`material-symbols-outlined stitch-msg-check ${
                isRead ? "read" : "delivered"
              }`}
              title={isRead ? "Lida" : "Enviada"}
            >
              done_all
            </span>
          )}
          {message.isEdited && !isDeleted && (
            <span className="stitch-msg-edited-tag">(editada)</span>
          )}
          {isStarred && (
            <span className="stitch-msg-star" title="Favorita">
              ⭐
            </span>
          )}
        </div>

        {/* Tag de Mensagem Encaminhada */}
        {message.isForwarded && (
          <div className="stitch-msg-forwarded">
            <span className="material-symbols-outlined text-[13px]">reply</span>
            <span>Encaminhada</span>
          </div>
        )}

        {/* Bloco de Citação / Resposta */}
        {message.replyTo && !isDeleted && (
          <div
            className="stitch-msg-reply-quote"
            onClick={() => onJumpToQuotedMessage?.(message.replyTo!.id)}
            role="button"
            tabIndex={0}
            title="Ir para a mensagem citada"
          >
            <strong className="stitch-quote-author">
              {message.replyTo.sender.name}:
            </strong>
            <span className="stitch-quote-text">
              {getQuotedPreviewText(message.replyTo)}
            </span>
          </div>
        )}

        {/* Corpo da Mensagem */}
        {isDeleted ? (
          <p className="stitch-msg-deleted">🚫 Esta mensagem foi apagada</p>
        ) : (
          <div className="stitch-msg-body">
            {/* Foto / Imagem */}
            {type === "image" && effectiveMediaUrl && (
              <div className="stitch-msg-image-wrap">
                <img
                  src={effectiveMediaUrl}
                  alt={message.content || "Foto enviada"}
                  className="stitch-msg-image-thumb"
                  onClick={() => onImageClick?.(effectiveMediaUrl)}
                  loading="lazy"
                />
                {message.content && (
                  <p className="stitch-msg-text caption">{message.content}</p>
                )}
              </div>
            )}

            {/* Áudio de Voz */}
            {type === "audio" && effectiveMediaUrl && (
              <div className="stitch-msg-audio-wrap">
                <AudioPlayer src={effectiveMediaUrl} duration={message.duration} />
              </div>
            )}

            {/* Arquivo / Documento */}
            {type === "file" && effectiveMediaUrl && (
              <div
                className="stitch-msg-file-card"
                onClick={() => {
                  if (isPdf && onPdfClick) {
                    onPdfClick(effectiveMediaUrl, message.fileName || "documento.pdf");
                  }
                }}
              >
                <div className="stitch-file-icon">
                  <span className={`material-symbols-outlined text-[20px] ${isPdf ? "text-rose-400" : "text-violet-400"}`}>
                    {isPdf ? "picture_as_pdf" : "description"}
                  </span>
                </div>
                <div className="stitch-file-meta">
                  <strong className="stitch-file-name">
                    {message.fileName || "Documento"}
                  </strong>
                  <span className="stitch-file-size">
                    {formatBytes(message.fileSize)}
                    {isPdf && " • Visualizar PDF"}
                  </span>
                </div>
                <a
                  href={effectiveMediaUrl}
                  download={message.fileName || "arquivo"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="stitch-file-dl-btn"
                  onClick={(e) => e.stopPropagation()}
                  title="Baixar arquivo"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                </a>
              </div>
            )}

            {/* Texto com Links Clicáveis e Preview Card */}
            {type === "text" && (
              <div className="stitch-msg-text-block">
                <p className="stitch-msg-text">
                  {textSegments.map((segment, idx) =>
                    segment.type === "link" ? (
                      <a
                        key={idx}
                        href={segment.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="stitch-inline-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {segment.content}
                      </a>
                    ) : (
                      <span key={idx}>{segment.content}</span>
                    ),
                  )}
                </p>
                {firstUrl && (
                  <div className="stitch-msg-preview-wrap">
                    <LinkPreviewCard url={firstUrl} token={token} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Linha de Reações Agrupadas */}
        {groupedReactions.size > 0 && !isDeleted && (
          <div className="stitch-msg-reactions-row">
            {Array.from(groupedReactions.entries()).map(([emoji, data]) => (
              <button
                key={emoji}
                type="button"
                className={`stitch-reaction-chip ${data.hasMine ? "reacted" : ""}`}
                onClick={() => onReaction?.(message.id, emoji)}
                title={`${data.count} reaç${data.count === 1 ? "ão" : "ões"}`}
              >
                <span className="stitch-reaction-emoji">{emoji}</span>
                <span className="stitch-reaction-count">{data.count}</span>
              </button>
            ))}
            <button
              type="button"
              className="stitch-reaction-add-btn"
              onClick={() => setShowReactionPicker((prev) => !prev)}
              title="Adicionar Reação"
            >
              <span className="material-symbols-outlined text-[14px]">
                add_reaction
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Barra de Ações Flutuante no Hover (Discord Toolbar) */}
      {!isDeleted && (
        <div className="stitch-msg-hover-toolbar">
          {showReactionPicker && (
            <div className="stitch-hover-quick-emojis">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="stitch-quick-emoji-btn"
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
            className="stitch-hover-btn"
            onClick={() => setShowReactionPicker((prev) => !prev)}
            title="Adicionar Reação"
          >
            <span className="material-symbols-outlined text-[16px]">add_reaction</span>
          </button>

          <button
            type="button"
            className="stitch-hover-btn"
            onClick={() => onReply?.(message)}
            title="Responder"
          >
            <span className="material-symbols-outlined text-[16px]">reply</span>
          </button>

          <button
            type="button"
            className={`stitch-hover-btn ${isPinned ? "is-active" : ""}`}
            onClick={() => onPin?.(message.id)}
            title={isPinned ? "Desafixar" : "Fixar"}
          >
            <span className="material-symbols-outlined text-[16px]">push_pin</span>
          </button>

          <button
            type="button"
            className={`stitch-hover-btn ${isStarred ? "is-starred" : ""}`}
            onClick={() => onToggleStar?.(message.id)}
            title={isStarred ? "Desfavoritar" : "Favoritar"}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isStarred ? "star" : "star_outline"}
            </span>
          </button>

          <button
            type="button"
            className="stitch-hover-btn"
            onClick={() => onForward?.(message)}
            title="Encaminhar"
          >
            <span className="material-symbols-outlined text-[16px]">forward</span>
          </button>

          {isMine && type === "text" && (
            <button
              type="button"
              className="stitch-hover-btn"
              onClick={() => onEdit?.(message)}
              title="Editar"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
            </button>
          )}

          {isMine && (
            <button
              type="button"
              className="stitch-hover-btn danger"
              onClick={() => {
                if (window.confirm("Deseja apagar esta mensagem para todos?")) {
                  onDelete?.(message.id);
                }
              }}
              title="Apagar mensagem"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}


