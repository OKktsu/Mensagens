import { prisma } from "../database/prisma.js";
import { emitMessageDeleted, emitMessageUpdated } from "../realtime/socket.js";
import { deleteFromStorage } from "../config/supabase.js";

// Mapa de timers ativos em memória (RAM) indexados pelo messageId
const activeTimers = new Map<string, NodeJS.Timeout>();

const messageSelect = {
  id: true,
  content: true,
  type: true,
  fileUrl: true,
  fileName: true,
  fileSize: true,
  duration: true,
  isForwarded: true,
  isEdited: true,
  isDeleted: true,
  replyToId: true,
  expiresAt: true,
  ttl: true,
  createdAt: true,
  updatedAt: true,
  conversationId: true,
  senderId: true,
  sender: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

/**
 * Agenda a expiração de uma mensagem autodestrutiva no milissegundo exato.
 */
export function scheduleMessageExpiration(
  messageId: string,
  expiresAt: Date | string,
  conversationId: string,
): void {
  // Se já houver um timer para esta mensagem, limpa antes
  cancelMessageExpiration(messageId);

  const expirationDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const now = Date.now();
  const delayMs = Math.max(0, expirationDate.getTime() - now);

  // Se o delay for maior que o máximo suportado pelo setTimeout do Node (~24.8 dias), não agenda em RAM
  if (delayMs > 2147483647) {
    return;
  }

  const timer = setTimeout(async () => {
    activeTimers.delete(messageId);
    try {
      // 1. Busca os dados da mensagem para saber se há arquivo no Storage
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { id: true, fileUrl: true, conversationId: true },
      });

      if (message) {
        // Se houver arquivo ou áudio anexado, remove do Supabase Storage
        if (message.fileUrl) {
          await deleteFromStorage([message.fileUrl]).catch(() => {});
        }

        // Atualiza a mensagem como expirada (removendo conteúdo sensível e mídias)
        const expiredMessage = await prisma.message.update({
          where: { id: messageId },
          data: {
            content: "Esta mensagem expirou",
            fileUrl: null,
            fileName: null,
            fileSize: null,
            duration: null,
            isDeleted: true,
            updatedAt: new Date(),
          },
          select: messageSelect,
        }).catch(() => null);

        if (expiredMessage) {
          emitMessageUpdated(expiredMessage as any);
        } else {
          await emitMessageDeleted({
            conversationId: message.conversationId,
            messageId: message.id,
          });
        }

        console.log(`[TTL Scheduler] 🔥 Mensagem ${messageId} expirada no segundo exato.`);
      }
    } catch (err) {
      console.error(`[TTL Scheduler] Erro ao expirar mensagem ${messageId}:`, err);
    }
  }, delayMs);

  activeTimers.set(messageId, timer);
}

/**
 * Cancela o timer de autodestruição de uma mensagem (por exemplo, se o usuário a deletou manualmente).
 */
export function cancelMessageExpiration(messageId: string): void {
  const existingTimer = activeTimers.get(messageId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    activeTimers.delete(messageId);
  }
}

/**
 * Inicializa o agendador de mensagens autodestrutivas no startup do servidor:
 * 1. Limpa mídias e marca mensagens vencidas como expiradas.
 * 2. Re-agenda os timers das mensagens com TTL ainda ativas.
 */
export async function initTtlScheduler(): Promise<void> {
  try {
    console.log("[TTL Scheduler] ⏱️ Inicializando agendador de mensagens autodestrutivas...");
    const now = new Date();

    // 1. Limpa mensagens que já venceram
    const expiredMessages = await prisma.message.findMany({
      where: {
        expiresAt: { lte: now },
        NOT: {
          content: "Esta mensagem expirou",
        },
      },
      select: { id: true, fileUrl: true, conversationId: true },
    });

    if (expiredMessages.length > 0) {
      console.log(`[TTL Scheduler] 🧹 Marcando ${expiredMessages.length} mensagens vencidas durante desligamento como expiradas...`);
      for (const msg of expiredMessages) {
        if (msg.fileUrl) {
          await deleteFromStorage([msg.fileUrl]).catch(() => {});
        }
        await prisma.message.update({
          where: { id: msg.id },
          data: {
            content: "Esta mensagem expirou",
            fileUrl: null,
            fileName: null,
            fileSize: null,
            duration: null,
            isDeleted: true,
            updatedAt: new Date(),
          },
        }).catch(() => {});
      }
    }

    // 2. Re-agenda mensagens ativas com TTL que vencem no futuro
    const upcomingMessages = await prisma.message.findMany({
      where: {
        expiresAt: { gt: now },
      },
      select: { id: true, expiresAt: true, conversationId: true },
    });

    for (const msg of upcomingMessages) {
      if (msg.expiresAt) {
        scheduleMessageExpiration(msg.id, msg.expiresAt, msg.conversationId);
      }
    }

    console.log(`[TTL Scheduler] ✅ Agendador ativo com ${upcomingMessages.length} timers de autodestruição armados na RAM.`);
  } catch (err) {
    console.error("[TTL Scheduler] Erro ao inicializar agendador:", err);
  }
}
