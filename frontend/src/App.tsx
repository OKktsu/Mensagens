import { FormEvent, useEffect, useMemo, useState, useCallback } from "react";
import {
  Conversation,
  Message,
  User,
  createConversation,
  createGroup,
  getConversations,
  getMessages,
  getUsers,
  sendMessage,
} from "./services/api";
import { TypingPayload } from "./services/socket";
import { useAuth } from "./hooks/useAuth";
import { useChatSocket } from "./hooks/useChatSocket";
import { addMessageIfMissing } from "./utils/chat-helpers";
import { AuthScreen } from "./components/auth/AuthScreen";
import { Sidebar } from "./components/sidebar/Sidebar";
import { ChatPanel } from "./components/chat/ChatPanel";
import { CreateGroupModal } from "./components/sidebar/CreateGroupModal";

export function App() {
  const {
    token,
    currentUser,
    isLoading: isAuthLoading,
    error: authError,
    login,
    register,
    logout,
    clearError: clearAuthError,
  } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [userSearchText, setUserSearchText] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [chatError, setChatError] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  
  // Mapa de digitação: { [conversationId]: { [userId]: userName } }
  const [typingMap, setTypingMap] = useState<Record<string, Record<string, string>>>({});

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  // Manipulador de novas mensagens recebidas em tempo real
  const handleNewMessage = useCallback(
    (newMessage: Message) => {
      // Se for da conversa aberta no momento, adiciona à lista de mensagens
      if (newMessage.conversationId === selectedConversationId) {
        setMessages((current) => addMessageIfMissing(current, newMessage));
      }

      // Remove status de digitação de quem acabou de enviar a mensagem
      if (newMessage.conversationId && newMessage.senderId) {
        setTypingMap((prev) => {
          const convMap = { ...(prev[newMessage.conversationId!] || {}) };
          delete convMap[newMessage.senderId!];
          return {
            ...prev,
            [newMessage.conversationId!]: convMap,
          };
        });
      }

      // Atualiza o resumo da conversa na barra lateral e reposiciona no topo
      setConversations((currentConversations) => {
        const existingIndex = currentConversations.findIndex(
          (c) => c.id === newMessage.conversationId,
        );

        if (existingIndex === -1) {
          return currentConversations;
        }

        const updatedConversation: Conversation = {
          ...currentConversations[existingIndex],
          updatedAt: newMessage.createdAt,
          messages: [
            {
              id: newMessage.id,
              content: newMessage.content,
              createdAt: newMessage.createdAt,
              sender: {
                id: newMessage.sender.id,
                name: newMessage.sender.name,
              },
            },
          ],
        };

        const remaining = currentConversations.filter(
          (c) => c.id !== newMessage.conversationId,
        );

        return [updatedConversation, ...remaining];
      });
    },
    [selectedConversationId],
  );

  // Manipulador de status de digitação em tempo real
  const handleUserTyping = useCallback((payload: TypingPayload) => {
    setTypingMap((prev) => {
      const convMap = { ...(prev[payload.conversationId] || {}) };

      if (payload.isTyping) {
        convMap[payload.userId] = payload.userName;
      } else {
        delete convMap[payload.userId];
      }

      return {
        ...prev,
        [payload.conversationId]: convMap,
      };
    });
  }, []);

  const { socketError, sendTypingStart, sendTypingStop } = useChatSocket({
    token,
    onNewMessage: handleNewMessage,
    onUserTyping: handleUserTyping,
  });

  // Carrega lista de usuários e conversas iniciais após login
  useEffect(() => {
    if (!token) {
      setUsers([]);
      setConversations([]);
      setSelectedConversationId(null);
      setMessages([]);
      setTypingMap({});
      return;
    }

    const authToken = token;

    async function loadInitialData() {
      try {
        setChatError("");
        const [usersResponse, conversationsResponse] = await Promise.all([
          getUsers(authToken),
          getConversations(authToken),
        ]);

        setUsers(usersResponse.users);
        setConversations(conversationsResponse.conversations);
        setSelectedConversationId((currentId) => currentId ?? conversationsResponse.conversations[0]?.id ?? null);
      } catch (caughtError) {
        setChatError(caughtError instanceof Error ? caughtError.message : "Sessão inválida.");
        logout();
      }
    }

    loadInitialData();
  }, [token, logout]);

  // Carrega histórico de mensagens da conversa selecionada
  useEffect(() => {
    if (!token || !selectedConversationId) {
      setMessages([]);
      return;
    }

    const authToken = token;
    const conversationId = selectedConversationId;

    async function loadMessages() {
      try {
        const response = await getMessages(authToken, conversationId);
        setMessages(response.messages);
      } catch (caughtError) {
        setChatError(caughtError instanceof Error ? caughtError.message : "Não foi possível carregar as mensagens.");
      }
    }

    loadMessages();
  }, [token, selectedConversationId]);

  // Dispara início/fim de digitação para a conversa ativa
  const handleTypingStart = useCallback(() => {
    if (selectedConversationId) {
      sendTypingStart(selectedConversationId);
    }
  }, [selectedConversationId, sendTypingStart]);

  const handleTypingStop = useCallback(() => {
    if (selectedConversationId) {
      sendTypingStop(selectedConversationId);
    }
  }, [selectedConversationId, sendTypingStop]);

  async function handleSelectUser(participantId: string) {
    if (!token) return;

    try {
      setChatError("");
      const response = await createConversation(token, participantId);
      const conversationsResponse = await getConversations(token);
      setConversations(conversationsResponse.conversations);
      setSelectedConversationId(response.conversation.id);
    } catch (caughtError) {
      setChatError(caughtError instanceof Error ? caughtError.message : "Não foi possível criar a conversa.");
    }
  }

  async function handleCreateGroup(participantIds: string[], title?: string) {
    if (!token) return;

    try {
      setChatError("");
      const response = await createGroup(token, participantIds, title);
      const conversationsResponse = await getConversations(token);
      setConversations(conversationsResponse.conversations);
      setSelectedConversationId(response.conversation.id);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível criar o grupo.";
      setChatError(message);
      throw caughtError;
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedConversationId || !messageText.trim()) return;

    try {
      setChatError("");
      const response = await sendMessage(token, selectedConversationId, messageText);
      setMessages((current) => addMessageIfMissing(current, response.message));
      setMessageText("");
      const conversationsResponse = await getConversations(token);
      setConversations(conversationsResponse.conversations);
    } catch (caughtError) {
      setChatError(caughtError instanceof Error ? caughtError.message : "Não foi possível enviar a mensagem.");
    }
  }

  // Texto do indicador de digitação para o cabeçalho do chat aberto
  const activeTypingText = useMemo(() => {
    if (!selectedConversationId) return null;
    const currentTypers = typingMap[selectedConversationId];
    if (!currentTypers) return null;

    const names = Object.values(currentTypers);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} está digitando...`;
    if (names.length === 2) return `${names[0]} e ${names[1]} estão digitando...`;
    return "Várias pessoas estão digitando...";
  }, [selectedConversationId, typingMap]);

  // Mapa formatado para a barra lateral: { [conversationId]: ["Nome1", "Nome2"] }
  const sidebarTypingMap = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const [convId, typers] of Object.entries(typingMap)) {
      const names = Object.values(typers);
      if (names.length > 0) {
        result[convId] = names;
      }
    }
    return result;
  }, [typingMap]);

  if (!token || !currentUser) {
    return (
      <AuthScreen
        isLoading={isAuthLoading}
        error={authError}
        onLogin={login}
        onRegister={register}
        onClearError={clearAuthError}
      />
    );
  }

  return (
    <main className="app-shell">
      <Sidebar
        users={users}
        userSearchText={userSearchText}
        onSearchChange={setUserSearchText}
        onSelectUser={handleSelectUser}
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        currentUserId={currentUser.id}
        typingMap={sidebarTypingMap}
        onSelectConversation={setSelectedConversationId}
        onLogout={logout}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
      />

      <ChatPanel
        selectedConversation={selectedConversation}
        currentUserId={currentUser.id}
        currentUserName={currentUser.name}
        error={chatError || socketError}
        messages={messages}
        messageText={messageText}
        typingText={activeTypingText}
        onMessageChange={setMessageText}
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        users={users}
        onCreateGroup={handleCreateGroup}
      />
    </main>
  );
}


