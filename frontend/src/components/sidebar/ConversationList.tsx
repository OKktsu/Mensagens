import type { Conversation } from "../../services/api";
import { Avatar } from "../common/Avatar";
import {
  getConversationTitle,
  getConversationInitial,
  formatTime,
} from "../../utils/chat-helpers";

type ConversationListProps = {
  conversations: Conversation[];
  selectedConversationId: string | null;
  currentUserId: string;
  typingMap?: Record<string, string[]>;
  onlineUserIds?: Set<string>;
  onSelectConversation: (conversationId: string) => void;
};

export function ConversationList({
  conversations,
  selectedConversationId,
  currentUserId,
  typingMap,
  onlineUserIds,
  onSelectConversation,
}: ConversationListProps) {
  return (
    <section className="conversation-list" aria-label="Lista de conversas">
      {conversations.map((conversation) => {
        const lastMessage = conversation.messages[0];
        const isSelected = conversation.id === selectedConversationId;
        const title = getConversationTitle(conversation, currentUserId);
        const initial = getConversationInitial(conversation, currentUserId);
        const typers = typingMap?.[conversation.id] ?? [];
        const isTyping = typers.length > 0;
        
        const isGroup = Boolean(conversation.title || conversation.members.length > 2);
        const otherMember = conversation.members.find((m) => m.user.id !== currentUserId);
        const isOnline = !isGroup && otherMember ? Boolean(onlineUserIds?.has(otherMember.user.id)) : false;

        return (
          <button
            className={isSelected ? "conversation-item selected" : "conversation-item"}
            type="button"
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <Avatar initial={initial} isOnline={isOnline} />
            <span className="conversation-content">

              <span className="conversation-topline">
                <strong>{title}</strong>
                <small>{formatTime(conversation.updatedAt)}</small>
              </span>
              <span className="conversation-bottomline">
                {isTyping ? (
                  <span className="typing-preview">digitando...</span>
                ) : (
                  <span className="message-snippet">{lastMessage?.content ?? "Conversa criada"}</span>
                )}
                {Boolean(conversation.unreadCount && conversation.unreadCount > 0) && (
                  <span className="unread-badge">{conversation.unreadCount}</span>
                )}
              </span>
            </span>
          </button>
        );
      })}
    </section>
  );
}

