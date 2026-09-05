import { FormEvent } from "react";
import type { Conversation, Message } from "../../services/api";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { GroupCallBanner } from "./GroupCallBanner";
import { PinnedMessageBanner } from "./PinnedMessageBanner";

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
  replyingToMessage?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (newContent: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onToggleStar?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: () => void;
  activeGroupCallBanner?: {
    isActive: boolean;
    callType: "audio" | "video";
    participantCount: number;
    initiatorName: string;
  };
  onJoinGroupCall?: () => void;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
  onSendFile?: (file: File) => void;
  onSendVoiceNote?: (audioBlob: Blob, duration: number) => void;
  onImageClick?: (url: string) => void;
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
  replyingToMessage,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReaction,
  onToggleStar,
  onPin,
  onUnpin,
  activeGroupCallBanner,
  onJoinGroupCall,
  onStartVoiceCall,
  onStartVideoCall,
  onSendFile,
  onSendVoiceNote,
  onImageClick,
  onMessageChange,
  onSendMessage,
  onTypingStart,
  onTypingStop,
}: ChatPanelProps) {
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

      {/* BANNER DE MENSAGEM FIXADA */}
      {selectedConversation?.pinnedMessage && onUnpin && (
        <PinnedMessageBanner
          pinnedMessage={selectedConversation.pinnedMessage}
          onJumpToMessage={handleJumpToMessage}
          onUnpin={onUnpin}
        />
      )}

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
        pinnedMessageId={selectedConversation?.pinnedMessageId}
        onImageClick={onImageClick}
        onReply={onReply}
        onForward={onForward}
        onEdit={onEdit}
        onDelete={onDelete}
        onReaction={onReaction}
        onToggleStar={onToggleStar}
        onPin={onPin}
      />

      <MessageInput
        messageText={messageText}
        onMessageChange={onMessageChange}
        onSendMessage={onSendMessage}
        onSendFile={onSendFile}
        onSendVoiceNote={onSendVoiceNote}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
        replyingToMessage={replyingToMessage}
        onCancelReply={onCancelReply}
        editingMessage={editingMessage}
        onCancelEdit={onCancelEdit}
        onSaveEdit={onSaveEdit}
        disabled={!selectedConversation}
      />
    </section>
  );
}




