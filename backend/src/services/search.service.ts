import { prisma } from "../database/prisma.js";

export type SearchCategory = "all" | "messages" | "users" | "media" | "links" | "files";

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
  };
};

export type SearchUserResult = {
  id: string;
  name: string;
  email: string;
};

export type SearchResults = {
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
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { messages: [], users: [], totalMatches: 0 };
  }

  // Conversas das quais o usuário é membro
  const userConversationFilter = conversationId
    ? { id: conversationId, members: { some: { userId } } }
    : { members: { some: { userId } } };

  let messageWhere: any = {
    isDeleted: false,
    conversation: userConversationFilter,
  };

  if (category === "media") {
    messageWhere.type = "image";
    messageWhere.content = { contains: trimmedQuery, mode: "insensitive" };
  } else if (category === "files") {
    messageWhere.type = "file";
    messageWhere.OR = [
      { fileName: { contains: trimmedQuery, mode: "insensitive" } },
      { content: { contains: trimmedQuery, mode: "insensitive" } },
    ];
  } else if (category === "links") {
    messageWhere.AND = [
      {
        OR: [
          { content: { contains: "http://", mode: "insensitive" } },
          { content: { contains: "https://", mode: "insensitive" } },
        ],
      },
      { content: { contains: trimmedQuery, mode: "insensitive" } },
    ];
  } else {
    // category === "messages" || category === "all"
    messageWhere.content = { contains: trimmedQuery, mode: "insensitive" };
  }

  const shouldFetchMessages = category !== "users";
  const shouldFetchUsers = (category === "all" || category === "users") && !conversationId;

  const [messages, users] = await Promise.all([
    shouldFetchMessages
      ? prisma.message.findMany({
          where: messageWhere,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
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
    shouldFetchUsers
      ? prisma.user.findMany({
          where: {
            id: { not: userId },
            OR: [
              { name: { contains: trimmedQuery, mode: "insensitive" } },
              { email: { contains: trimmedQuery, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  const formattedMessages: SearchMessageResult[] = messages.map((msg) => {
    // Se a conversa não tiver título explícito (DM direta), gera título a partir do outro membro
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
    messages: formattedMessages,
    users,
    totalMatches: formattedMessages.length + users.length,
  };
}
