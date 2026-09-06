import type { Conversation } from "../../services/api";
import { Avatar } from "../common/Avatar";
import {
  getConversationTitle,
  getConversationInitial,
} from "../../utils/chat-helpers";

type ChatHeaderProps = {
  conversation: Conversation | null;
  currentUserId: string;
  currentUserName: string;
  typingText?: string | null;
  isOnline?: boolean;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
  onToggleSearch?: () => void;
  pinnedCount?: number;
};

// Gera tags de função baseadas no nome
function getUserBadges(name: string): string[] {
  const lower = name.toLowerCase();
  const badges: string[] = [];
  if (lower.includes("dev") || lower.includes("eliezer")) {
    badges.push("AMIGO", "CORE DEV");
  } else if (lower.includes("joao") || lower.includes("front")) {
    badges.push("FRONTEND");
  } else if (lower.includes("marcelo") || lower.includes("design")) {
    badges.push("DESIGN");
  } else if (lower.includes("admin") || lower.includes("lucas")) {
    badges.push("ADMIN", "PULSE PRO");
  } else {
    badges.push("AMIGO");
  }
  return badges;
}

export function ChatHeader({
  conversation,
  currentUserId,
  currentUserName,
  typingText,
  isOnline,
  onStartVoiceCall,
  onStartVideoCall,
  onToggleSearch,
  pinnedCount = 0,
}: ChatHeaderProps) {
  const isGroup = Boolean(
    conversation?.title || (conversation && conversation.members.length > 2),
  );
  const title = conversation
    ? getConversationTitle(conversation, currentUserId)
    : "Selecione uma conversa";
  const initial = conversation
    ? getConversationInitial(conversation, currentUserId)
    : "?";
  const badges = getUserBadges(title);
  const otherMember = conversation?.members.find(
    (m) => (m.userId || m.user?.id) !== currentUserId,
  );
  const userHandle = otherMember
    ? `@${otherMember.user.email.split("@")[0]}`
    : isGroup
      ? `${conversation?.members.length} membros`
      : "";

  return (
    <header className="stitch-chat-header" aria-label="Cabeçalho da conversa">
      {conversation ? (
        <div className="stitch-header-left">
          {/* Avatar com squircle e indicador de presença */}
          <div className="stitch-header-avatar-wrap">
            <Avatar
              initial={initial}
              isOnline={!isGroup && isOnline}
              size="medium"
            />
          </div>

          <div className="stitch-header-info">
            <div className="stitch-header-title-row">
              <span className="stitch-header-title">{title}</span>
              {userHandle && <span className="stitch-header-handle">{userHandle}</span>}
              {!isGroup && (
                <div className="stitch-header-badges">
                  {badges.map((b, i) => (
                    <span
                      key={b}
                      className={`stitch-role-badge ${i === 0 ? "accent" : "subtle"}`}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Subtítulo / Status de Digitação / Presença */}
            <div className="stitch-header-status-row">
              {typingText ? (
                <div className="stitch-header-typing">
                  <span className="stitch-typing-dot" />
                  <span className="stitch-typing-text">{typingText}</span>
                </div>
              ) : isGroup ? (
                <span className="stitch-header-desc">
                  {conversation.members.length} membros no squad
                </span>
              ) : isOnline ? (
                <div className="stitch-header-online">
                  <span className="stitch-status-dot online" />
                  <span className="stitch-status-label">Online</span>
                </div>
              ) : (
                <div className="stitch-header-offline">
                  <span className="stitch-status-dot offline" />
                  <span className="stitch-status-label">Offline</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="stitch-header-empty">
          <span className="stitch-header-title">Nenhuma conversa selecionada</span>
          <span className="stitch-header-desc">Escolha um contato ou squad para conversar</span>
        </div>
      )}

      {/* Quick Action Toolbar */}
      {conversation && (
        <div className="stitch-header-actions">
          {onStartVoiceCall && (
            <button
              type="button"
              className="stitch-action-btn"
              onClick={onStartVoiceCall}
              title={isGroup ? "Iniciar chamada de voz em grupo" : "Iniciar chamada de voz"}
              aria-label="Chamada de voz"
            >
              <span className="material-symbols-outlined text-[19px]">call</span>
            </button>
          )}

          {onStartVideoCall && (
            <button
              type="button"
              className="stitch-action-btn"
              onClick={onStartVideoCall}
              title={isGroup ? "Iniciar chamada de vídeo em grupo" : "Iniciar chamada de vídeo"}
              aria-label="Chamada de vídeo"
            >
              <span className="material-symbols-outlined text-[19px]">videocam</span>
            </button>
          )}

          {Boolean(conversation.pinnedMessageId) && (
            <button
              type="button"
              className="stitch-action-btn pinned active"
              title="Mensagens fixadas"
              aria-label="Mensagens fixadas"
            >
              <span className="material-symbols-outlined text-[19px]">push_pin</span>
              <span className="stitch-btn-dot" />
            </button>
          )}

          <div className="stitch-header-divider" />

          {/* Campo de busca na conversa */}
          <div className="stitch-header-search">
            <input
              type="text"
              placeholder="Buscar na conversa..."
              className="stitch-header-search-input"
            />
            <span className="material-symbols-outlined stitch-search-icon">search</span>
          </div>
        </div>
      )}
    </header>
  );
}



