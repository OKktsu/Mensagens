import { FormEvent } from "react";
import type { Conversation, Message } from "../../services/api";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { GroupCallBanner } from "./GroupCallBanner";

type ChatPanelProps = {
  selectedConversation: Conversation | null;
  currentUserId: string;
  currentUserName: string;
  error: string;
  messages: Message[];
  messageText: string;
  typingText?: string | null;
  isOnline?: boolean;
  recipientLastReadAt?: string | null;
  activeGroupCallBanner?: {
    isActive: boolean;
    callType: "audio" | "video";
    participantCount: number;
    initiatorName: string;
  };
  onJoinGroupCall?: () => void;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
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
  isOnline,
  recipientLastReadAt,
  activeGroupCallBanner,
  onJoinGroupCall,
  onStartVoiceCall,
  onStartVideoCall,
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
        isOnline={isOnline}
        onStartVoiceCall={onStartVoiceCall}
        onStartVideoCall={onStartVideoCall}
      />

      {activeGroupCallBanner && activeGroupCallBanner.isActive && onJoinGroupCall && (
        <GroupCallBanner
          callType={activeGroupCallBanner.callType}
          participantCount={activeGroupCallBanner.participantCount}
          initiatorName={activeGroupCallBanner.initiatorName}
          onJoin={onJoinGroupCall}
        />
      )}




      {error && <p className="inline-error">{error}</p>}

      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        recipientLastReadAt={recipientLastReadAt}
      />

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


