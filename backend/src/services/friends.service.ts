import { prisma } from "../database/prisma.js";
import { createSignedMediaUrl } from "../config/supabase.js";

const publicUserSelection = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  avatarUrl: true,
  bannerUrl: true,
  bannerColor: true,
  bio: true,
  customStatus: true,
  statusEmoji: true,
} as const;

async function formatUserProfile<T extends { avatarUrl?: string | null; bannerUrl?: string | null }>(
  user: T,
): Promise<T> {
  const [avatarUrl, bannerUrl] = await Promise.all([
    user.avatarUrl ? createSignedMediaUrl(user.avatarUrl) : Promise.resolve(null),
    user.bannerUrl ? createSignedMediaUrl(user.bannerUrl) : Promise.resolve(null),
  ]);

  return {
    ...user,
    avatarUrl,
    bannerUrl,
  };
}

export async function listFriends(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: { userId },
    orderBy: {
      friend: {
        name: "asc",
      },
    },
    select: {
      friend: {
        select: publicUserSelection,
      },
    },
  });

  return Promise.all(friendships.map(({ friend }) => formatUserProfile(friend)));
}

export async function searchPeople(currentUserId: string, query: string) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      OR: [
        { name: { contains: normalizedQuery, mode: "insensitive" } },
        { email: { contains: normalizedQuery, mode: "insensitive" } },
      ],
    },
    select: publicUserSelection,
    take: 10,
  });

  const userIds = users.map((user) => user.id);
  const [friendships, pendingRequests] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        userId: currentUserId,
        friendId: { in: userIds },
      },
      select: { friendId: true },
    }),
    prisma.conversationRequest.findMany({
      where: {
        status: "PENDING",
        expiresAt: { gt: new Date() },
        OR: [
          { senderId: currentUserId, receiverId: { in: userIds } },
          { receiverId: currentUserId, senderId: { in: userIds } },
        ],
      },
      select: {
        senderId: true,
        receiverId: true,
      },
    }),
  ]);

  const friendIds = new Set(friendships.map((friendship) => friendship.friendId));

  const formattedUsers = await Promise.all(users.map(formatUserProfile));

  return formattedUsers.map((user) => {
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
        pendingRequest.receiverId === currentUserId
          ? ("INCOMING_REQUEST" as const)
          : ("OUTGOING_REQUEST" as const),
    };
  });
}