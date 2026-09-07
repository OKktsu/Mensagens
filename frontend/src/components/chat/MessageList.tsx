import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo, Fragment } from "react";
import type { Message, Conversation } from "../../services/api";
import { MessageItem } from "./MessageItem";
import { formatDateDivider, isSameDay, getConversationTitle, getConversationInitial } from "../../utils/chat-helpers";

type MessageListProps = {
  messages: Message[];
  conversation?: Conversation | null;
  currentUserId: string;
  recipientLastReadAt?: string | null;
  pinnedMessageId?: string | null;
  token?: string | null;
  isLoading?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onImageClick?: (url: string) => void;
  onPdfClick?: (url: string, fileName?: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onToggleStar?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onUserClick?: (user: import("../../services/api").User) => void;
};

function MessageStreamSkeleton() {
  return (
    <div className="message-stream-skeleton" aria-busy="true" aria-label="Carregando mensagens...">
      <div className="msg-skeleton-item">
        <div className="msg-skeleton-avatar" />
        <div className="msg-skeleton-body">
          <div className="msg-skeleton-meta">
            <div className="msg-skeleton-name" />
            <div className="msg-skeleton-time" />
          </div>
          <div className="msg-skeleton-bubble wide" />
        </div>
      </div>

      <div className="msg-skeleton-item own">
        <div className="msg-skeleton-avatar" />
        <div className="msg-skeleton-body">
          <div className="msg-skeleton-meta" style={{ justifyContent: "flex-end" }}>
            <div className="msg-skeleton-time" />
            <div className="msg-skeleton-name" />
          </div>
          <div className="msg-skeleton-bubble medium" style={{ alignSelf: "flex-end" }} />
        </div>
      </div>

      <div className="msg-skeleton-item">
        <div className="msg-skeleton-avatar" />
        <div className="msg-skeleton-body">
          <div className="msg-skeleton-meta">
            <div className="msg-skeleton-name" />
            <div className="msg-skeleton-time" />
          </div>
          <div className="msg-skeleton-bubble short" />
        </div>
      </div>

      <div className="msg-skeleton-item own">
        <div className="msg-skeleton-avatar" />
        <div className="msg-skeleton-body">
          <div className="msg-skeleton-meta" style={{ justifyContent: "flex-end" }}>
            <div className="msg-skeleton-time" />
            <div className="msg-skeleton-name" />
          </div>
          <div className="msg-skeleton-bubble wide" style={{ alignSelf: "flex-end" }} />
        </div>
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  conversation,
  currentUserId,
  recipientLastReadAt,
  pinnedMessageId,
  token,
  isLoading = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onImageClick,
  onPdfClick,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReaction,
  onToggleStar,
  onPin,
  onUserClick,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const prevConversationIdRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef<number>(0);
  const prevFirstMessageIdRef = useRef<string | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const prevScrollTopRef = useRef<number>(0);
  const isUserInteractingRef = useRef<boolean>(false);

  // Executa o scroll até o final
  const scrollToBottom = useCallback((smooth = false) => {
    const container = containerRef.current;
    if (!container) return;

    if (smooth) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Monitora gestos diretos do usuário (rodinha, toque, pointer)
  const handleUserGesture = useCallback((e: React.WheelEvent | React.TouchEvent | React.PointerEvent) => {
    if ("deltaY" in e && (e as React.WheelEvent).deltaY < 0) {
      isUserInteractingRef.current = true;
    }
  }, []);

  // Monitora rolagem manual e scroll infinito no topo
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    
    // Se o usuário rolou para cima (mais de 80px do fundo), trava auto-scrolls indesejados
    if (distanceFromBottom > 80) {
      isUserInteractingRef.current = true;
    } else if (distanceFromBottom <= 30) {
      // Se voltou para o final (menos de 30px do fundo), reativa ancoragem automática
      isUserInteractingRef.current = false;
    }

    // Dispara carregamento de mensagens mais antigas se estiver perto do topo
    if (
      container.scrollTop < 80 &&
      hasMore &&
      !isLoadingMore &&
      onLoadMore
    ) {
      prevScrollHeightRef.current = container.scrollHeight;
      prevScrollTopRef.current = container.scrollTop;
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  // 🛡️ Filtra apenas mensagens da conversa ativa
  const conversationMessages = useMemo(() => {
    if (!conversation) return [];
    return messages.filter((m) => m.conversationId === conversation.id);
  }, [messages, conversation?.id]);

  // 1. Ao trocar de conversa: reseta controle e ancora no fundo
  useLayoutEffect(() => {
    if (!conversation) return;

    const isNewConversation = conversation.id !== prevConversationIdRef.current;
    if (isNewConversation) {
      prevConversationIdRef.current = conversation.id;
      prevMessageCountRef.current = conversationMessages.length;
      prevFirstMessageIdRef.current = conversationMessages[0]?.id ?? null;
      isUserInteractingRef.current = false;

      if (!isLoading && conversationMessages.length > 0) {
        scrollToBottom(false);
      }
    }
  }, [conversation?.id, isLoading, scrollToBottom, conversationMessages]);

  // 2. ResizeObserver: Se imagens ou cards expandirem a altura do chat enquanto o usuário ainda não interagiu,
  // mantém o scroll 100% ancorado no fim sem qualquer timer ou salto
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const resizeObserver = new ResizeObserver(() => {
      if (!isUserInteractingRef.current && containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });

    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
    };
  }, [conversation?.id]);

  // 3. Quando as mensagens carregam, são prepended (Infinite Scroll) ou nova mensagem chega:
  useLayoutEffect(() => {
    if (isLoading || !conversation) return;

    const currentCount = conversationMessages.length;
    const prevCount = prevMessageCountRef.current;
    const currentFirstId = conversationMessages[0]?.id ?? null;
    const prevFirstId = prevFirstMessageIdRef.current;
    const isPrepend = prevCount > 0 && currentCount > prevCount && currentFirstId !== prevFirstId;

    prevMessageCountRef.current = currentCount;
    prevFirstMessageIdRef.current = currentFirstId;

    // Se for prepend de mensagens antigas, mantém o scroll ancorado exatamente onde estava
    if (isPrepend) {
      const container = containerRef.current;
      if (container && prevScrollHeightRef.current > 0) {
        const heightDiff = container.scrollHeight - prevScrollHeightRef.current;
        container.scrollTop = prevScrollTopRef.current + heightDiff;
      }
      return;
    }

    // Se for nova mensagem chegando em tempo real
    if (currentCount > prevCount && prevCount > 0) {
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      const isMine = lastMessage?.sender?.id === currentUserId;

      if (isMine) {
        isUserInteractingRef.current = false;
        scrollToBottom(true);
      } else if (!isUserInteractingRef.current) {
        scrollToBottom(true);
      }
    } else if (currentCount > 0 && !isUserInteractingRef.current) {
      // Primeira carga de mensagens
      scrollToBottom(false);
    }
  }, [conversationMessages, isLoading, conversation?.id, currentUserId, scrollToBottom]);

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

  if (!conversation) {
    return (
      <div className="stitch-empty-messages-pane">
        <span className="material-symbols-outlined stitch-empty-hero-icon">forum</span>
        <h3 className="stitch-empty-title">Nenhuma conversa selecionada</h3>
        <p className="stitch-empty-subtitle">Selecione uma conversa ao lado para começar a interagir.</p>
      </div>
    );
  }

  if (isLoading) {
    return <MessageStreamSkeleton />;
  }

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onWheel={handleUserGesture}
        onTouchStart={handleUserGesture}
        onPointerDown={handleUserGesture}
        className="stitch-message-stream-scroll"
        aria-label="Histórico de Mensagens"
      >
        <div ref={contentRef} style={{ display: "flex", flexDirection: "column", gap: "2px", minHeight: "100%", width: "100%" }}>
          {/* Spinner animado no topo ao carregar mensagens anteriores */}
          {isLoadingMore && (
            <div className="stitch-loading-history-spinner" aria-label="Carregando mensagens anteriores">
              <div className="history-spinner-ring" />
              <span>Carregando mensagens anteriores...</span>
            </div>
          )}

          {/* Banner de início de conversa (só exibido quando não há mais histórico anterior) */}
          {!hasMore && (
            <div className="stitch-conversation-starter-card">
              <div className="starter-avatar-circle">
                <span>{getConversationInitial(conversation, currentUserId)}</span>
              </div>
              <h2 className="starter-title">{getConversationTitle(conversation, currentUserId)}</h2>
              <p className="starter-description">
                Este é o início da sua história de mensagens com <strong>{getConversationTitle(conversation, currentUserId)}</strong>.
              </p>
            </div>
          )}

          {conversationMessages.map((message, index) => {
            const isMine = message.sender?.id === currentUserId;
            const isRead = Boolean(
              recipientLastReadAt && new Date(message.createdAt) <= new Date(recipientLastReadAt),
            );
            const isPinned = Boolean(pinnedMessageId && message.id === pinnedMessageId);
            const prevMessage = index > 0 ? conversationMessages[index - 1] : null;
            const showDateDivider = !prevMessage || !isSameDay(prevMessage.createdAt, message.createdAt);

            return (
              <Fragment key={message.id}>
                {showDateDivider && (
                  <div className="stitch-date-separator">
                    <span className="stitch-date-bubble">{formatDateDivider(message.createdAt)}</span>
                  </div>
                )}
                <MessageItem
                  message={message}
                  currentUserId={currentUserId}
                  isMine={isMine}
                  isRead={isRead}
                  isPinned={isPinned}
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
                  onJumpToQuotedMessage={handleJumpToMessage}
                  onUserClick={onUserClick}
                />
              </Fragment>
            );
          })}
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>
      </div>
    </div>
  );
}




