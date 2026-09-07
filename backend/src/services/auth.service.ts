import bcrypt from "bcryptjs";

import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/app-error.js";
import { signAuthToken } from "../utils/auth-token.js";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bannerColor?: string | null;
  bio?: string | null;
  customStatus?: string | null;
  statusEmoji?: string | null;
};

type AuthResponse = {
  user: AuthUser;
  token: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateRegisterInput(name: string, email: string, password: string) {
  if (!name.trim()) {
    throw new AppError("Nome e obrigatorio.");
  }

  if (!email.includes("@")) {
    throw new AppError("Email invalido.");
  }

  if (password.length < 6) {
    throw new AppError("A senha deve ter pelo menos 6 caracteres.");
  }
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  validateRegisterInput(name, email, password);

  const normalizedEmail = normalizeEmail(email);
  const userAlreadyExists = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (userAlreadyExists) {
    throw new AppError("Ja existe um usuario com esse email.", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
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

  return {
    user,
    token: signAuthToken(user.id),
  };
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({
    where: {
      email: normalizeEmail(email),
    },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
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
    throw new AppError("Email ou senha invalidos.", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Email ou senha invalidos.", 401);
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bannerColor: user.bannerColor,
      bio: user.bio,
      customStatus: user.customStatus,
      statusEmoji: user.statusEmoji,
    },
    token: signAuthToken(user.id),
  };
}
