import { useMemo } from "react";
import type { Conversation } from "../../services/api";
import { Avatar } from "../common/Avatar";
import {
  getConversationTitle,
  getConversationInitial,
  formatTime,
} from "../../utils/chat-helpers";
import type { SidebarTab } from "./SidebarHeader";

type ConversationListProps = {
  conversations: Conversation[];
  selectedConversationId: string | null;
  currentUserId: string;
  typingMap?: Record<string, string[]>;
  onlineUserIds?: Set<string>;
  filterTab?: SidebarTab;
  onSelectConversation: (conversationId: string) => void;
  onOpenCreateGroup?: () => void;
  onOpenNewDm?: () => void;
  onStartVoiceCall?: (userId: string, userName: string, conversationId?: string) => void;
};

// Gera um badge de função baseado no nome/email para dar o visual rico cyberpunk do Stitch
function getUserRoleBadge(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("eliezer") || lower.includes("dev")) return "CORE DEV";
  if (lower.includes("joao") || lower.includes("front")) return "FRONTEND";
  if (lower.includes("marcelo") || lower.includes("design")) return "DESIGN";
  if (lower.includes("admin") || lower.includes("lucas")) return "ADMIN";
  return "AMIGO";
}

// Gera um ícone temático para grupos
function getGroupIcon(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("rocket") || lower.includes("hq")) return "rocket_launch";
  if (lower.includes("dev") || lower.includes("code")) return "code";
  if (lower.includes("design") || lower.includes("ui")) return "palette";
  if (lower.includes("game") || lower.includes("jogos")) return "sports_esports";
  return "group";
}

