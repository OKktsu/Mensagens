import { useEffect, useRef, Fragment } from "react";
import type { Message } from "../../services/api";
import { MessageItem } from "./MessageItem";
import { formatDateDivider, isSameDay } from "../../utils/chat-helpers";

type MessageListProps = {
  messages: Message[];
  currentUserId: string;
  recipientLastReadAt?: string | null;
};

export function MessageList({
  messages,
  currentUserId,
  recipientLastReadAt,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Rola automaticamente para a última mensagem com efeito suave
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const recipientReadDate = recipientLastReadAt ? new Date(recipientLastReadAt).getTime() : 0;

  return (
    <div className="message-list">
      {messages.map((message, index) => {
        const isMine = message.sender.id === currentUserId;
        const msgTime = new Date(message.createdAt).getTime();
        const isRead = isMine && recipientReadDate >= msgTime;

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
              isMine={isMine}
              isRead={isRead}
            />
          </Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

