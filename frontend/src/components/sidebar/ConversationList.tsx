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
  onSelectConversation: (conversationId: string) => void;
};

export function ConversationList({
  conversations,
  selectedConversationId,
  currentUserId,
  onSelectConversation,
}: ConversationListProps) {
  return (
    <section className="conversation-list" aria-label="Lista de conversas">
      {conversations.map((conversation) => {
        const lastMessage = conversation.messages[0];
        const isSelected = conversation.id === selectedConversationId;
        const title = getConversationTitle(conversation, currentUserId);
        const initial = getConversationInitial(conversation, currentUserId);

        return (
          <button
            className={isSelected ? "conversation-item selected" : "conversation-item"}
            type="button"
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <Avatar initial={initial} />
            <span className="conversation-content">
              <span className="conversation-topline">
                <strong>{title}</strong>
                <small>{formatTime(conversation.updatedAt)}</small>
              </span>
              <span>{lastMessage?.content ?? "Conversa criada"}</span>
            </span>
          </button>
        );
      })}
    </section>
  );
}
