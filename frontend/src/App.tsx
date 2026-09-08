import { FormEvent, useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Conversation,
  Message,
  User,
  CallRecord,
  ConversationRequest,
  createConversation,
  createGroup,
  getConversations,
  getMessages,
  getUsers,
  getReceivedConversationRequests,
  getSentConversationRequests,
  sendConversationRequest,
  acceptConversationRequest,
  rejectConversationRequest,
  cancelConversationRequest,
  getCalls,
  uploadFile,
  markConversationAsRead,
  sendMessage,
  updateMessage,
  deleteMessage,
  toggleReaction,
  toggleStarMessage,
  pinMessage,
  unpinMessage,
  SendMessagePayload,
} from "./services/api";
import { TypingPayload } from "./services/socket";
import { useAuth } from "./hooks/useAuth";
import { useChatSocket } from "./hooks/useChatSocket";
import { useWebRTCCall } from "./hooks/useWebRTCCall";
import { useGroupWebRTCCall } from "./hooks/useGroupWebRTCCall";
import { addMessageIfMissing, reconcileOptimisticMessage } from "./utils/chat-helpers";
import { AuthScreen } from "./components/auth/AuthScreen";
import { Sidebar } from "./components/sidebar/Sidebar";
import { SidebarTab } from "./components/sidebar/SidebarHeader";
import { ChatPanel } from "./components/chat/ChatPanel";
import { CreateGroupModal } from "./components/sidebar/CreateGroupModal";
import { FriendRequestsModal } from "./components/sidebar/FriendRequestsModal";
import { ForwardMessageModal } from "./components/chat/ForwardMessageModal";
import { IncomingCallModal } from "./components/call/IncomingCallModal";
import { ActiveCallModal } from "./components/call/ActiveCallModal";
import { GroupCallModal } from "./components/call/GroupCallModal";
import { MinimizedCallWidget } from "./components/call/MinimizedCallWidget";
import { ImageLightbox } from "./components/chat/ImageLightbox";
import { PdfViewerModal } from "./components/chat/PdfViewerModal";
import { GlobalSearchModal } from "./components/search/GlobalSearchModal";
import { ProfileSettingsModal } from "./components/profile/ProfileSettingsModal";
import { UserProfilePopover } from "./components/profile/UserProfilePopover";

