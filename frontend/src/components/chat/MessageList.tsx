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

  const recipientReadDate = recipientLastReadAt ? new Date(recipientLastReadAt).getTime() : 0;
  const isGroup = Boolean(conversation?.title || (conversation && conversation.members.length > 2));
  const convTitle = conversation ? getConversationTitle(conversation, currentUserId) : "";
  const convInitial = conversation ? getConversationInitial(conversation, currentUserId) : "";

  return (
    <div className="stitch-message-stream-viewport" role="log" aria-label="Histórico de mensagens">
      {/* Welcome Card de Início da Conversa estilo Stitch */}
      {conversation && (
        <div className="stitch-welcome-card">
          <div className="stitch-welcome-avatar-wrap">
            <span className="stitch-welcome-avatar-letter">{convInitial}</span>
          </div>
          <h1 className="stitch-welcome-title">{convTitle}</h1>
          <p className="stitch-welcome-handle">
            {isGroup ? `${conversation.members.length} membros no squad` : `@${convTitle.toLowerCase().replace(/\s+/g, ".")}`}
          </p>
          <p className="stitch-welcome-desc">
            {isGroup
              ? `Este é o início do canal #${convTitle}. Compartilhe arquivos, debata ideias e colabore em tempo real.`
              : `Este é o início do seu histórico de mensagens diretas com ${convTitle}. Troque ideias, arquivos e áudios com segurança.`}
          </p>
        </div>
      )}

      {/* Lista de Mensagens */}
      {messages.map((message, index) => {
        const isMine = message.sender.id === currentUserId;
        const msgTime = new Date(message.createdAt).getTime();
        const isRead = isMine && recipientReadDate >= msgTime;
        const isPinned = pinnedMessageId === message.id;

        const previousMessage = messages[index - 1];
        const showDateDivider =
          !previousMessage || !isSameDay(previousMessage.createdAt, message.createdAt);

        return (
          <Fragment key={message.id}>
            {showDateDivider && (
              <div className="stitch-date-divider">
                <div className="stitch-date-divider-line" />
                <span className="stitch-date-divider-label">
                  {formatDateDivider(message.createdAt)}
                </span>
                <div className="stitch-date-divider-line" />
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
            />
          </Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}




