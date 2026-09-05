import { useEffect, useState, useCallback, useRef } from "react";
import {
  ChatSocket,
  createChatSocket,
  TypingPayload,
  UserStatusPayload,
  ConversationReadPayload,
} from "../services/socket";
import type { Message } from "../services/api";

type UseChatSocketOptions = {
  token: string | null;
  onNewMessage: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onMessageDeleted?: (payload: { conversationId: string; messageId: string }) => void;
  onMessageReaction?: (payload: {
    conversationId: string;
    messageId: string;
    reactions: Array<{ id: string; emoji: string; userId: string; user?: { id: string; name: string } }>;
  }) => void;
  onConversationPinned?: (payload: {
    conversationId: string;
    pinnedMessageId: string | null;
    pinnedMessage?: unknown;
  }) => void;
  onUserTyping?: (payload: TypingPayload) => void;
  onOnlineUserIds?: (ids: string[]) => void;
  onUserStatus?: (payload: UserStatusPayload) => void;
  onConversationRead?: (payload: ConversationReadPayload) => void;
};

export function useChatSocket({
  token,
  onNewMessage,
  onMessageUpdated,
  onMessageDeleted,
  onMessageReaction,
  onConversationPinned,
  onUserTyping,
  onOnlineUserIds,
  onUserStatus,
  onConversationRead,
}: UseChatSocketOptions) {
  const [socket, setSocket] = useState<ChatSocket | null>(null);
  const [socketError, setSocketError] = useState("");

  // Usamos refs para que mudanças nas funções de callback NÃO reconectem o socket
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  const onMessageUpdatedRef = useRef(onMessageUpdated);
  onMessageUpdatedRef.current = onMessageUpdated;

  const onMessageDeletedRef = useRef(onMessageDeleted);
  onMessageDeletedRef.current = onMessageDeleted;

  const onMessageReactionRef = useRef(onMessageReaction);
  onMessageReactionRef.current = onMessageReaction;

  const onConversationPinnedRef = useRef(onConversationPinned);
  onConversationPinnedRef.current = onConversationPinned;

  const onUserTypingRef = useRef(onUserTyping);
  onUserTypingRef.current = onUserTyping;

  const onOnlineUserIdsRef = useRef(onOnlineUserIds);
  onOnlineUserIdsRef.current = onOnlineUserIds;

  const onUserStatusRef = useRef(onUserStatus);
  onUserStatusRef.current = onUserStatus;

  const onConversationReadRef = useRef(onConversationRead);
  onConversationReadRef.current = onConversationRead;

  // Cria e gerencia a conexão do socket APENAS quando o token mudar
  useEffect(() => {
    if (!token) {
      setSocket(null);
      return;
    }

    const chatSocket = createChatSocket(token);

    chatSocket.on("connect", () => {
      setSocketError("");
    });

    chatSocket.on("connect_error", () => {
      setSocketError("Não foi possível conectar ao tempo real.");
    });

    chatSocket.on("connection:ready", (payload) => {
      if (payload.onlineUserIds) {
        onOnlineUserIdsRef.current?.(payload.onlineUserIds);
      }
    });

    chatSocket.on("message:new", (message: Message) => {
      onNewMessageRef.current?.(message);
    });

    chatSocket.on("message:updated", (message: Message) => {
      onMessageUpdatedRef.current?.(message);
    });

    chatSocket.on("message:deleted", (payload) => {
      onMessageDeletedRef.current?.(payload);
    });

    chatSocket.on("message:reaction", (payload) => {
      onMessageReactionRef.current?.(payload);
    });

    chatSocket.on("conversation:pinned", (payload) => {
      onConversationPinnedRef.current?.(payload);
    });

    chatSocket.on("user:typing", (payload: TypingPayload) => {
      onUserTypingRef.current?.(payload);
    });

    chatSocket.on("user:status", (payload: UserStatusPayload) => {
      onUserStatusRef.current?.(payload);
    });

    chatSocket.on("conversation:read", (payload: ConversationReadPayload) => {
      onConversationReadRef.current?.(payload);
    });

    setSocket(chatSocket);

    return () => {
      chatSocket.disconnect();
      setSocket(null);
    };
  }, [token]);



  const sendTypingStart = useCallback(
    (conversationId: string) => {
      if (socket && conversationId) {
        socket.emit("typing:start", { conversationId });
      }
    },
    [socket],
  );

  const sendTypingStop = useCallback(
    (conversationId: string) => {
      if (socket && conversationId) {
        socket.emit("typing:stop", { conversationId });
      }
    },
    [socket],
  );

  return {
    socket,
    socketError,
    sendTypingStart,
    sendTypingStop,
  };
}

