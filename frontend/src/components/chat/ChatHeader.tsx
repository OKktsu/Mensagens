import type { Conversation } from "../../services/api";
import { Avatar } from "../common/Avatar";
import { getConversationTitle, getConversationInitial } from "../../utils/chat-helpers";

type ChatHeaderProps = {
  conversation: Conversation | null;
  currentUserId: string;
  currentUserName: string;
  typingText?: string | null;
  isOnline?: boolean;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
};

export function ChatHeader({
  conversation,
  currentUserId,
  currentUserName,
  typingText,
  isOnline,
  onStartVoiceCall,
  onStartVideoCall,
}: ChatHeaderProps) {
  const isGroup = Boolean(conversation?.title || (conversation && conversation.members.length > 2));

  return (
    <header className="chat-header">
      {conversation ? (
        <>
          <div className="chat-header-user">
            <Avatar
              initial={getConversationInitial(conversation, currentUserId)}
              isOnline={!isGroup && isOnline}
            />
            <div>
              <strong>{getConversationTitle(conversation, currentUserId)}</strong>
              {typingText ? (
                <span className="typing-indicator">{typingText}</span>
              ) : isGroup ? (
                <span>{conversation.members.length} membros</span>
              ) : isOnline ? (
                <span className="status-online">Online</span>
              ) : (
                <span className="status-offline">Offline</span>
              )}
            </div>
          </div>

          {!isGroup && (onStartVoiceCall || onStartVideoCall) && (
            <div className="chat-header-actions">
              {onStartVoiceCall && (
                <button
                  type="button"
                  className="header-call-btn"
                  onClick={onStartVoiceCall}
                  title="Iniciar chamada de voz"
                  aria-label="Chamada de voz"
                >
                  📞
                </button>
              )}
              {onStartVideoCall && (
                <button
                  type="button"
                  className="header-call-btn video"
                  onClick={onStartVideoCall}
                  title="Iniciar chamada de vídeo"
                  aria-label="Chamada de vídeo"
                >
                  📹
                </button>
              )}
            </div>
          )}
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