export function ConversationList({
  conversations,
  selectedConversationId,
  currentUserId,
  typingMap,
  onlineUserIds,
  filterTab = "all",
  onSelectConversation,
  onOpenCreateGroup,
  onOpenNewDm,
  onStartVoiceCall,
}: ConversationListProps) {
  // Separa grupos e DMs
  const { squads, dms } = useMemo(() => {
    const squadsList: Conversation[] = [];
    const dmsList: Conversation[] = [];

    for (const conv of conversations) {
      const isGroup = Boolean(conv.title || conv.members.length > 2);
      if (isGroup) {
        squadsList.push(conv);
      } else {
        dmsList.push(conv);
      }
    }

    return { squads: squadsList, dms: dmsList };
  }, [conversations]);

  const showSquads = filterTab === "all" || filterTab === "chats" || filterTab === "squads";
  const showDms = filterTab === "all" || filterTab === "chats" || filterTab === "dms";

  return (
    <div className="conversation-stream-viewport" role="region" aria-label="Lista de canais e mensagens">
      <div className="conversation-stream-inner">
        {/* ==========================================================================
            SEÇÃO 1: GRUPOS & SQUADS
           ========================================================================== */}
        {showSquads && (
          <section className="stream-section" aria-label="Grupos e Squads">
            <div className="section-header-row">
              <span className="section-header-title">
                <span className="material-symbols-outlined text-[13px] text-violet-400">hub</span>
                <span>Grupos &amp; Squads</span>
              </span>
              {onOpenCreateGroup && (
                <button
                  type="button"
                  className="section-add-btn"
                  onClick={onOpenCreateGroup}
                  title="Criar novo squad"
                  aria-label="Novo Squad"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                </button>
              )}
            </div>

            <div className="stream-items-list">
              {squads.map((conversation) => {
                const isSelected = conversation.id === selectedConversationId;
                const title = getConversationTitle(conversation, currentUserId);
                const lastMessage = conversation.messages[0];
                const iconName = getGroupIcon(title);
                const typers = typingMap?.[conversation.id] ?? [];
                const isTyping = typers.length > 0;

                return (
                  <div
                    key={conversation.id}
                    className={`stream-item-card squad-card ${isSelected ? "is-active" : ""}`}
                    onClick={() => onSelectConversation(conversation.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="item-left-avatar">
                      <div className="squad-icon-squircle">
                        <span className="material-symbols-outlined text-[18px] text-purple-400">{iconName}</span>
                      </div>
                    </div>

                    <div className="item-center-info">
                      <div className="item-header-line">
                        <span className="item-title">{title}</span>
                        <span className="item-time-stamp">{formatTime(conversation.updatedAt)}</span>
                      </div>

                      <div className="item-subtitle-line">
                        {isTyping ? (
                          <div className="typing-pulse-row">
                            <span className="typing-dot" />
                            <span className="typing-label">alguém digitando...</span>
                          </div>
                        ) : (
                          <span className="item-snippet">
                            {lastMessage?.content || `${conversation.members.length} membros`}
                          </span>
                        )}

                        {Boolean(conversation.unreadCount && conversation.unreadCount > 0) && (
                          <span className="item-unread-pill">{conversation.unreadCount}</span>
                        )}
                      </div>
                    </div>

                    {/* Botão de chamada rápida ao passar o mouse */}
                    {onStartVoiceCall && (
                      <button
                        type="button"
                        className="squad-quick-call-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartVoiceCall("", title, conversation.id);
                        }}
                        title="Conectar à call do squad"
                        aria-label="Conectar à call"
                      >
                        <span className="material-symbols-outlined text-[13px]">call</span>
                      </button>
                    )}
                  </div>
                );
              })}

              {squads.length === 0 && (
                <div className="stream-empty-hint">
                  <span>Nenhum squad criado ainda.</span>
                  {onOpenCreateGroup && (
                    <button type="button" className="empty-action-link" onClick={onOpenCreateGroup}>
                      + Criar Squad
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ==========================================================================
            SEÇÃO 2: MENSAGENS DIRETAS (DMS)
           ========================================================================== */}
        {showDms && (
          <section className="stream-section" aria-label="Mensagens Diretas">
            <div className="section-header-row">
              <span className="section-header-title">
                <span className="material-symbols-outlined text-[13px] text-violet-400">chat_bubble</span>
                <span>Mensagens Diretas</span>
              </span>
              <button
                type="button"
                className="section-add-btn"
                onClick={onOpenNewDm || onOpenCreateGroup}
                title="Iniciar nova conversa"
                aria-label="Nova DM"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
              </button>
            </div>

            <div className="stream-items-list">
              {dms.map((conversation) => {
                const isSelected = conversation.id === selectedConversationId;
                const title = getConversationTitle(conversation, currentUserId);
                const initial = getConversationInitial(conversation, currentUserId);
                const otherMember = conversation.members.find((m) => m.user.id !== currentUserId);
                const isOnline = otherMember ? Boolean(onlineUserIds?.has(otherMember.user.id)) : false;
                const lastMessage = conversation.messages[0];
                const typers = typingMap?.[conversation.id] ?? [];
                const isTyping = typers.length > 0;
                const roleBadge = getUserRoleBadge(title);

                return (
                  <div
                    key={conversation.id}
                    className={`stream-item-card dm-card ${isSelected ? "is-active" : ""}`}
                    onClick={() => onSelectConversation(conversation.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="item-left-avatar">
                      <Avatar initial={initial} isOnline={isOnline} size="small" />
                    </div>

                    <div className="item-center-info">
                      <div className="item-header-line">
                        <div className="item-title-with-badge">
                          <span className="item-title">{title}</span>
                          <span className="item-role-badge">{roleBadge}</span>
                        </div>
                        <span className="item-time-stamp">{formatTime(conversation.updatedAt)}</span>
                      </div>

                      <div className="item-subtitle-line">
                        {isTyping ? (
                          <div className="typing-pulse-row">
                            <span className="typing-dot" />
                            <span className="typing-label">digitando no chat...</span>
                          </div>
                        ) : (
                          <span className="item-snippet">
                            {lastMessage?.content || "Conversa iniciada"}
                          </span>
                        )}

                        {Boolean(conversation.unreadCount && conversation.unreadCount > 0) && (
                          <span className="item-unread-pill">{conversation.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {dms.length === 0 && (
                <div className="stream-empty-hint">
                  <span>Nenhuma mensagem direta ainda.</span>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
