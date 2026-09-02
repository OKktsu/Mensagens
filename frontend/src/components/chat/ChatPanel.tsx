import { FormEvent } from "react";
import type { Conversation, Message } from "../../services/api";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

type ChatPanelProps = {
  selectedConversation: Conversation | null;
  currentUserId: string;
  currentUserName: string;
  error: string;
  messages: Message[];
  messageText: string;
  onMessageChange: (text: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
};

export function ChatPanel({
  selectedConversation,
  currentUserId,
  currentUserName,
  error,
  messages,
  messageText,
  onMessageChange,
  onSendMessage,
}: ChatPanelProps) {
  return (
    <section className="chat-panel" aria-label="Conversa aberta">
      <ChatHeader
        conversation={selectedConversation}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />

      {error && <p className="inline-error">{error}</p>}

      <MessageList messages={messages} currentUserId={currentUserId} />

      <MessageInput
        messageText={messageText}
        onMessageChange={onMessageChange}
        onSendMessage={onSendMessage}
        disabled={!selectedConversation}
      />
    </section>
  );
}
