import { FormEvent, useEffect, useMemo, useState, useCallback } from "react";
import {
  Conversation,
  Message,
  User,
  CallRecord,
  createConversation,
  createGroup,
  getConversations,
  getMessages,
  getUsers,
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
import { addMessageIfMissing } from "./utils/chat-helpers";
import { AuthScreen } from "./components/auth/AuthScreen";
import { Sidebar } from "./components/sidebar/Sidebar";
import { SidebarTab } from "./components/sidebar/SidebarHeader";
import { ChatPanel } from "./components/chat/ChatPanel";
import { CreateGroupModal } from "./components/sidebar/CreateGroupModal";
import { ForwardMessageModal } from "./components/chat/ForwardMessageModal";
import { IncomingCallModal } from "./components/call/IncomingCallModal";
import { ActiveCallModal } from "./components/call/ActiveCallModal";
import { GroupCallModal } from "./components/call/GroupCallModal";
import { ImageLightbox } from "./components/chat/ImageLightbox";
import { PdfViewerModal } from "./components/chat/PdfViewerModal";
import { GlobalSearchModal } from "./components/search/GlobalSearchModal";

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

  const [activeTab, setActiveTab] = useState<SidebarTab>("chats");
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [pdfModalData, setPdfModalData] = useState<{ url: string; fileName?: string } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  // Manipulador de mensagem excluída em tempo real (soft delete)
  const handleMessageDeleted = useCallback((payload: { conversationId: string; messageId: string }) => {
    setMessages((current) =>
      current.map((msg) =>
        msg.id === payload.messageId
          ? { ...msg, isDeleted: true, content: "🚫 Esta mensagem foi apagada", type: "text" }
          : msg
      )
    );
    setConversations((current) =>
      current.map((c) => {
        if (c.id === payload.conversationId && c.messages?.[0]?.id === payload.messageId) {
          return {
            ...c,
            messages: [
              {
                ...c.messages[0],
                content: "🚫 Esta mensagem foi apagada",
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
  } = useWebRTCCall(socket, token, handleCallLogged);

  const {
    isInGroupCall,
    activeConversationId: groupCallConvId,
    callType: groupCallType,
    isMuted: isGroupMuted,
    isVideoOff: isGroupVideoOff,
    callDuration: groupCallDuration,
    localStream: groupLocalStream,
    remoteParticipants: groupRemoteParticipants,
    groupCallBanners,
    joinGroupCall,
    leaveGroupCall,
    toggleMute: toggleGroupMute,
    toggleVideo: toggleGroupVideo,
  } = useGroupWebRTCCall(socket, token, currentUser?.id, handleCallLogged);

  const handleStartVoiceCall = useCallback(() => {
    if (!selectedConversation || !currentUser) return;
    const isGroup = Boolean(selectedConversation.title || selectedConversation.members.length > 2);
    if (isGroup) {
      joinGroupCall(selectedConversation.id, "audio");
      return;
    }
    const otherMember = selectedConversation.members.find(
      (m) => (m.userId || m.user?.id) !== currentUser.id,
    );
    if (!otherMember) return;
    const otherId = otherMember.userId || otherMember.user.id;
    const otherName = otherMember.user.name;
    startCall(otherId, otherName, selectedConversation.id, "audio");
  }, [selectedConversation, currentUser, joinGroupCall, startCall]);

  const handleStartVideoCall = useCallback(() => {
    if (!selectedConversation || !currentUser) return;
    const isGroup = Boolean(selectedConversation.title || selectedConversation.members.length > 2);
    if (isGroup) {
      joinGroupCall(selectedConversation.id, "video");
      return;
    }
    const otherMember = selectedConversation.members.find(
      (m) => (m.userId || m.user?.id) !== currentUser.id,
    );
    if (!otherMember) return;
    const otherId = otherMember.userId || otherMember.user.id;
    const otherName = otherMember.user.name;
    startCall(otherId, otherName, selectedConversation.id, "video");
  }, [selectedConversation, currentUser, joinGroupCall, startCall]);

  const handleStartVoiceCallDirect = useCallback((targetUserId: string, targetUserName: string, conversationId?: string) => {
    startCall(targetUserId, targetUserName, conversationId ?? "", "audio");
  }, [startCall]);

  const handleStartVideoCallDirect = useCallback((targetUserId: string, targetUserName: string, conversationId?: string) => {
    startCall(targetUserId, targetUserName, conversationId ?? "", "video");
  }, [startCall]);


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
        setChatError("");
        const [usersResponse, conversationsResponse, callsResponse] = await Promise.all([
          getUsers(authToken),
          getConversations(authToken),
          getCalls(authToken).catch(() => ({ calls: [] })),
        ]);

        setUsers(usersResponse.users);
        setConversations(conversationsResponse.conversations);
        setCalls(callsResponse.calls);


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
        setChatError("");
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
      setChatError("");
      setReplyingToMessage(null);
      setEditingMessage(null);

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
      const response = await sendMessage(token, selectedConversationId, {
        content: messageText,
        type: "text",
        replyToId: replyingToMessage?.id,
      });
      setMessages((current) => addMessageIfMissing(current, response.message));
      setMessageText("");
      setReplyingToMessage(null);
      const conversationsResponse = await getConversations(token);
      setConversations(conversationsResponse.conversations);
    } catch (caughtError) {
      setChatError(caughtError instanceof Error ? caughtError.message : "Não foi possível enviar a mensagem.");
    }
  }

  const handleSendFile = useCallback(
    async (file: File) => {
      if (!token || !selectedConversationId) return;
      try {
        setChatError("");
        const uploadRes = await uploadFile(token, file);
        const sendRes = await sendMessage(token, selectedConversationId, {
          type: uploadRes.type,
          fileUrl: uploadRes.fileUrl,
          fileName: uploadRes.fileName,
          fileSize: uploadRes.fileSize,
          replyToId: replyingToMessage?.id,
        });
        setMessages((current) => addMessageIfMissing(current, sendRes.message));
        setReplyingToMessage(null);
        const conversationsResponse = await getConversations(token);
        setConversations(conversationsResponse.conversations);
      } catch (caughtError) {
        setChatError(
          caughtError instanceof Error ? caughtError.message : "Não foi possível enviar o arquivo.",
        );
      }
    },
    [token, selectedConversationId, replyingToMessage],
  );

  const handleSendVoiceNote = useCallback(
    async (audioBlob: Blob, duration: number) => {
      if (!token || !selectedConversationId) return;
      try {
        setChatError("");
        const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
          type: audioBlob.type || "audio/webm",
        });
        const uploadRes = await uploadFile(token, file);
        const sendRes = await sendMessage(token, selectedConversationId, {
          type: "audio",
          fileUrl: uploadRes.fileUrl,
          fileName: uploadRes.fileName,
          fileSize: uploadRes.fileSize,
          duration,
          replyToId: replyingToMessage?.id,
        });
        setMessages((current) => addMessageIfMissing(current, sendRes.message));
        setReplyingToMessage(null);
        const conversationsResponse = await getConversations(token);
        setConversations(conversationsResponse.conversations);
      } catch (caughtError) {
        setChatError(
          caughtError instanceof Error ? caughtError.message : "Não foi possível enviar o áudio.",
        );
      }
    },
    [token, selectedConversationId, replyingToMessage],
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
              ? { ...m, isDeleted: true, content: "🚫 Esta mensagem foi apagada", type: "text" }
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
        currentUser={currentUser}
        typingMap={sidebarTypingMap}
        onlineUserIds={onlineUserIds}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        calls={calls}
        onStartVoiceCall={handleStartVoiceCallDirect}
        onStartVideoCall={handleStartVideoCallDirect}
        onSelectConversation={handleSelectConversation}
        onLogout={logout}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

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

      <ForwardMessageModal
        isOpen={Boolean(messageToForward)}
        onClose={() => setMessageToForward(null)}
        messageToForward={messageToForward}
        conversations={conversations}
        users={users}
        currentUserId={currentUser.id}
        onForward={handleForwardMessage}
      />

      {incomingCall && callState === "incoming" && (
        <IncomingCallModal
          callerName={incomingCall.fromUserName}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {(callState === "calling" || callState === "connected") && (
        <ActiveCallModal
          peerName={activePeer?.userName ?? (callType === "video" ? "Chamada de Vídeo" : "Chamada de Voz")}
          callState={callState}
          callType={callType}
          callDuration={callDuration}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          localStream={localStream}
          remoteStream={remoteStream}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
        />
      )}

      {isInGroupCall && (
        <GroupCallModal
          conversationTitle={
            conversations.find((c) => c.id === groupCallConvId)?.title || "Chamada em Grupo"
          }
          callType={groupCallType}
          callDuration={groupCallDuration}
          isMuted={isGroupMuted}
          isVideoOff={isGroupVideoOff}
          currentUserName={currentUser.name}
          localStream={groupLocalStream}
          remoteParticipants={groupRemoteParticipants}
          onToggleMute={toggleGroupMute}
          onToggleVideo={toggleGroupVideo}
          onLeaveCall={leaveGroupCall}
        />
      )}

      {lightboxImage && (
        <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}

      {pdfModalData && (
        <PdfViewerModal
          pdfUrl={pdfModalData.url}
          fileName={pdfModalData.fileName}
          onClose={() => setPdfModalData(null)}
        />
      )}

      {/* MODAL DE BUSCA GLOBAL (CTRL+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        token={token}
        activeConversationId={selectedConversationId}
        onSelectUser={(user) => {
          handleSelectUser(user.id);
        }}
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
    </main>
  );
}






