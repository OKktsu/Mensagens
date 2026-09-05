import { PrismaClient } from "@prisma/client";

// Sanitiza a URL do banco de dados removendo aspas ou espaços acidentais
const databaseUrl = process.env.DATABASE_URL?.replace(/^["']|["']$/g, "").trim();

export const prisma = new PrismaClient({
  datasources: databaseUrl
    ? {
        db: {
          url: databaseUrl,
        },
      }
    : undefined,
});
