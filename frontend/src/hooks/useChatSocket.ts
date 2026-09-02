import { useEffect, useState, useCallback } from "react";
import { ChatSocket, createChatSocket, TypingPayload } from "../services/socket";
import type { Message } from "../services/api";

type UseChatSocketOptions = {
  token: string | null;
  onNewMessage: (message: Message) => void;
  onUserTyping?: (payload: TypingPayload) => void;
};

export function useChatSocket({
  token,
  onNewMessage,
  onUserTyping,
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

    chatSocket.on("message:new", (message: Message) => {
      onNewMessage(message);
    });

    if (onUserTyping) {
      chatSocket.on("user:typing", (payload: TypingPayload) => {
        onUserTyping(payload);
      });
    }

    setSocket(chatSocket);

    return () => {
      chatSocket.disconnect();
      setSocket(null);
    };
  }, [token, onNewMessage, onUserTyping]);

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

