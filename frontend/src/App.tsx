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
  markConversationAsRead,
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
  
  // Usuários online: Set<userId>
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Confirmações de leitura: { [conversationId]: { [userId]: lastReadAt } }
  const [conversationReads, setConversationReads] = useState<Record<string, Record<string, string>>>({});

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  // Manipulador de novas mensagens recebidas em tempo real
  const handleNewMessage = useCallback(
    (newMessage: Message) => {
      // Se for da conversa aberta no momento, adiciona à lista de mensagens e marca como lida
      if (newMessage.conversationId === selectedConversationId) {
        setMessages((current) => addMessageIfMissing(current, newMessage));
        if (token && selectedConversationId) {
          markConversationAsRead(token, selectedConversationId).catch(() => {});
        }
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

        const existing = currentConversations[existingIndex];
        const isCurrentlyOpen = newMessage.conversationId === selectedConversationId;
        const isMyOwnMessage = newMessage.senderId === currentUser?.id;

        // Se o chat está fechado e a mensagem veio de outra pessoa, incrementa +1
        const newUnreadCount = isCurrentlyOpen || isMyOwnMessage
          ? 0
          : (existing.unreadCount || 0) + 1;

        const updatedConversation: Conversation = {
          ...existing,
          updatedAt: newMessage.createdAt,
          unreadCount: newUnreadCount,
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
    [selectedConversationId, token, currentUser?.id],
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

  // Manipulador de status online
  const handleUserStatus = useCallback((payload: { userId: string; isOnline: boolean }) => {
    setOnlineUserIds((prev) => {
      const next = new Set(prev);
      if (payload.isOnline) {
        next.add(payload.userId);
      } else {
        next.delete(payload.userId);
      }
      return next;
    });
  }, []);

  // Manipulador de leitura em tempo real
  const handleConversationRead = useCallback((payload: { conversationId: string; userId: string; readAt: string }) => {
    setConversationReads((prev) => ({
      ...prev,
      [payload.conversationId]: {
        ...(prev[payload.conversationId] || {}),
        [payload.userId]: payload.readAt,
      },
    }));
  }, []);

  const { socketError, sendTypingStart, sendTypingStop } = useChatSocket({
    token,
    onNewMessage: handleNewMessage,
    onUserTyping: handleUserTyping,
    onOnlineUserIds: (ids) => setOnlineUserIds(new Set(ids)),
    onUserStatus: handleUserStatus,
    onConversationRead: handleConversationRead,
  });

  // Carrega lista de usuários e conversas iniciais após login
  useEffect(() => {
    if (!token) {
      setUsers([]);
      setConversations([]);
      setSelectedConversationId(null);
      setMessages([]);
      setTypingMap({});
      setOnlineUserIds(new Set());
      setConversationReads({});
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

        // Preenche o mapa inicial de lastReadAt
        const initialReads: Record<string, Record<string, string>> = {};
        for (const conv of conversationsResponse.conversations) {
          initialReads[conv.id] = {};
          for (const member of conv.members) {
            const memberId = member.userId || member.user?.id;
            if (memberId && member.lastReadAt) {
              initialReads[conv.id][memberId] = member.lastReadAt;
            }
          }
        }
        setConversationReads(initialReads);

        const firstConvId = conversationsResponse.conversations[0]?.id ?? null;
        setSelectedConversationId((currentId) => currentId ?? firstConvId);

        if (firstConvId) {
          markConversationAsRead(authToken, firstConvId).catch(() => {});
        }
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

  // Ao selecionar conversa, zera contador e avisa API
  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setSelectedConversationId(conversationId);

      setConversations((current) =>
        current.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      );

      if (token) {
        markConversationAsRead(token, conversationId).catch(() => {});
      }
    },
    [token],
  );


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

  // Última leitura do destinatário para a conversa ativa (usado para checks ✓✓ azuis)
  const activeRecipientLastReadAt = useMemo(() => {
    if (!selectedConversation || !currentUser) return null;

    const otherMember = selectedConversation.members.find(
      (m) => (m.userId || m.user?.id) !== currentUser.id,
    );
    if (!otherMember) return null;

    const otherId = otherMember.userId || otherMember.user.id;
    return conversationReads[selectedConversation.id]?.[otherId] || otherMember.lastReadAt || null;
  }, [selectedConversation, currentUser, conversationReads]);

  // Status online do contato da conversa ativa (em 1-para-1)
  const isRecipientOnline = useMemo(() => {
    if (!selectedConversation || !currentUser) return false;
    const isGroup = Boolean(selectedConversation.title || selectedConversation.members.length > 2);
    if (isGroup) return false;

    const otherMember = selectedConversation.members.find(
      (m) => (m.userId || m.user?.id) !== currentUser.id,
    );
    if (!otherMember) return false;

    const otherId = otherMember.userId || otherMember.user.id;
    return onlineUserIds.has(otherId);
  }, [selectedConversation, currentUser, onlineUserIds]);

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
        onlineUserIds={onlineUserIds}
        onSelectConversation={handleSelectConversation}
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
        isOnline={isRecipientOnline}
        recipientLastReadAt={activeRecipientLastReadAt}
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



