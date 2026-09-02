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
  typingText?: string | null;
  onMessageChange: (text: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
};

export function ChatPanel({
  selectedConversation,
  currentUserId,
  currentUserName,
  error,
  messages,
  messageText,
  typingText,
  onMessageChange,
  onSendMessage,
  onTypingStart,
  onTypingStop,
}: ChatPanelProps) {
  return (
    <section className="chat-panel" aria-label="Conversa aberta">
      <ChatHeader
        conversation={selectedConversation}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        typingText={typingText}
      />

      {error && <p className="inline-error">{error}</p>}

      <MessageList messages={messages} currentUserId={currentUserId} />

      <MessageInput
        messageText={messageText}
        onMessageChange={onMessageChange}
        onSendMessage={onSendMessage}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
        disabled={!selectedConversation}
      />
    </section>
  );
}

