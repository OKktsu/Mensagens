import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/database/prisma.js";

function getDirectConversationKey(firstUserId: string, secondUserId: string) {
  return [firstUserId, secondUserId].sort().join(":");
}

async function main() {
  console.log("🌱 Iniciando o seed de usuários de teste para PulseChat...");

  const defaultPasswordHash = await bcrypt.hash("password123", 10);

  // 1. Garantir que o usuário principal Marcelo Luan existe
  let marcelo = await prisma.user.findUnique({
    where: { email: "marceloluan125@gmail.com" },
  });

  if (!marcelo) {
    marcelo = await prisma.user.create({
      data: {
        email: "marceloluan125@gmail.com",
        name: "Marcelo Luan",
        passwordHash: defaultPasswordHash,
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        bannerColor: "#7c3aed",
        bio: "🚀 Criador & Lead Developer no PulseChat",
        customStatus: "Desenvolvendo novas features",
        statusEmoji: "⚡",
      },
    });
    console.log(`✅ Usuário principal criado: ${marcelo.name} (${marcelo.email})`);
  } else {
    console.log(`ℹ️ Usuário principal já existente: ${marcelo.name} (${marcelo.email})`);
  }

  // 2. Definir lista de usuários de teste
  const testUsersData = [
    {
      email: "lucas.dev@pulsechat.io",
      name: "Lucas Silva",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      bannerColor: "#6366f1",
      bio: "💻 Fullstack Engineer | React, TypeScript, Node.js & WebRTC",
      customStatus: "Codando novas features",
      statusEmoji: "💻",
      type: "FRIEND_WITH_CHAT",
      welcomeMessage: "Fala Marcelo! O layout responsivo e as chamadas WebRTC ficaram incríveis cara! 🚀",
      replyMessage: "Testei agora no mobile e a navegação master-detail tá fluida demais!",
    },
    {
      email: "ana.design@pulsechat.io",
      name: "Ana Carolina",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      bannerColor: "#ec4899",
      bio: "🎨 Product Designer | UI/UX & Design Systems",
      customStatus: "Criando novos componentes no Figma",
      statusEmoji: "✨",
      type: "FRIEND_WITH_CHAT",
      welcomeMessage: "Oie Marcelo! Acabei de subir os novos protótipos do tema dark. Dá uma olhada em https://figma.com quando puder!",
      replyMessage: "Adorei a drawer de mídias e detalhes que você colocou no chat!",
    },
    {
      email: "gabriel.devops@pulsechat.io",
      name: "Gabriel Santos",
      avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      bannerColor: "#10b981",
      bio: "☁️ DevOps & Cloud Infrastructure | Kubernetes, Docker & CI/CD",
      customStatus: "Monitorando clusters e pipelines",
      statusEmoji: "🚀",
      type: "FRIEND_WITH_CHAT",
      welcomeMessage: "Boa tarde Marcelo! Os containers do backend e o servidor WebRTC de áudio/vídeo estão 100% operacionais.",
      replyMessage: "Qualquer dúvida sobre as variáveis de ambiente é só chamar.",
    },
    {
      email: "mariana.qa@pulsechat.io",
      name: "Mariana Costa",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
      bannerColor: "#f59e0b",
      bio: "🧪 QA Lead | Automated Testing, Cypress & Performance",
      customStatus: "Validando fluxos e cenários",
      statusEmoji: "🔍",
      type: "PENDING_INCOMING_REQUEST",
    },
    {
      email: "felipe.mobile@pulsechat.io",
      name: "Felipe Oliveira",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      bannerColor: "#06b6d4",
      bio: "📱 Mobile Engineer | Flutter & React Native",
      customStatus: "Compilando builds",
      statusEmoji: "📲",
      type: "PENDING_OUTGOING_REQUEST",
    },
    {
      email: "beatriz.data@pulsechat.io",
      name: "Beatriz Lima",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      bannerColor: "#8b5cf6",
      bio: "📊 Data Scientist & Machine Learning | Python & AI",
      customStatus: "Treinando modelos",
      statusEmoji: "🧠",
      type: "NO_RELATIONSHIP",
    },
  ];

  const createdUsers: Record<string, any> = {};

  // 3. Criar / Atualizar usuários de teste
  for (const item of testUsersData) {
    let user = await prisma.user.findUnique({
      where: { email: item.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: item.email,
          name: item.name,
          passwordHash: defaultPasswordHash,
          avatarUrl: item.avatarUrl,
          bannerColor: item.bannerColor,
          bio: item.bio,
          customStatus: item.customStatus,
          statusEmoji: item.statusEmoji,
        },
      });
      console.log(`✅ Criado usuário: ${user.name} (${user.email})`);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: item.name,
          avatarUrl: item.avatarUrl,
          bannerColor: item.bannerColor,
          bio: item.bio,
          customStatus: item.customStatus,
          statusEmoji: item.statusEmoji,
        },
      });
      console.log(`ℹ️ Atualizado usuário: ${user.name} (${user.email})`);
    }

    createdUsers[item.email] = { ...user, config: item };
  }

  // 4. Configurar amizades e conversas
  const friendEmails = ["lucas.dev@pulsechat.io", "ana.design@pulsechat.io", "gabriel.devops@pulsechat.io"];

  for (const email of friendEmails) {
    const friend = createdUsers[email];
    if (!friend) continue;

    // Criar amizade mútua (se não existir)
    await prisma.friendship.createMany({
      data: [
        { userId: marcelo.id, friendId: friend.id },
        { userId: friend.id, friendId: marcelo.id },
      ],
      skipDuplicates: true,
    });
    console.log(`🤝 Amizade confirmada: ${marcelo.name} <-> ${friend.name}`);

    // Criar conversa direta
    const directKey = getDirectConversationKey(marcelo.id, friend.id);
    let conv = await prisma.conversation.findUnique({
      where: { directKey },
    });

    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          directKey,
          members: {
            create: [
              { userId: marcelo.id },
              { userId: friend.id },
            ],
          },
        },
      });
      console.log(`💬 Conversa criada com: ${friend.name}`);
    }

    // Adicionar mensagens de histórico se a conversa estiver vazia
    const messageCount = await prisma.message.count({
      where: { conversationId: conv.id },
    });

    if (messageCount === 0) {
      const now = new Date();
      const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Mensagem do amigo
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: friend.id,
          content: friend.config.welcomeMessage || "Olá!",
          createdAt: tenMinAgo,
        },
      });

      // Mensagem do Marcelo
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: marcelo.id,
          content: "Show de bola! Valeu pelo feedback, estamos evoluindo o app a cada dia!",
          createdAt: fiveMinAgo,
        },
      });

      // Segunda mensagem do amigo
      if (friend.config.replyMessage) {
        await prisma.message.create({
          data: {
            conversationId: conv.id,
            senderId: friend.id,
            content: friend.config.replyMessage,
            createdAt: now,
          },
        });
      }

      console.log(`✉️ Mensagens de histórico adicionadas para ${friend.name}`);
    }
  }

  // 5. Configurar Grupo / Squad "Pulse Engineering 🚀"
  const squadMembers = [
    marcelo.id,
    createdUsers["lucas.dev@pulsechat.io"].id,
    createdUsers["ana.design@pulsechat.io"].id,
    createdUsers["gabriel.devops@pulsechat.io"].id,
  ];

  let groupConv = await prisma.conversation.findFirst({
    where: {
      title: "Pulse Engineering 🚀",
    },
  });

  if (!groupConv) {
    groupConv = await prisma.conversation.create({
      data: {
        title: "Pulse Engineering 🚀",
        members: {
          create: squadMembers.map((userId) => ({ userId })),
        },
      },
    });

    // Mensagens de exemplo no Squad
    await prisma.message.create({
      data: {
        conversationId: groupConv.id,
        senderId: marcelo.id,
        content: "Bem-vindos ao Squad Core Engineering do PulseChat! 🎉",
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });

    const pinnedMsg = await prisma.message.create({
      data: {
        conversationId: groupConv.id,
        senderId: createdUsers["lucas.dev@pulsechat.io"].id,
        content: "📌 Regras do Squad: Daily às 10h, deploys com CI/CD verde e PRs revisados com carinho!",
        createdAt: new Date(Date.now() - 20 * 60 * 1000),
      },
    });

    // Fixar mensagem
    await prisma.conversation.update({
      where: { id: groupConv.id },
      data: { pinnedMessageId: pinnedMsg.id },
    });

    await prisma.message.create({
      data: {
        conversationId: groupConv.id,
        senderId: createdUsers["ana.design@pulsechat.io"].id,
        content: "Protótipos atualizados no link: https://pulsechat.design/squad-v2",
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
      },
    });

    console.log(`👥 Squad "Pulse Engineering 🚀" criado com sucesso com mensagem fixada!`);
  }

  // 6. Configurar Pedido Recebido por Marcelo (Mariana Costa -> Marcelo)
  const mariana = createdUsers["mariana.qa@pulsechat.io"];
  if (mariana) {
    await prisma.conversationRequest.deleteMany({
      where: {
        senderId: mariana.id,
        receiverId: marcelo.id,
      },
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.conversationRequest.create({
      data: {
        senderId: mariana.id,
        receiverId: marcelo.id,
        status: "PENDING",
        expiresAt,
      },
    });
    console.log(`📩 Pedido de amizade pendente criado: Mariana Costa -> Marcelo Luan`);
  }

  // 7. Configurar Pedido Enviado por Marcelo (Marcelo -> Felipe Oliveira)
  const felipe = createdUsers["felipe.mobile@pulsechat.io"];
  if (felipe) {
    await prisma.conversationRequest.deleteMany({
      where: {
        senderId: marcelo.id,
        receiverId: felipe.id,
      },
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.conversationRequest.create({
      data: {
        senderId: marcelo.id,
        receiverId: felipe.id,
        status: "PENDING",
        expiresAt,
      },
    });
    console.log(`📤 Pedido de amizade pendente criado: Marcelo Luan -> Felipe Oliveira`);
  }

  console.log("\n✨ Seed finalizado com sucesso!");
  console.log("-------------------------------------------------------");
  console.log("🔑 Senha padrão de todos os usuários criados: password123");
  console.log("-------------------------------------------------------");
}

main()
  .catch((err) => {
    console.error("❌ Erro durante o seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
