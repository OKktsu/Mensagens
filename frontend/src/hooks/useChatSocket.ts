import { useEffect, useState } from "react";
import { ChatSocket, createChatSocket } from "../services/socket";
import type { Message } from "../services/api";

type UseChatSocketOptions = {
  token: string | null;
  selectedConversationId: string | null;
  onNewMessage: (message: Message) => void;
};

export function useChatSocket({
  token,
  selectedConversationId,
  onNewMessage,
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

    setSocket(chatSocket);

    return () => {
      chatSocket.disconnect();
      setSocket(null);
    };
  }, [token]);

  // Entra e sai da sala da conversa selecionada
  useEffect(() => {
    if (!socket || !selectedConversationId) {
      return;
    }

    socket.emit("conversation:join", selectedConversationId);

    function handleNewMessage(message: Message) {
      if (message.conversationId === selectedConversationId) {
        onNewMessage(message);
      }
    }

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.emit("conversation:leave", selectedConversationId);
      socket.off("message:new", handleNewMessage);
    };
  }, [socket, selectedConversationId, onNewMessage]);

  return { socket, socketError };
}
