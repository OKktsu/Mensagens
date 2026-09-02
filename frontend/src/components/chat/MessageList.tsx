import type { Message } from "../../services/api";
import { MessageItem } from "./MessageItem";

type MessageListProps = {
  messages: Message[];
  currentUserId: string;
};

export function MessageList({ messages, currentUserId }: MessageListProps) {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isMine={message.sender.id === currentUserId}
        />
      ))}
    </div>
  );
}
