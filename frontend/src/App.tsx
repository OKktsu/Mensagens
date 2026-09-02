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

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const handleNewMessage = useCallback((newMessage: Message) => {
    setMessages((current) => addMessageIfMissing(current, newMessage));
  }, []);

  const { socketError } = useChatSocket({
    token,
    selectedConversationId,
    onNewMessage: handleNewMessage,
  });

  // Carrega lista de usuários e conversas iniciais após login
  useEffect(() => {
    if (!token) {
      setUsers([]);
      setConversations([]);
      setSelectedConversationId(null);
      setMessages([]);
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
        onMessageChange={setMessageText}
        onSendMessage={handleSendMessage}
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

