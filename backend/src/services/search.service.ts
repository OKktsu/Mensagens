import { prisma } from "../database/prisma.js";

export type SearchCategory =
  | "all"
  | "conversations"
  | "messages"
  | "users"
  | "media"
  | "links"
  | "files";

export type SearchConversationResult = {
  id: string;
  title: string;
  isGroup: boolean;
  memberCount: number;
  avatarUrl?: string | null;
  lastMessage?: {
    content: string;
    createdAt: Date;
    senderName: string;
    type: string;
  } | null;
  updatedAt: Date;
};

export type SearchUserResult = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  customStatus?: string | null;
  statusEmoji?: string | null;
  bio?: string | null;
};

export type SearchMessageResult = {
  id: string;
  content: string;
  type: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  createdAt: Date;
  conversationId: string;
  conversationTitle?: string | null;
  sender: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
};

export type SearchResults = {
  conversations: SearchConversationResult[];
  messages: SearchMessageResult[];
  users: SearchUserResult[];
  totalMatches: number;
};

export async function searchContent(
  userId: string,
  query: string,
  category: SearchCategory = "all",
  conversationId?: string,
): Promise<SearchResults> {
  let effectiveQuery = query.trim();
  let effectiveCategory = category;

  // Detecção inteligente de prefixos rápidos (@, #, !)
  if (effectiveQuery.startsWith("@") && effectiveQuery.length > 1) {
    effectiveCategory = "users";
    effectiveQuery = effectiveQuery.slice(1).trim();
  } else if (effectiveQuery.startsWith("#") && effectiveQuery.length > 1) {
    effectiveCategory = "conversations";
    effectiveQuery = effectiveQuery.slice(1).trim();
  } else if (effectiveQuery.startsWith("!") && effectiveQuery.length > 1) {
    effectiveCategory = "messages";
    effectiveQuery = effectiveQuery.slice(1).trim();
  }

  // 1. ESTADO INICIAL VAZIO: Retorna conversas recentes e contatos frequentes (Quick Switcher)
  if (!effectiveQuery) {
    const recentConversations = await prisma.conversation.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                customStatus: true,
                statusEmoji: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    });

    const formattedConversations: SearchConversationResult[] = recentConversations.map((conv) => {
      const isGroup = !!conv.title || conv.members.length > 2;
      let title = conv.title;
      let avatarUrl: string | null = null;

      if (!title) {
        const otherMember = conv.members.find((m) => m.user.id !== userId);
        title = otherMember ? otherMember.user.name : "Conversa Direta";
        avatarUrl = otherMember?.user.avatarUrl || null;
      }

      const lastMsg = conv.messages[0];

      return {
        id: conv.id,
        title,
        isGroup,
        memberCount: conv.members.length,
        avatarUrl,
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              createdAt: lastMsg.createdAt,
              senderName: lastMsg.sender.name,
              type: lastMsg.type,
            }
          : null,
        updatedAt: conv.updatedAt,
      };
    });

    return {
      conversations: formattedConversations,
      messages: [],
      users: [],
      totalMatches: formattedConversations.length,
    };
  }

  // 2. BUSCA FILTRADA COM TERMO
  const userConversationFilter = conversationId
    ? { id: conversationId, members: { some: { userId } } }
    : { members: { some: { userId } } };

  const shouldFetchConversations =
    (effectiveCategory === "all" || effectiveCategory === "conversations") && !conversationId;
  const shouldFetchUsers =
    (effectiveCategory === "all" || effectiveCategory === "users") && !conversationId;
  const shouldFetchMessages =
    effectiveCategory !== "users" && effectiveCategory !== "conversations";

  let messageWhere: any = {
    isDeleted: false,
    conversation: userConversationFilter,
  };

  if (effectiveCategory === "media") {
    messageWhere.type = "image";
    messageWhere.content = { contains: effectiveQuery, mode: "insensitive" };
  } else if (effectiveCategory === "files") {
    messageWhere.type = "file";
    messageWhere.OR = [
      { fileName: { contains: effectiveQuery, mode: "insensitive" } },
      { content: { contains: effectiveQuery, mode: "insensitive" } },
    ];
  } else if (effectiveCategory === "links") {
    messageWhere.AND = [
      {
        OR: [
          { content: { contains: "http://", mode: "insensitive" } },
          { content: { contains: "https://", mode: "insensitive" } },
        ],
      },
      { content: { contains: effectiveQuery, mode: "insensitive" } },
    ];
  } else {
    // effectiveCategory === "messages" || effectiveCategory === "all"
    messageWhere.content = { contains: effectiveQuery, mode: "insensitive" };
  }

  const [conversationsRaw, usersRaw, messagesRaw] = await Promise.all([
    // A. Buscar conversas que o usuário participa
    shouldFetchConversations
      ? prisma.conversation.findMany({
          where: {
            members: { some: { userId } },
            OR: [
              { title: { contains: effectiveQuery, mode: "insensitive" } },
              {
                members: {
                  some: {
                    user: {
                      name: { contains: effectiveQuery, mode: "insensitive" },
                    },
                  },
                },
              },
            ],
          },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                sender: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 15,
        })
      : Promise.resolve([]),

    // B. Buscar usuários (com fotos de perfil e status)
    shouldFetchUsers
      ? prisma.user.findMany({
          where: {
            id: { not: userId },
            OR: [
              { name: { contains: effectiveQuery, mode: "insensitive" } },
              { email: { contains: effectiveQuery, mode: "insensitive" } },
              { customStatus: { contains: effectiveQuery, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            customStatus: true,
            statusEmoji: true,
            bio: true,
          },
          take: 10,
        })
      : Promise.resolve([]),

    // C. Buscar mensagens
    shouldFetchMessages
      ? prisma.message.findMany({
          where: messageWhere,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
            conversation: {
              select: {
                id: true,
                title: true,
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 30,
        })
      : Promise.resolve([]),
  ]);

  const matchedUserIds = usersRaw.map((user) => user.id);
  const [friendships, pendingRequests] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        userId,
        friendId: { in: matchedUserIds },
      },
      select: { friendId: true },
    }),
    prisma.conversationRequest.findMany({
      where: {
        status: "PENDING",
        expiresAt: { gt: new Date() },
        OR: [
          { senderId: userId, receiverId: { in: matchedUserIds } },
          { receiverId: userId, senderId: { in: matchedUserIds } },
        ],
      },
      select: { id: true, senderId: true, receiverId: true },
    }),
  ]);

  const friendIds = new Set(friendships.map((friendship) => friendship.friendId));
  const formattedUsers = usersRaw.map((user) => {
    if (friendIds.has(user.id)) {
      return { ...user, relationship: "FRIEND" as const };
    }

    const pendingRequest = pendingRequests.find(
      (request) => request.senderId === user.id || request.receiverId === user.id,
    );

    if (!pendingRequest) {
      return { ...user, relationship: "NONE" as const };
    }

    return {
      ...user,
      relationship:
        pendingRequest.receiverId === userId
          ? ("INCOMING_REQUEST" as const)
          : ("OUTGOING_REQUEST" as const),
      requestId: pendingRequest.id,
    };
  });
  // Formatar Conversas
  const formattedConversations: SearchConversationResult[] = conversationsRaw.map((conv) => {
    const isGroup = !!conv.title || conv.members.length > 2;
    let title = conv.title;
    let avatarUrl: string | null = null;

    if (!title) {
      const otherMember = conv.members.find((m) => m.user.id !== userId);
      title = otherMember ? otherMember.user.name : "Conversa Direta";
      avatarUrl = otherMember?.user.avatarUrl || null;
    }

    const lastMsg = conv.messages[0];

    return {
      id: conv.id,
      title,
      isGroup,
      memberCount: conv.members.length,
      avatarUrl,
      lastMessage: lastMsg
        ? {
            content: lastMsg.content,
            createdAt: lastMsg.createdAt,
            senderName: lastMsg.sender.name,
            type: lastMsg.type,
          }
        : null,
      updatedAt: conv.updatedAt,
    };
  });

  // Formatar Mensagens
  const formattedMessages: SearchMessageResult[] = messagesRaw.map((msg) => {
    let convTitle = msg.conversation.title;
    if (!convTitle) {
      const otherMember = msg.conversation.members.find((m) => m.user.id !== userId);
      convTitle = otherMember ? otherMember.user.name : "Conversa Direta";
    }

    return {
      id: msg.id,
      content: msg.content,
      type: msg.type,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      createdAt: msg.createdAt,
      conversationId: msg.conversationId,
      conversationTitle: convTitle,
      sender: msg.sender,
    };
  });

  return {
    conversations: formattedConversations,
    users: formattedUsers,
    messages: formattedMessages,
    totalMatches:
      formattedConversations.length + usersRaw.length + formattedMessages.length,
  };
}
