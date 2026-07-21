import { prisma } from "../database/prisma.js";

export async function listUsers(currentUserId: string) {
  return prisma.user.findMany({
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
    },
  });
}