export function App() {
  const {
    token,
    currentUser,
    isLoading: isAuthLoading,
    error: authError,
    login,
    register,
    logout,
    updateCurrentUser,
    clearError: clearAuthError,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<SidebarTab>("chats");
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [pdfModalData, setPdfModalData] = useState<{ url: string; fileName?: string } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFriendRequestsOpen, setIsFriendRequestsOpen] = useState(false);
  const [receivedRequests, setReceivedRequests] = useState<ConversationRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConversationRequest[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeUserProfilePopover, setActiveUserProfilePopover] = useState<User | null>(null);

  // Estados para minimizar chamadas ativas e permitir navegar em outros chats
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [isGroupCallMinimized, setIsGroupCallMinimized] = useState(false);

  // Atalho global de teclado Ctrl + K / Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [users, setUsers] = useState<User[]>([]);

  const [userSearchText, setUserSearchText] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [chatError, setChatError] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isInitialDataLoading, setIsInitialDataLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // Cache em memória de mensagens por conversa (SWR - Instant Switch em 0ms)
  const messagesCacheRef = useRef<Record<string, { messages: Message[]; hasMore: boolean }>>({});
  const selectedConversationIdRef = useRef<string | null>(selectedConversationId);
  selectedConversationIdRef.current = selectedConversationId;

  // Estados para interações de mensagem
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  
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
      // Atualiza o cache da conversa se existir
      if (newMessage.conversationId && messagesCacheRef.current[newMessage.conversationId]) {
        const cached = messagesCacheRef.current[newMessage.conversationId];
        messagesCacheRef.current[newMessage.conversationId] = {
          ...cached,
          messages: reconcileOptimisticMessage(cached.messages, newMessage),
        };
      }

      // Se for da conversa aberta no momento, adiciona à lista de mensagens e marca como lida
      if (newMessage.conversationId === selectedConversationId) {
        setMessages((current) => reconcileOptimisticMessage(current, newMessage));
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

  // Manipulador de mensagem editada em tempo real
  const handleMessageUpdated = useCallback((updatedMessage: Message) => {
    setMessages((current) =>
      current.map((msg) => (msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg))
    );
    setConversations((current) =>
      current.map((c) => {
        if (c.id === updatedMessage.conversationId && c.messages?.[0]?.id === updatedMessage.id) {
          return {
            ...c,
            messages: [
              {
                ...c.messages[0],
                content: updatedMessage.content,
              },
            ],
          };
        }
        return c;
      })
    );
  }, []);

  // Manipulador de mensagem excluída em tempo real (soft delete / expiração)
  const handleMessageDeleted = useCallback((payload: { conversationId: string; messageId: string }) => {
    setMessages((current) =>
      current.map((msg) => {
        if (msg.id !== payload.messageId) return msg;
        const isTtl = Boolean(msg.ttl || msg.expiresAt);
        return {
          ...msg,
          isDeleted: true,
          content: isTtl ? "Esta mensagem expirou" : "Esta mensagem foi apagada",
          type: "text",
        };
      })
    );
    setConversations((current) =>
      current.map((c) => {
        if (c.id === payload.conversationId && c.messages?.[0]?.id === payload.messageId) {
          const targetMsg = c.messages[0];
          const isTtl = Boolean(targetMsg.ttl || targetMsg.expiresAt);
          return {
            ...c,
            messages: [
              {
                ...targetMsg,
                content: isTtl ? "Esta mensagem expirou" : "Esta mensagem foi apagada",
              },
            ],
          };
        }
        return c;
      })
    );
  }, []);

  // Manipulador de reação em tempo real
  const handleMessageReaction = useCallback((payload: {
    conversationId: string;
    messageId: string;
    reactions: Array<{ id: string; emoji: string; userId: string; user?: { id: string; name: string } }>;
  }) => {
    setMessages((current) =>
      current.map((msg) =>
        msg.id === payload.messageId
          ? { ...msg, reactions: payload.reactions }
          : msg
      )
    );
  }, []);

  // Manipulador de mensagem fixada/desafixada na conversa
  const handleConversationPinned = useCallback((payload: {
    conversationId: string;
    pinnedMessageId: string | null;
    pinnedMessage?: unknown;
  }) => {
    setConversations((current) =>
      current.map((c) =>
        c.id === payload.conversationId
          ? {
              ...c,
              pinnedMessageId: payload.pinnedMessageId,
              pinnedMessage: payload.pinnedMessage as Message | undefined,
            }
          : c
      )
    );
  }, []);

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

  // Manipulador de lista inicial de usuários online
  const handleOnlineUserIds = useCallback((ids: string[]) => {
    setOnlineUserIds(new Set(ids));
  }, []);

  // Manipulador de atualização de perfil em tempo real
  const handleUserProfileUpdated = useCallback(
    (updatedUser: User) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
      );

      if (currentUser && currentUser.id === updatedUser.id) {
        updateCurrentUser(updatedUser);
      }

      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          members: c.members.map((m) =>
            (m.userId || m.user?.id) === updatedUser.id
              ? { ...m, user: { ...m.user, ...updatedUser } }
              : m
          ),
        }))
      );
    },
    [currentUser, updateCurrentUser],
  );

  const refreshFriendData = useCallback(async (authToken: string) => {
    const [usersResponse, receivedResponse, sentResponse] = await Promise.all([
      getUsers(authToken),
      getReceivedConversationRequests(authToken),
      getSentConversationRequests(authToken),
    ]);

    setUsers(usersResponse.users);
    setReceivedRequests(receivedResponse.conversationRequests);
    setSentRequests(sentResponse.conversationRequests);
  }, []);

  const handleFriendDataChanged = useCallback(() => {
    if (!token) {
      return;
    }

    refreshFriendData(token).catch(() => {
      setChatError("Nao foi possivel atualizar seus amigos e pedidos.");
    });
  }, [refreshFriendData, token]);
  const { socket, socketError, sendTypingStart, sendTypingStop } = useChatSocket({
    token,
    onNewMessage: handleNewMessage,
    onMessageUpdated: handleMessageUpdated,
    onMessageDeleted: handleMessageDeleted,
    onMessageReaction: handleMessageReaction,
    onConversationPinned: handleConversationPinned,
    onUserTyping: handleUserTyping,
    onOnlineUserIds: handleOnlineUserIds,
    onUserStatus: handleUserStatus,
    onUserProfileUpdated: handleUserProfileUpdated,
    onConversationRead: handleConversationRead,
  });

  const loadCalls = useCallback(async (authToken: string) => {
    try {
      const response = await getCalls(authToken);
      setCalls(response.calls);
    } catch {
      // Ignora erro
    }
  }, []);

  const handleCallLogged = useCallback(() => {
    if (token) {
      loadCalls(token);
    }
  }, [token, loadCalls]);

  const {
    callState,
    callType,
    activePeer,
    incomingCall,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isDeafened,
    callDuration,
    callError,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleDeafen,
  } = useWebRTCCall(socket, token, handleCallLogged);

  const {
    isInGroupCall,
    activeConversationId: groupCallConvId,
    callType: groupCallType,
    isMuted: isGroupMuted,
    isVideoOff: isGroupVideoOff,
    isScreenSharing: isGroupScreenSharing,
    isDeafened: isGroupDeafened,
    callDuration: groupCallDuration,
    localStream: groupLocalStream,
    remoteParticipants: groupRemoteParticipants,
    groupCallBanners,
    joinGroupCall,
    leaveGroupCall,
    toggleMute: toggleGroupMute,
    toggleVideo: toggleGroupVideo,
    toggleScreenShare: toggleGroupScreenShare,
    toggleDeafen: toggleGroupDeafen,
  } = useGroupWebRTCCall(socket, token, currentUser?.id, handleCallLogged);

  const isAnyCallActive = callState === "connected" || callState === "calling" || isInGroupCall;
  const currentMicMuted = isInGroupCall ? isGroupMuted : isMuted;
  const currentAudioMuted = isInGroupCall ? isGroupDeafened : isDeafened;
  const currentVideoOff = isInGroupCall ? isGroupVideoOff : isVideoOff;
  const currentScreenSharing = isInGroupCall ? isGroupScreenSharing : isScreenSharing;

  const handleDockToggleMic = useCallback(() => {
    if (isInGroupCall) toggleGroupMute();
    else toggleMute();
  }, [isInGroupCall, toggleGroupMute, toggleMute]);

  const handleDockToggleAudio = useCallback(() => {
    if (isInGroupCall) toggleGroupDeafen();
    else toggleDeafen();
  }, [isInGroupCall, toggleGroupDeafen, toggleDeafen]);

  const handleDockToggleVideo = useCallback(() => {
    if (isInGroupCall) toggleGroupVideo();
    else toggleVideo();
  }, [isInGroupCall, toggleGroupVideo, toggleVideo]);

  const handleDockToggleScreenShare = useCallback(() => {
    if (isInGroupCall) toggleGroupScreenShare();
    else toggleScreenShare();
  }, [isInGroupCall, toggleGroupScreenShare, toggleScreenShare]);

  const handleStartVoiceCall = useCallback(() => {
    if (!selectedConversation || !currentUser) return;
    setIsCallMinimized(false);
    const otherMember = selectedConversation.members.find(
      (m) => (m.userId || m.user?.id) !== currentUser.id,
    );
    const isGroup = selectedConversation.members.length > 2;
    if (isGroup || !otherMember) {
      setIsGroupCallMinimized(false);
      joinGroupCall(selectedConversation.id, "audio");
      return;
    }
    const otherId = otherMember.userId || otherMember.user.id;
    const otherName = otherMember.user?.name || "Contato";
    startCall(otherId, otherName, selectedConversation.id, "audio");
  }, [selectedConversation, currentUser, joinGroupCall, startCall]);

  const handleStartVideoCall = useCallback(() => {
    if (!selectedConversation || !currentUser) return;
    setIsCallMinimized(false);
    const otherMember = selectedConversation.members.find(
      (m) => (m.userId || m.user?.id) !== currentUser.id,
    );
    const isGroup = selectedConversation.members.length > 2;
    if (isGroup || !otherMember) {
      setIsGroupCallMinimized(false);
      joinGroupCall(selectedConversation.id, "video");
      return;
    }
    const otherId = otherMember.userId || otherMember.user.id;
    const otherName = otherMember.user?.name || "Contato";
    startCall(otherId, otherName, selectedConversation.id, "video");
  }, [selectedConversation, currentUser, joinGroupCall, startCall]);

  const handleStartVoiceCallDirect = useCallback((targetUserId: string, targetUserName: string, conversationId?: string) => {
    setIsCallMinimized(false);
    startCall(targetUserId, targetUserName, conversationId ?? "", "audio");
  }, [startCall]);

  const handleStartVideoCallDirect = useCallback((targetUserId: string, targetUserName: string, conversationId?: string) => {
    setIsCallMinimized(false);
    startCall(targetUserId, targetUserName, conversationId ?? "", "video");
  }, [startCall]);

  // Reseta minimização quando a chamada for encerrada
  useEffect(() => {
    if (callState === "idle") {
      setIsCallMinimized(false);
    }
  }, [callState]);

  useEffect(() => {
    if (!isInGroupCall) {
      setIsGroupCallMinimized(false);
    }
  }, [isInGroupCall]);


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
      setCalls([]);
      return;
    }

    const authToken = token;

    async function loadInitialData() {
      try {
        setIsInitialDataLoading(true);
        setChatError("");
        const [usersResponse, conversationsResponse, callsResponse, receivedRequestsResponse, sentRequestsResponse] = await Promise.all([
          getUsers(authToken),
          getConversations(authToken),
          getCalls(authToken).catch(() => ({ calls: [] })),
          getReceivedConversationRequests(authToken),
          getSentConversationRequests(authToken),
        ]);

        setUsers(usersResponse.users);
        setConversations(conversationsResponse.conversations);
        setCalls(callsResponse.calls);
        setReceivedRequests(receivedRequestsResponse.conversationRequests);
        setSentRequests(sentRequestsResponse.conversationRequests);


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

        const isMobileViewport = typeof window !== "undefined" && window.innerWidth < 768;
        const firstConvId = conversationsResponse.conversations[0]?.id ?? null;
        setSelectedConversationId((currentId) => {
          if (currentId) return currentId;
          return isMobileViewport ? null : firstConvId;
        });

        if (!isMobileViewport && firstConvId) {
          markConversationAsRead(authToken, firstConvId).catch(() => {});
        }
      } catch (caughtError) {
        setChatError(caughtError instanceof Error ? caughtError.message : "Sessão inválida.");
        logout();
      } finally {
        setIsInitialDataLoading(false);
      }
    }

    loadInitialData();
  }, [token, logout]);


  // Carrega histórico de mensagens com SWR (0ms quando em cache, revalidação em background)
  useEffect(() => {
    if (!token || !selectedConversationId) {
      setMessages([]);
      setHasMoreMessages(false);
      setIsMessagesLoading(false);
      return;
    }

    const authToken = token;
    const conversationId = selectedConversationId;

    // ⚡ Se já temos em cache da conversa selecionada, renderiza IMEDIATAMENTE em 0ms
    const cached = messagesCacheRef.current[conversationId];
    if (cached) {
      setMessages(cached.messages);
      setHasMoreMessages(cached.hasMore);
      setIsMessagesLoading(false);
    } else {
      setIsMessagesLoading(true);
      setMessages([]);
      setHasMoreMessages(false);
    }

    async function loadMessages() {
      try {
        setChatError("");
        const response = await getMessages(authToken, conversationId, { limit: 25 });
        
        // Sempre atualiza o cache da conversa em segundo plano
        messagesCacheRef.current[conversationId] = {
          messages: response.messages,
          hasMore: Boolean(response.hasMore),
        };

        // 🛡️ GUARDA DE SEGURANÇA: Só atualiza a tela se o usuário AINDA estiver nesta conversa!
        if (selectedConversationIdRef.current === conversationId) {
          setMessages(response.messages);
          setHasMoreMessages(Boolean(response.hasMore));
          setIsMessagesLoading(false);
        }
      } catch (caughtError) {
        if (selectedConversationIdRef.current === conversationId) {
          setChatError(caughtError instanceof Error ? caughtError.message : "Não foi possível carregar as mensagens.");
          setIsMessagesLoading(false);
        }
      }
    }

    loadMessages();
  }, [token, selectedConversationId]);

  // Carrega lote anterior de mensagens mais antigas (Infinite Scroll ao subir)
  const handleLoadMoreMessages = useCallback(async () => {
    const activeConversationId = selectedConversationIdRef.current;
    if (
      !token ||
      !activeConversationId ||
      !hasMoreMessages ||
      isLoadingMoreMessages ||
      messages.length === 0
    ) {
      return;
    }

    const oldestMessageId = messages[0].id;
    try {
      setIsLoadingMoreMessages(true);
      const response = await getMessages(token, activeConversationId, {
        limit: 25,
        before: oldestMessageId,
      });

      if (response.messages && response.messages.length > 0) {
        // Atualiza cache em background
        const currentCached = messagesCacheRef.current[activeConversationId]?.messages || [];
        const existingCachedIds = new Set(currentCached.map((m) => m.id));
        const newOlderCached = response.messages.filter((m) => !existingCachedIds.has(m.id));
        messagesCacheRef.current[activeConversationId] = {
          messages: [...newOlderCached, ...currentCached],
          hasMore: Boolean(response.hasMore),
        };

        // 🛡️ Só atualiza a tela se o usuário ainda estiver na mesma conversa
        if (selectedConversationIdRef.current === activeConversationId) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOlder = response.messages.filter((m) => !existingIds.has(m.id));
            return [...newOlder, ...prev];
          });
          setHasMoreMessages(Boolean(response.hasMore));
        }
      } else {
        if (selectedConversationIdRef.current === activeConversationId) {
          setHasMoreMessages(Boolean(response.hasMore));
        }
      }
    } catch (caughtError) {
      console.error("Erro ao carregar mensagens anteriores:", caughtError);
    } finally {
      if (selectedConversationIdRef.current === activeConversationId) {
        setIsLoadingMoreMessages(false);
      }
    }
  }, [token, hasMoreMessages, isLoadingMoreMessages, messages]);

  // Ao selecionar conversa, zera contador e avisa API
  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setSelectedConversationId(conversationId);
      setChatError("");
      setReplyingToMessage(null);
      setEditingMessage(null);
      setPdfModalData(null);

      // Se estiver em chamada ativa, minimiza automaticamente para permitir navegar e conversar
      if (callState === "calling" || callState === "connected") {
        setIsCallMinimized(true);
      }
      if (isInGroupCall) {
        setIsGroupCallMinimized(true);
      }

      setConversations((current) =>
        current.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      );

      if (token) {
        markConversationAsRead(token, conversationId).catch(() => {});
      }
    },
    [token, callState, isInGroupCall],
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
      setPdfModalData(null);
      const response = await createConversation(token, participantId);
      const conversationsResponse = await getConversations(token);
      setConversations(conversationsResponse.conversations);
      setSelectedConversationId(response.conversation.id);

      // Minimiza chamada ativa se o usuário selecionar outro contato
      if (callState === "calling" || callState === "connected") {
        setIsCallMinimized(true);
      }
      if (isInGroupCall) {
        setIsGroupCallMinimized(true);
      }
    } catch (caughtError) {
      setChatError(caughtError instanceof Error ? caughtError.message : "Não foi possível criar a conversa.");
    }
  }

  async function handleGlobalUserAction(user: {
    id: string;
    relationship?: "FRIEND" | "NONE" | "INCOMING_REQUEST" | "OUTGOING_REQUEST";
    requestId?: string;
  }) {
    if (!token) {
      return;
    }

    if (user.relationship === "FRIEND") {
      await handleSelectUser(user.id);
      return;
    }

    try {
      setChatError("");

      if (user.relationship === "INCOMING_REQUEST") {
        if (!user.requestId) {
          throw new Error("Pedido de amizade nao encontrado.");
        }

        const response = await acceptConversationRequest(token, user.requestId);
        await refreshFriendData(token);
        const conversationsResponse = await getConversations(token);
        setConversations(conversationsResponse.conversations);
        setSelectedConversationId(response.conversation.id);
        return;
      }

      if (user.relationship === "OUTGOING_REQUEST") {
        setChatError("Voce ja enviou um pedido para essa pessoa.");
        return;
      }

      await sendConversationRequest(token, user.id);
      await refreshFriendData(token);
      setChatError("Pedido de amizade enviado.");
    } catch (caughtError) {
      setChatError(caughtError instanceof Error ? caughtError.message : "Nao foi possivel atualizar o pedido.");
    }
  }

  async function handleAcceptFriendRequest(requestId: string) {
    if (!token) {
      return;
    }

    const response = await acceptConversationRequest(token, requestId);
    await refreshFriendData(token);
    const conversationsResponse = await getConversations(token);
    setConversations(conversationsResponse.conversations);
    setSelectedConversationId(response.conversation.id);
  }

  async function handleRejectFriendRequest(requestId: string) {
    if (!token) {
      return;
    }

    await rejectConversationRequest(token, requestId);
    await refreshFriendData(token);
  }

  async function handleCancelFriendRequest(requestId: string) {
    if (!token) {
      return;
    }

    await cancelConversationRequest(token, requestId);
    await refreshFriendData(token);
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

  async function handleSendMessage(event: FormEvent<HTMLFormElement>, ttl?: number) {
    event.preventDefault();
    if (!token || !selectedConversationId || !messageText.trim() || !currentUser) return;

    const content = messageText.trim();
    const replyTo = replyingToMessage;
    const targetConversationId = selectedConversationId;
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const optimisticMsg: Message = {
      id: tempId,
      conversationId: targetConversationId,
      content,
      type: "text",
      createdAt: now,
      senderId: currentUser.id,
      sender: currentUser,
      replyToId: replyTo?.id,
      replyTo: replyTo || undefined,
      ttl: ttl && ttl > 0 ? ttl : undefined,
      expiresAt: ttl && ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : undefined,
      isOptimistic: true,
    };

    // ⚡ 0ms: Limpa o campo de texto e citação imediatamente
    setMessageText("");
    setReplyingToMessage(null);
    setChatError("");

    // ⚡ 0ms: Insere a mensagem otimista no estado e cache local
    setMessages((current) => [...current, optimisticMsg]);
    if (messagesCacheRef.current[targetConversationId]) {
      const cached = messagesCacheRef.current[targetConversationId];
      messagesCacheRef.current[targetConversationId] = {
        ...cached,
        messages: [...cached.messages, optimisticMsg],
      };
    }

    // ⚡ 0ms: Atualiza a barra lateral em memória e move para o topo (sem roundtrip extra)
    setConversations((current) => {
      const idx = current.findIndex((c) => c.id === targetConversationId);
      if (idx === -1) return current;
      const target = current[idx];
      const updated: Conversation = {
        ...target,
        updatedAt: now,
        messages: [
          {
            id: tempId,
            content,
            createdAt: now,
            sender: {
              id: currentUser.id,
              name: currentUser.name,
            },
          },
        ],
      };
      return [updated, ...current.filter((c) => c.id !== targetConversationId)];
    });

    // 🌐 Disparo da API em segundo plano
    try {
      const response = await sendMessage(token, targetConversationId, {
        content,
        type: "text",
        replyToId: replyTo?.id,
        ttl: ttl && ttl > 0 ? ttl : undefined,
      });

      // Reconcilia a mensagem temporária com a mensagem persistida no banco
      setMessages((current) => reconcileOptimisticMessage(current, response.message, tempId));
      if (messagesCacheRef.current[targetConversationId]) {
        const cached = messagesCacheRef.current[targetConversationId];
        messagesCacheRef.current[targetConversationId] = {
          ...cached,
          messages: reconcileOptimisticMessage(cached.messages, response.message, tempId),
        };
      }

      // Atualiza o preview na conversa caso ainda estivesse com o tempId
      setConversations((current) =>
        current.map((c) => {
          if (c.id === targetConversationId && c.messages?.[0]?.id === tempId) {
            return {
              ...c,
              messages: [
                {
                  id: response.message.id,
                  content: response.message.content,
                  createdAt: response.message.createdAt,
                  sender: {
                    id: response.message.sender.id,
                    name: response.message.sender.name,
                  },
                },
              ],
            };
          }
          return c;
        })
      );
    } catch (caughtError) {
      console.error("Falha no envio da mensagem:", caughtError);
      // Marca a mensagem otimista com erro para permitir reenvio
      setMessages((current) =>
        current.map((m) => (m.id === tempId ? { ...m, isOptimistic: false, sendError: true } : m))
      );
      if (messagesCacheRef.current[targetConversationId]) {
        const cached = messagesCacheRef.current[targetConversationId];
        messagesCacheRef.current[targetConversationId] = {
          ...cached,
          messages: cached.messages.map((m) =>
            m.id === tempId ? { ...m, isOptimistic: false, sendError: true } : m
          ),
        };
      }
    }
  }

  // Reenvio de mensagem com falha
  const handleRetryMessage = useCallback(
    async (failedMessage: Message) => {
      if (!token || !failedMessage.conversationId) return;
      const targetConversationId = failedMessage.conversationId;

      // Coloca em estado de enviando novamente
      setMessages((current) =>
        current.map((m) =>
          m.id === failedMessage.id ? { ...m, isOptimistic: true, sendError: false } : m
        )
      );

      try {
        const response = await sendMessage(token, targetConversationId, {
          content: failedMessage.content,
          type: failedMessage.type,
          replyToId: failedMessage.replyToId || undefined,
          ttl: failedMessage.ttl ?? undefined,
        });

        setMessages((current) =>
          reconcileOptimisticMessage(current, response.message, failedMessage.id)
        );
        if (messagesCacheRef.current[targetConversationId]) {
          const cached = messagesCacheRef.current[targetConversationId];
          messagesCacheRef.current[targetConversationId] = {
            ...cached,
            messages: reconcileOptimisticMessage(cached.messages, response.message, failedMessage.id),
          };
        }
      } catch (caughtError) {
        console.error("Erro ao reenviar mensagem:", caughtError);
        setMessages((current) =>
          current.map((m) =>
            m.id === failedMessage.id ? { ...m, isOptimistic: false, sendError: true } : m
          )
        );
      }
    },
    [token]
  );

  const handleSendFile = useCallback(
    async (file: File, ttl?: number) => {
      if (!token || !selectedConversationId || !currentUser) return;
      const targetConversationId = selectedConversationId;
      try {
        setIsUploadingAttachment(true);
        setChatError("");
        const uploadRes = await uploadFile(token, file);
        const sendRes = await sendMessage(token, targetConversationId, {
          type: uploadRes.type,
          fileUrl: uploadRes.fileUrl,
          fileName: uploadRes.fileName,
          fileSize: uploadRes.fileSize,
          replyToId: replyingToMessage?.id,
          ttl: ttl && ttl > 0 ? ttl : undefined,
        });

        setMessages((current) => reconcileOptimisticMessage(current, sendRes.message));
        setReplyingToMessage(null);

        // Atualiza a conversa na barra lateral em memória
        setConversations((current) => {
          const idx = current.findIndex((c) => c.id === targetConversationId);
          if (idx === -1) return current;
          const target = current[idx];
          const updated: Conversation = {
            ...target,
            updatedAt: sendRes.message.createdAt,
            messages: [
              {
                id: sendRes.message.id,
                content: sendRes.message.content || `Arquivo: ${uploadRes.fileName}`,
                createdAt: sendRes.message.createdAt,
                sender: {
                  id: currentUser.id,
                  name: currentUser.name,
                },
              },
            ],
          };
          return [updated, ...current.filter((c) => c.id !== targetConversationId)];
        });
      } catch (caughtError) {
        setChatError(
          caughtError instanceof Error ? caughtError.message : "Não foi possível enviar o arquivo.",
        );
      } finally {
        setIsUploadingAttachment(false);
      }
    },
    [token, selectedConversationId, replyingToMessage, currentUser],
  );

  const handleSendVoiceNote = useCallback(
    async (audioBlob: Blob, duration: number, ttl?: number) => {
      if (!token || !selectedConversationId || !currentUser) return;
      const targetConversationId = selectedConversationId;
      try {
        setIsUploadingAttachment(true);
        setChatError("");
        const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
          type: audioBlob.type || "audio/webm",
        });
        const uploadRes = await uploadFile(token, file);
        const sendRes = await sendMessage(token, targetConversationId, {
          type: "audio",
          fileUrl: uploadRes.fileUrl,
          fileName: uploadRes.fileName,
          fileSize: uploadRes.fileSize,
          duration,
          replyToId: replyingToMessage?.id,
          ttl: ttl && ttl > 0 ? ttl : undefined,
        });

        setMessages((current) => reconcileOptimisticMessage(current, sendRes.message));
        setReplyingToMessage(null);

        // Atualiza a conversa na barra lateral em memória
        setConversations((current) => {
          const idx = current.findIndex((c) => c.id === targetConversationId);
          if (idx === -1) return current;
          const target = current[idx];
          const updated: Conversation = {
            ...target,
            updatedAt: sendRes.message.createdAt,
            messages: [
              {
                id: sendRes.message.id,
                content: "Mensagem de voz",
                createdAt: sendRes.message.createdAt,
                sender: {
                  id: currentUser.id,
                  name: currentUser.name,
                },
              },
            ],
          };
          return [updated, ...current.filter((c) => c.id !== targetConversationId)];
        });
      } catch (caughtError) {
        setChatError(
          caughtError instanceof Error ? caughtError.message : "Não foi possível enviar o áudio.",
        );
      } finally {
        setIsUploadingAttachment(false);
      }
    },
    [token, selectedConversationId, replyingToMessage, currentUser],
  );

  // Ações de mensagem
  const handleStartReply = useCallback((msg: Message) => {
    setEditingMessage(null);
    setReplyingToMessage(msg);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingToMessage(null);
  }, []);

  const handleStartEdit = useCallback((msg: Message) => {
    setReplyingToMessage(null);
    setEditingMessage(msg);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (newContent: string) => {
      if (!token || !selectedConversationId || !editingMessage) return;
      try {
        setChatError("");
        const res = await updateMessage(token, selectedConversationId, editingMessage.id, newContent);
        setMessages((current) =>
          current.map((m) => (m.id === editingMessage.id ? { ...m, ...res.message } : m))
        );
        setEditingMessage(null);
      } catch (caughtError) {
        setChatError(
          caughtError instanceof Error ? caughtError.message : "Não foi possível editar a mensagem.",
        );
      }
    },
    [token, selectedConversationId, editingMessage],
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!token || !selectedConversationId) return;
      try {
        setChatError("");
        await deleteMessage(token, selectedConversationId, messageId);
        setMessages((current) =>
          current.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, content: "Esta mensagem foi apagada", type: "text" }
              : m,
          ),
        );
      } catch (caughtError) {
        setChatError(
          caughtError instanceof Error ? caughtError.message : "Não foi possível apagar a mensagem.",
        );
      }
    },
    [token, selectedConversationId],
  );

  const handleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!token || !selectedConversationId) return;
      try {
        const res = await toggleReaction(token, selectedConversationId, messageId, emoji);
        setMessages((current) =>
          current.map((m) => (m.id === messageId ? { ...m, reactions: res.reactions } : m)),
        );
      } catch (caughtError) {
        setChatError(
          caughtError instanceof Error ? caughtError.message : "Não foi possível reagir à mensagem.",
        );
      }
    },
    [token, selectedConversationId],
  );

  const handleToggleStar = useCallback(
    async (messageId: string) => {
      if (!token || !selectedConversationId || !currentUser) return;
      try {
        const res = await toggleStarMessage(token, selectedConversationId, messageId);
        setMessages((current) =>
          current.map((m) => {
            if (m.id !== messageId) return m;
            const starredBy = m.starredBy || [];
            const alreadyStarred = starredBy.some((s) => s.userId === currentUser.id);
            let updatedStarred;
            if (res.isStarred && !alreadyStarred) {
              updatedStarred = [...starredBy, { id: "temp", userId: currentUser.id, messageId }];
            } else if (!res.isStarred) {
              updatedStarred = starredBy.filter((s) => s.userId !== currentUser.id);
            } else {
              updatedStarred = starredBy;
            }
            return { ...m, starredBy: updatedStarred };
          }),
        );
      } catch (caughtError) {
        setChatError(
          caughtError instanceof Error ? caughtError.message : "Não foi possível favoritar a mensagem.",
        );
      }
    },
    [token, selectedConversationId, currentUser],
  );

  const handlePin = useCallback(
    async (messageId: string) => {
      if (!token || !selectedConversationId) return;
      try {
        const res = await pinMessage(token, selectedConversationId, messageId);
        setConversations((current) =>
          current.map((c) =>
            c.id === selectedConversationId
              ? { ...c, pinnedMessageId: messageId, pinnedMessage: res.pinnedMessage }
              : c,
          ),
        );
      } catch (caughtError) {
        setChatError(
          caughtError instanceof Error ? caughtError.message : "Não foi possível fixar a mensagem.",
        );
      }
    },
    [token, selectedConversationId],
  );

  const handleUnpin = useCallback(
    async () => {
      if (!token || !selectedConversationId) return;
      try {
        await unpinMessage(token, selectedConversationId);
        setConversations((current) =>
          current.map((c) =>
            c.id === selectedConversationId
              ? { ...c, pinnedMessageId: null, pinnedMessage: undefined }
              : c,
          ),
        );
      } catch (caughtError) {
        setChatError(
          caughtError instanceof Error ? caughtError.message : "Não foi possível desafixar a mensagem.",
        );
      }
    },
    [token, selectedConversationId],
  );

  const handleStartForward = useCallback((msg: Message) => {
    setMessageToForward(msg);
  }, []);

  const handleForwardMessage = useCallback(
    async (targetConversationIds: string[], targetUserIds: string[]) => {
      if (!token || !messageToForward) return;
      try {
        setChatError("");
        const finalConvIds = [...targetConversationIds];

        for (const targetUserId of targetUserIds) {
          const convRes = await createConversation(token, targetUserId);
          finalConvIds.push(convRes.conversation.id);
        }

        const payload: SendMessagePayload = {
          content: messageToForward.content,
          type: messageToForward.type,
          fileUrl: messageToForward.fileUrl || undefined,
          fileName: messageToForward.fileName || undefined,
          fileSize: messageToForward.fileSize || undefined,
          duration: messageToForward.duration || undefined,
          isForwarded: true,
        };

        for (const convId of finalConvIds) {
          const res = await sendMessage(token, convId, payload);
          if (convId === selectedConversationId) {
            setMessages((current) => addMessageIfMissing(current, res.message));
          }
        }

        const conversationsResponse = await getConversations(token);
        setConversations(conversationsResponse.conversations);
        setMessageToForward(null);
      } catch (caughtError) {
        setChatError(
          caughtError instanceof Error ? caughtError.message : "Não foi possível encaminhar a mensagem.",
        );
      }
    },
    [token, messageToForward, selectedConversationId],
  );

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

  const isMobileChatActive = Boolean(
    selectedConversationId ||
    ((callState === "calling" || callState === "connected") && !isCallMinimized) ||
    (isInGroupCall && !isGroupCallMinimized) ||
    pdfModalData
  );

  return (
    <main className={`app-shell ${isMobileChatActive ? "has-active-conversation" : "no-active-conversation"}`}>
      <Sidebar
        users={users}
        userSearchText={userSearchText}
        onSearchChange={setUserSearchText}
        onSelectUser={handleSelectUser}
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        currentUserId={currentUser.id}
        currentUser={currentUser}
        typingMap={sidebarTypingMap}
        onlineUserIds={onlineUserIds}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        calls={calls}
        isLoading={isInitialDataLoading}
        onStartVoiceCall={handleStartVoiceCallDirect}
        onStartVideoCall={handleStartVideoCallDirect}
        onSelectConversation={handleSelectConversation}
        onLogout={logout}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenSettings={() => setIsProfileModalOpen(true)}
        isMicMuted={currentMicMuted}
        isAudioMuted={currentAudioMuted}
        isVideoOff={currentVideoOff}
        isInCall={isAnyCallActive}
        onToggleMic={handleDockToggleMic}
        onToggleAudio={handleDockToggleAudio}
        onToggleVideo={handleDockToggleVideo}
      />

      {(callState === "calling" || callState === "connected") && !isCallMinimized ? (
        <ActiveCallModal
          peerName={activePeer?.userName ?? (callType === "video" ? "Chamada de Vídeo" : "Chamada de Voz")}
          peerAvatarUrl={
            conversations
              .find((c) => c.id === activePeer?.conversationId)
              ?.members.find((m) => (m.userId || m.user?.id) === activePeer?.userId)?.user?.avatarUrl ||
            users.find((u) => u.id === activePeer?.userId)?.avatarUrl
          }
          currentUserName={currentUser?.name ?? "Você"}
          callState={callState}
          callType={callType}
          callDuration={callDuration}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          isDeafened={isDeafened}
          errorMessage={callError ?? undefined}
          onRetry={() => {
            if (activePeer) {
              startCall(activePeer.userId, activePeer.userName, activePeer.conversationId, callType);
            }
          }}
          localStream={localStream}
          remoteStream={remoteStream}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onToggleDeafen={toggleDeafen}
          onMinimize={() => setIsCallMinimized(true)}
          onEndCall={endCall}
        />
      ) : isInGroupCall && !isGroupCallMinimized ? (
        <GroupCallModal
          conversationTitle={
            conversations.find((c) => c.id === groupCallConvId)?.title || "Chamada em Grupo"
          }
          callType={groupCallType}
          callDuration={groupCallDuration}
          isMuted={isGroupMuted}
          isVideoOff={isGroupVideoOff}
          isScreenSharing={isGroupScreenSharing}
          isDeafened={isGroupDeafened}
          currentUserName={currentUser?.name ?? "Você"}
          localStream={groupLocalStream}
          remoteParticipants={groupRemoteParticipants}
          onToggleMute={toggleGroupMute}
          onToggleVideo={toggleGroupVideo}
          onToggleScreenShare={toggleGroupScreenShare}
          onToggleDeafen={toggleGroupDeafen}
          onMinimize={() => setIsGroupCallMinimized(true)}
          onLeaveCall={leaveGroupCall}
        />
      ) : pdfModalData ? (
        <PdfViewerModal
          pdfUrl={pdfModalData.url}
          fileName={pdfModalData.fileName}
          onClose={() => setPdfModalData(null)}
        />
      ) : (
        <ChatPanel
          selectedConversation={selectedConversation}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name}
          error={callError || chatError || socketError}
          messages={messages}
          messageText={messageText}
          typingText={activeTypingText}
          isOnline={isRecipientOnline}
          recipientLastReadAt={activeRecipientLastReadAt}
          isLoadingMessages={isMessagesLoading}
          isUploading={isUploadingAttachment}
          hasMoreMessages={hasMoreMessages}
          isLoadingMoreMessages={isLoadingMoreMessages}
          onLoadMoreMessages={handleLoadMoreMessages}
          replyingToMessage={replyingToMessage}
          onCancelReply={handleCancelReply}
          editingMessage={editingMessage}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          onReply={handleStartReply}
          onForward={handleStartForward}
          onEdit={handleStartEdit}
          onDelete={handleDeleteMessage}
          onReaction={handleReaction}
          onToggleStar={handleToggleStar}
          onPin={handlePin}
          onUnpin={handleUnpin}
          activeGroupCallBanner={selectedConversationId ? groupCallBanners[selectedConversationId] : undefined}
          onJoinGroupCall={() => {
            if (selectedConversationId) {
              joinGroupCall(selectedConversationId, groupCallBanners[selectedConversationId]?.callType ?? "video");
            }
          }}
          onStartVoiceCall={handleStartVoiceCall}
          onStartVideoCall={handleStartVideoCall}
          onSendFile={handleSendFile}
          onSendVoiceNote={handleSendVoiceNote}
          token={token}
          onImageClick={setLightboxImage}
          onPdfClick={(url, fileName) => setPdfModalData({ url, fileName })}
          onUserClick={(user) => setActiveUserProfilePopover(user)}
          onMessageChange={setMessageText}
          onSendMessage={handleSendMessage}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          onRetryMessage={handleRetryMessage}
          onBack={() => setSelectedConversationId(null)}
        />
      )}

      {isFriendRequestsOpen && (
        <FriendRequestsModal
          isOpen={isFriendRequestsOpen}
          receivedRequests={receivedRequests}
          sentRequests={sentRequests}
          onClose={() => setIsFriendRequestsOpen(false)}
          onAccept={handleAcceptFriendRequest}
          onReject={handleRejectFriendRequest}
          onCancel={handleCancelFriendRequest}
        />
      )}
      {isCreateGroupOpen && (
        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
          users={users}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {Boolean(messageToForward) && (
        <ForwardMessageModal
          isOpen={Boolean(messageToForward)}
          onClose={() => setMessageToForward(null)}
          messageToForward={messageToForward}
          conversations={conversations}
          users={users}
          currentUserId={currentUser.id}
          onForward={handleForwardMessage}
        />
      )}

      {incomingCall && callState === "incoming" && (
        <IncomingCallModal
          callerName={incomingCall.fromUserName}
          callerAvatarUrl={users.find((u) => u.id === incomingCall.fromUserId)?.avatarUrl}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {lightboxImage && (
        <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}

      {isProfileModalOpen && currentUser && token && (
        <ProfileSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          token={token}
          onProfileUpdated={(updated) => {
            updateCurrentUser(updated);
          }}
        />
      )}

      {activeUserProfilePopover && (
        <UserProfilePopover
          user={activeUserProfilePopover}
          isOnline={onlineUserIds.has(activeUserProfilePopover.id)}
          isSelf={activeUserProfilePopover.id === currentUser?.id}
          onClose={() => setActiveUserProfilePopover(null)}
          onSendMessage={() => {
            handleSelectUser(activeUserProfilePopover.id);
          }}
          onStartVoiceCall={() => {
            handleStartVoiceCallDirect(activeUserProfilePopover.id, activeUserProfilePopover.name);
          }}
          onStartVideoCall={() => {
            handleStartVideoCallDirect(activeUserProfilePopover.id, activeUserProfilePopover.name);
          }}
        />
      )}

      {/* MODAL DE BUSCA GLOBAL (CTRL+K / COMMAND PALETTE) */}
      {isSearchOpen && (
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          token={token}
          activeConversationId={selectedConversationId}
          onlineUserIds={onlineUserIds}
          onSelectConversation={(conversationId) => {
            setSelectedConversationId(conversationId);
          }}
          onSelectUser={handleGlobalUserAction}
          onOpenCreateGroup={() => {
            setIsCreateGroupOpen(true);
          }}
          onOpenProfileSettings={() => {
            setIsProfileModalOpen(true);
          }}
          onOpenFriendRequests={() => setIsFriendRequestsOpen(true)}
          onSelectMessage={(conversationId, messageId) => {
            setSelectedConversationId(conversationId);
            setTimeout(() => {
              const el = document.getElementById(`message-${messageId}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("highlight-pulse");
                setTimeout(() => {
                  el.classList.remove("highlight-pulse");
                }, 1500);
              }
            }, 350);
          }}
        />
      )}
      {/* WIDGET FLUTUANTE DE CHAMADA MINIMIZADA (PIP) */}
      {isCallMinimized && (callState === "calling" || callState === "connected") && (
        <MinimizedCallWidget
          peerName={activePeer?.userName ?? (callType === "video" ? "Chamada de Vídeo" : "Chamada de Voz")}
          peerAvatarUrl={
            conversations
              .find((c) => c.id === activePeer?.conversationId)
              ?.members.find((m) => (m.userId || m.user?.id) === activePeer?.userId)?.user?.avatarUrl ||
            users.find((u) => u.id === activePeer?.userId)?.avatarUrl
          }
          callDuration={callDuration}
          callType={callType}
          callState={callState}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          localStream={localStream}
          remoteStream={remoteStream}
          onMaximize={() => {
            setIsCallMinimized(false);
            if (activePeer?.conversationId) {
              setSelectedConversationId(activePeer.conversationId);
            }
          }}
          onToggleMute={toggleMute}
          onEndCall={endCall}
        />
      )}

      {isGroupCallMinimized && isInGroupCall && (
        <MinimizedCallWidget
          peerName={conversations.find((c) => c.id === groupCallConvId)?.title || "Chamada em Grupo"}
          callDuration={groupCallDuration}
          callType={groupCallType}
          callState="connected"
          isMuted={isGroupMuted}
          isVideoOff={isGroupVideoOff}
          localStream={groupLocalStream}
          onMaximize={() => {
            setIsGroupCallMinimized(false);
            if (groupCallConvId) {
              setSelectedConversationId(groupCallConvId);
            }
          }}
          onToggleMute={toggleGroupMute}
          onEndCall={leaveGroupCall}
        />
      )}
    </main>
  );
}






