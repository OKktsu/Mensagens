import { prisma } from "../database/prisma.js";
import { createSignedMediaUrl } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";

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

export async function listUsers(currentUserId: string) {
  const users = await prisma.user.findMany({
    where: {
      id: {
        not: currentUserId,
      },
    },
    orderBy: {
      name: "asc",
    },
    select: {
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
    },
  });

  return Promise.all(users.map(formatUserProfile));
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
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
    },
  });

  if (!user) {
    throw new AppError("Usuário não encontrado.", 404);
  }

  return formatUserProfile(user);
}

export type UpdateProfileInput = {
  name?: string;
  bio?: string | null;
  bannerColor?: string | null;
  customStatus?: string | null;
  statusEmoji?: string | null;
};

export async function updateUserProfile(userId: string, input: UpdateProfileInput) {
  const data: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) {
      throw new AppError("O nome não pode ficar vazio.", 400);
    }
    data.name = trimmed;
  }

  if (input.bio !== undefined) {
    data.bio = input.bio ? input.bio.trim() : null;
  }

  if (input.bannerColor !== undefined) {
    data.bannerColor = input.bannerColor ? input.bannerColor.trim() : "#5865F2";
  }

  if (input.customStatus !== undefined) {
    data.customStatus = input.customStatus ? input.customStatus.trim() : null;
  }

  if (input.statusEmoji !== undefined) {
    data.statusEmoji = input.statusEmoji ? input.statusEmoji.trim() : null;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
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
    },
  });

  return formatUserProfile(updated);
}

export async function updateUserAvatar(userId: string, avatarUrl: string | null) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: {
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
    },
  });

  return formatUserProfile(updated);
}

export async function updateUserBanner(userId: string, bannerUrl: string | null) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { bannerUrl },
    select: {
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
    },
  });

  return formatUserProfile(updated);
}

