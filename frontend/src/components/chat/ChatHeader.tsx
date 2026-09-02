import type { Conversation } from "../../services/api";
import { Avatar } from "../common/Avatar";
import { getConversationTitle, getConversationInitial } from "../../utils/chat-helpers";

type ChatHeaderProps = {
  conversation: Conversation | null;
  currentUserId: string;
  currentUserName: string;
};

export function ChatHeader({
  conversation,
  currentUserId,
  currentUserName,
}: ChatHeaderProps) {
  return (
    <header className="chat-header">
      {conversation ? (
        <>
          <Avatar initial={getConversationInitial(conversation, currentUserId)} />
          <div>
            <strong>{getConversationTitle(conversation, currentUserId)}</strong>
            <span>{currentUserName}</span>
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
