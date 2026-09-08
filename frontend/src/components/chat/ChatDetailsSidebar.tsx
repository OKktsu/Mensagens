import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { Conversation, Message, User } from "../../services/api";
import { extractAllUrls } from "../../utils/link-extractor";
import { DetailsHero } from "./details/DetailsHero";
import { DetailsSectionCard } from "./details/DetailsSectionCard";
import { DetailsMediaGrid } from "./details/DetailsMediaGrid";
import { DetailsDocsList } from "./details/DetailsDocsList";
import { DetailsLinksList, LinkItem } from "./details/DetailsLinksList";
import { DetailsPinnedList } from "./details/DetailsPinnedList";
import { DetailsMembersList } from "./details/DetailsMembersList";

export type DetailsViewMode = "overview" | "media" | "docs" | "links" | "pinned" | "members";

type ChatDetailsSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  currentUserId: string;
  messages: Message[];
  onlineUserIds?: Set<string>;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
  onImageClick?: (url: string) => void;
  onPdfClick?: (url: string, fileName?: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  onUserClick?: (user: User) => void;
};

const PAGE_SIZE = 20;

export function ChatDetailsSidebar({
  isOpen,
  onClose,
  conversation,
  currentUserId,
  messages,
  onlineUserIds,
  onStartVoiceCall,
  onStartVideoCall,
  onImageClick,
  onPdfClick,
  onJumpToMessage,
  onUserClick,
}: ChatDetailsSidebarProps) {
  const [viewMode, setViewMode] = useState<DetailsViewMode>("overview");
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Reseta paginação ao trocar de tela
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [viewMode, conversation?.id]);

  // Tecla ESC para voltar de sub-view ou fechar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (viewMode !== "overview") {
          setViewMode("overview");
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, viewMode, onClose]);

  const isGroup = Boolean(
    conversation?.title || (conversation && conversation.members.length > 2)
  );

  const otherMember = useMemo(() => {
    if (!conversation || isGroup) return null;
    return conversation.members.find(
      (m) => (m.userId || m.user?.id) !== currentUserId
    );
  }, [conversation, isGroup, currentUserId]);

  const targetUser = otherMember?.user;
  const isTargetOnline = Boolean(targetUser && onlineUserIds?.has(targetUser.id));

  // 1. Mídias (Imagens)
  const mediaMessages = useMemo(() => {
    return messages.filter(
      (m) => m.type === "image" && m.fileUrl && !m.isDeleted
    );
  }, [messages]);

  // 2. Arquivos (Documentos / PDFs)
  const docMessages = useMemo(() => {
    return messages.filter(
      (m) => m.type === "file" && m.fileUrl && !m.isDeleted
    );
  }, [messages]);

  // 3. Links compartilhados
  const linkItems = useMemo(() => {
    const items: LinkItem[] = [];
    for (const m of messages) {
      if (m.type === "text" && m.content && !m.isDeleted) {
        const urls = extractAllUrls(m.content);
        for (const u of urls) {
          let domain = "";
          try {
            domain = new URL(u).hostname.replace(/^www\./, "");
          } catch {
            domain = u;
          }
          items.push({
            id: `${m.id}-${u}`,
            url: u,
            domain,
            messageId: m.id,
            senderName: m.sender.name,
            createdAt: m.createdAt,
          });
        }
      }
    }
    return items;
  }, [messages]);

  // 4. Mensagens Fixadas
  const pinnedMessages = useMemo(() => {
    return messages.filter(
      (m) => Boolean(m.id === conversation?.pinnedMessageId) && !m.isDeleted
    );
  }, [messages, conversation?.pinnedMessageId]);

  // 5. Membros do Squad
  const squadMembers = useMemo(() => {
    if (!conversation || !isGroup) return [];
    return conversation.members;
  }, [conversation, isGroup]);

  // Total de itens na subview ativa
  const currentTotalItems = useMemo(() => {
    switch (viewMode) {
      case "media":
        return mediaMessages.length;
      case "docs":
        return docMessages.length;
      case "links":
        return linkItems.length;
      case "pinned":
        return pinnedMessages.length;
      case "members":
        return squadMembers.length;
      default:
        return 0;
    }
  }, [viewMode, mediaMessages.length, docMessages.length, linkItems.length, pinnedMessages.length, squadMembers.length]);

  // Scroll Infinito: carrega mais 20 itens ao aproximar do final
  const handleScroll = useCallback(() => {
    if (viewMode === "overview") return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 120) {
      setVisibleCount((prev) => {
        if (prev < currentTotalItems) {
          return Math.min(prev + PAGE_SIZE, currentTotalItems);
        }
        return prev;
      });
    }
  }, [viewMode, currentTotalItems]);

  if (!isOpen || !conversation) return null;

  const title = isGroup
    ? conversation.title || "Squad em Grupo"
    : targetUser?.name || "Conversa";

  const userHandle = targetUser?.email
    ? `@${targetUser.email.split("@")[0]}`
    : isGroup
    ? `${conversation.members.length} participantes`
    : "";

  const initial = isGroup
    ? conversation.title ? conversation.title.slice(0, 2).toUpperCase() : "SQ"
    : targetUser?.name ? targetUser.name.slice(0, 2).toUpperCase() : "U";

  const memberSinceFormatted = targetUser?.createdAt
    ? new Date(targetUser.createdAt).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Recentemente";

  const getSubViewInfo = () => {
    switch (viewMode) {
      case "media":
        return { label: "Mídias", count: mediaMessages.length, icon: "photo_library", accent: "emerald" };
      case "docs":
        return { label: "Arquivos", count: docMessages.length, icon: "folder_shared", accent: "rose" };
      case "links":
        return { label: "Links", count: linkItems.length, icon: "link", accent: "indigo" };
      case "pinned":
        return { label: "Fixadas", count: pinnedMessages.length, icon: "push_pin", accent: "amber" };
      case "members":
        return { label: "Membros do Squad", count: squadMembers.length, icon: "groups", accent: "violet" };
      default:
        return { label: isGroup ? "Dados do Squad" : "Dados do Contato", count: 0, icon: isGroup ? "groups" : "account_circle", accent: "violet" };
    }
  };

  if (!isOpen) {
    return null;
  }

  const subViewInfo = getSubViewInfo();

  return (
    <aside className="chat-details-sidebar" aria-label="Painel de Informações da Conversa">
      {/* 1. CABEÇALHO COM ACCENT COLOR */}
      <header className="chat-details-header">
        {viewMode !== "overview" ? (
          <div className="chat-details-subview-header">
            <button
              type="button"
              className="chat-details-back-btn"
              onClick={() => setViewMode("overview")}
              title="Voltar para a visão geral (Esc)"
              aria-label="Voltar"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="chat-details-header-title">
              <h3>{subViewInfo.label}</h3>
              <span className={`chat-details-header-badge ${subViewInfo.accent}`}>{subViewInfo.count}</span>
            </div>
          </div>
        ) : (
          <div className="chat-details-header-title">
            <span className="material-symbols-outlined text-[19px] text-violet-400">
              {isGroup ? "groups" : "account_circle"}
            </span>
            <h3>{isGroup ? "Dados do Squad" : "Dados do Contato"}</h3>
          </div>
        )}

        <button
          type="button"
          className="chat-details-close-btn"
          onClick={onClose}
          title="Fechar painel (Esc)"
          aria-label="Fechar painel de detalhes"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      {/* 2. CORPO ROLÁVEL COM SCROLL INFINITO */}
      <div
        className="chat-details-body"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {viewMode === "overview" ? (
          <div className="chat-details-stacked-sections">
            {/* HERO / PERFIL DO CONTATO OU SQUAD */}
            <DetailsHero
              isGroup={isGroup}
              title={title}
              userHandle={userHandle}
              initial={initial}
              targetUser={targetUser}
              isTargetOnline={isTargetOnline}
              memberSinceFormatted={memberSinceFormatted}
              onStartVoiceCall={onStartVoiceCall}
              onStartVideoCall={onStartVideoCall}
            />

            {/* SEÇÃO 1: MÍDIAS (EMERALD) */}
            <DetailsSectionCard
              title="Mídias"
              icon="photo_library"
              count={mediaMessages.length}
              accentColor="emerald"
              onViewAll={() => setViewMode("media")}
              emptyMessage="Nenhuma foto ou vídeo compartilhado"
            >
              <DetailsMediaGrid
                mediaMessages={mediaMessages.slice(0, 3)}
                totalCount={mediaMessages.length}
                onImageClick={onImageClick}
                onViewAll={() => setViewMode("media")}
                isCompact={true}
              />
            </DetailsSectionCard>

            {/* SEÇÃO 2: ARQUIVOS (ROSE / CYAN) */}
            <DetailsSectionCard
              title="Arquivos"
              icon="folder_shared"
              count={docMessages.length}
              accentColor="rose"
              onViewAll={() => setViewMode("docs")}
              emptyMessage="Nenhum arquivo ou documento compartilhado"
            >
              <DetailsDocsList
                docMessages={docMessages.slice(0, 3)}
                onPdfClick={onPdfClick}
                isCompact={true}
              />
            </DetailsSectionCard>

            {/* SEÇÃO 3: LINKS (INDIGO) */}
            <DetailsSectionCard
              title="Links"
              icon="link"
              count={linkItems.length}
              accentColor="indigo"
              onViewAll={() => setViewMode("links")}
              emptyMessage="Nenhum link compartilhado"
            >
              <DetailsLinksList
                linkItems={linkItems.slice(0, 3)}
                onJumpToMessage={onJumpToMessage}
                isCompact={true}
              />
            </DetailsSectionCard>

            {/* SEÇÃO 4: MENSAGENS FIXADAS (AMBER) */}
            <DetailsSectionCard
              title="Fixadas"
              icon="push_pin"
              count={pinnedMessages.length}
              accentColor="amber"
              onViewAll={() => setViewMode("pinned")}
              emptyMessage="Nenhuma mensagem fixada nesta conversa"
            >
              <DetailsPinnedList
                pinnedMessages={pinnedMessages.slice(0, 3)}
                onJumpToMessage={onJumpToMessage}
                isCompact={true}
              />
            </DetailsSectionCard>

            {/* SEÇÃO 5: MEMBROS DO SQUAD (VIOLET) */}
            {isGroup && (
              <DetailsSectionCard
                title="Membros do Squad"
                icon="groups"
                count={squadMembers.length}
                accentColor="violet"
                onViewAll={() => setViewMode("members")}
                emptyMessage="Nenhum membro cadastrado"
              >
                <DetailsMembersList
                  members={squadMembers.slice(0, 3)}
                  onlineUserIds={onlineUserIds}
                  onUserClick={onUserClick}
                  isCompact={true}
                />
              </DetailsSectionCard>
            )}
          </div>
        ) : (
          /* SUB-VIEW COMPLETA COM SCROLL DE 20 EM 20 ITENS */
          <div className="chat-details-subview-content">
            {viewMode === "media" && (
              <DetailsMediaGrid
                mediaMessages={mediaMessages.slice(0, visibleCount)}
                onImageClick={onImageClick}
              />
            )}

            {viewMode === "docs" && (
              <DetailsDocsList
                docMessages={docMessages.slice(0, visibleCount)}
                onPdfClick={onPdfClick}
              />
            )}

            {viewMode === "links" && (
              <DetailsLinksList
                linkItems={linkItems.slice(0, visibleCount)}
                onJumpToMessage={onJumpToMessage}
              />
            )}

            {viewMode === "pinned" && (
              <DetailsPinnedList
                pinnedMessages={pinnedMessages.slice(0, visibleCount)}
                onJumpToMessage={onJumpToMessage}
              />
            )}

            {viewMode === "members" && (
              <DetailsMembersList
                members={squadMembers.slice(0, visibleCount)}
                onlineUserIds={onlineUserIds}
                onUserClick={onUserClick}
              />
            )}

            {/* CONTADOR / BOTÃO CARREGAR MAIS */}
            <div className="chat-details-pagination-footer">
              {visibleCount < currentTotalItems ? (
                <button
                  type="button"
                  className="chat-details-load-more-btn"
                  onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, currentTotalItems))}
                >
                  <span className="material-symbols-outlined text-[15px]">expand_more</span>
                  <span>Carregar mais ({visibleCount} de {currentTotalItems})</span>
                </button>
              ) : (
                <span className="chat-details-all-loaded-text">
                  Exibindo todos os {currentTotalItems} itens
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
