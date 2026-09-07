import { useEffect, useRef, Fragment } from "react";
import type { Message, Conversation } from "../../services/api";
import { MessageItem } from "./MessageItem";
import { formatDateDivider, isSameDay, getConversationTitle, getConversationInitial } from "../../utils/chat-helpers";

type MessageListProps = {
  messages: Message[];
  conversation?: Conversation | null;
  currentUserId: string;
  recipientLastReadAt?: string | null;
  pinnedMessageId?: string | null;
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
  onUserClick?: (user: import("../../services/api").User) => void;
};

export function MessageList({
  messages,
  conversation,
  currentUserId,
  recipientLastReadAt,
  pinnedMessageId,
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
  onUserClick,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Rola automaticamente para a última mensagem com efeito suave
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-pulse");
      setTimeout(() => {
        el.classList.remove("highlight-pulse");
      }, 1500);
    }
  };

  if (!conversation) {
    return (
      <div className="stitch-empty-messages-pane">
        <span className="material-symbols-outlined stitch-empty-hero-icon">forum</span>
        <h3 className="stitch-empty-title">Nenhuma conversa selecionada</h3>
        <p className="stitch-empty-subtitle">Selecione uma conversa ao lado para começar a interagir.</p>
      </div>
    );
  }

  return (
    <div className="stitch-message-stream-scroll" aria-label="Histórico de Mensagens">
      {/* Banner de início de conversa */}
      <div className="stitch-conversation-starter-card">
        <div className="starter-avatar-circle">
          <span>{getConversationInitial(conversation, currentUserId)}</span>
        </div>
        <h2 className="starter-title">{getConversationTitle(conversation, currentUserId)}</h2>
        <p className="starter-description">
          Este é o início da sua história de mensagens com <strong>{getConversationTitle(conversation, currentUserId)}</strong>.
        </p>
      </div>

      {messages.map((message, index) => {
        const isMine = message.sender?.id === currentUserId;
        const isRead = Boolean(
          recipientLastReadAt && new Date(message.createdAt) <= new Date(recipientLastReadAt),
        );
        const isPinned = Boolean(pinnedMessageId && message.id === pinnedMessageId);
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showDateDivider = !prevMessage || !isSameDay(prevMessage.createdAt, message.createdAt);

        return (
          <Fragment key={message.id}>
            {showDateDivider && (
              <div className="stitch-date-separator">
                <span className="stitch-date-bubble">{formatDateDivider(message.createdAt)}</span>
              </div>
            )}
            <MessageItem
              message={message}
              currentUserId={currentUserId}
              isMine={isMine}
              isRead={isRead}
              isPinned={isPinned}
              token={token}
              onImageClick={onImageClick}
              onPdfClick={onPdfClick}
              onReply={onReply}
              onForward={onForward}
              onEdit={onEdit}
              onDelete={onDelete}
              onReaction={onReaction}
              onToggleStar={onToggleStar}
              onPin={onPin}
              onJumpToQuotedMessage={handleJumpToMessage}
              onUserClick={onUserClick}
            />
          </Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}




