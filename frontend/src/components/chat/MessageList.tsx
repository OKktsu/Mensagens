import { useEffect, useRef, Fragment } from "react";
import type { Message } from "../../services/api";
import { MessageItem } from "./MessageItem";
import { formatDateDivider, isSameDay } from "../../utils/chat-helpers";

type MessageListProps = {
  messages: Message[];
  currentUserId: string;
  recipientLastReadAt?: string | null;
  pinnedMessageId?: string | null;
  onImageClick?: (url: string) => void;
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
  currentUserId,
  recipientLastReadAt,
  pinnedMessageId,
  onImageClick,
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

  return (
    <div className="message-list">
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
              <div className="date-divider">
                <span>{formatDateDivider(message.createdAt)}</span>
              </div>
            )}
            <MessageItem
              message={message}
              currentUserId={currentUserId}
              isMine={isMine}
              isRead={isRead}
              isPinned={isPinned}
              onImageClick={onImageClick}
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



