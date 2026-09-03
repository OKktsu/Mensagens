import { useEffect, useState, useCallback } from "react";
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
  onUserTyping?: (payload: TypingPayload) => void;
  onOnlineUserIds?: (ids: string[]) => void;
  onUserStatus?: (payload: UserStatusPayload) => void;
  onConversationRead?: (payload: ConversationReadPayload) => void;
};

export function useChatSocket({
  token,
  onNewMessage,
  onUserTyping,
  onOnlineUserIds,
  onUserStatus,
  onConversationRead,
}: UseChatSocketOptions) {
  const [socket, setSocket] = useState<ChatSocket | null>(null);
  const [socketError, setSocketError] = useState("");

  // Cria e gerencia a conexão do socket com o token
  useEffect(() => {
    if (!token) {
      setSocket(null);
      return;
    }

    const chatSocket = createChatSocket(token);

    chatSocket.on("connect_error", () => {
      setSocketError("Não foi possível conectar ao tempo real.");
    });

    chatSocket.on("connection:ready", (payload) => {
      if (payload.onlineUserIds && onOnlineUserIds) {
        onOnlineUserIds(payload.onlineUserIds);
      }
    });

    chatSocket.on("message:new", (message: Message) => {
      onNewMessage(message);
    });

    if (onUserTyping) {
      chatSocket.on("user:typing", (payload: TypingPayload) => {
        onUserTyping(payload);
      });
    }

    if (onUserStatus) {
      chatSocket.on("user:status", (payload: UserStatusPayload) => {
        onUserStatus(payload);
      });
    }

    if (onConversationRead) {
      chatSocket.on("conversation:read", (payload: ConversationReadPayload) => {
        onConversationRead(payload);
      });
    }

    setSocket(chatSocket);

    return () => {
      chatSocket.disconnect();
      setSocket(null);
    };
  }, [token, onNewMessage, onUserTyping, onOnlineUserIds, onUserStatus, onConversationRead]);


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

