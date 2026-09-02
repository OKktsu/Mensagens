import type { Message } from "../../services/api";

type MessageItemProps = {
  message: Message;
  isMine: boolean;
};

export function MessageItem({ message, isMine }: MessageItemProps) {
  const className = isMine ? "message mine" : "message";

  return (
    <article className={className}>
      <span>{message.sender.name}</span>
      <p>{message.content}</p>
    </article>
  );
}
