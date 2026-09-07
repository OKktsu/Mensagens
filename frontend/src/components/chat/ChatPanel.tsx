import { FormEvent, useState } from "react";
import type { Conversation, Message } from "../../services/api";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { GroupCallBanner } from "./GroupCallBanner";
import { PinnedMessageBanner } from "./PinnedMessageBanner";
import { ChatDetailsSidebar } from "./ChatDetailsSidebar";

type ChatPanelProps = {
  selectedConversation: Conversation | null;
  currentUserId: string;
  currentUserName: string;
  error: string;
  messages: Message[];
  messageText: string;
  typingText?: string | null;
  isOnline?: boolean;
  onlineUserIds?: Set<string>;
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
  token?: string | null;
  onImageClick?: (url: string) => void;
  onPdfClick?: (url: string, fileName?: string) => void;
  onUserClick?: (user: import("../../services/api").User) => void;
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
  onlineUserIds,
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
  token,
  onImageClick,
  onPdfClick,
  onUserClick,
  onMessageChange,
  onSendMessage,
  onTypingStart,
  onTypingStop,
}: ChatPanelProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    <div className="chat-panel-layout">
      <section className="chat-panel" aria-label="Conversa aberta">
        <ChatHeader
          conversation={selectedConversation}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          typingText={typingText}
          isOnline={isOnline}
          onStartVoiceCall={onStartVoiceCall}
          onStartVideoCall={onStartVideoCall}
          onUserClick={onUserClick}
          isDetailsOpen={isDetailsOpen}
          onToggleDetails={() => setIsDetailsOpen((prev) => !prev)}
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
          conversation={selectedConversation}
          currentUserId={currentUserId}
          recipientLastReadAt={recipientLastReadAt}
          pinnedMessageId={selectedConversation?.pinnedMessageId}
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
          onUserClick={onUserClick}
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

      {/* 3ª COLUNA LATERAL DE INFORMAÇÕES, MÍDIAS, ARQUIVOS, LINKS E FIXADAS */}
      <ChatDetailsSidebar
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        conversation={selectedConversation}
        currentUserId={currentUserId}
        messages={messages}
        onlineUserIds={onlineUserIds}
        onStartVoiceCall={onStartVoiceCall}
        onStartVideoCall={onStartVideoCall}
        onImageClick={onImageClick}
        onPdfClick={onPdfClick}
        onJumpToMessage={handleJumpToMessage}
        onUserClick={onUserClick}
      />
    </div>
  );
}




