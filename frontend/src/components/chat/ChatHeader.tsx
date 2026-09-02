import type { Conversation } from "../../services/api";
import { Avatar } from "../common/Avatar";
import { getConversationTitle, getConversationInitial } from "../../utils/chat-helpers";

type ChatHeaderProps = {
  conversation: Conversation | null;
  currentUserId: string;
  currentUserName: string;
  typingText?: string | null;
};

export function ChatHeader({
  conversation,
  currentUserId,
  currentUserName,
  typingText,
}: ChatHeaderProps) {
  return (
    <header className="chat-header">
      {conversation ? (
        <>
          <Avatar initial={getConversationInitial(conversation, currentUserId)} />
          <div>
            <strong>{getConversationTitle(conversation, currentUserId)}</strong>
            {typingText ? (
              <span className="typing-indicator">{typingText}</span>
            ) : (
              <span>{currentUserName}</span>
            )}
          </div>
        </>
      ) : (
        <div>
          <strong>Nenhuma conversa</strong>
          <span>Escolha um usuário para começar</span>
        </div>
      )}
    </header>
  );
}

