import "dotenv/config";

// Sanitiza aspas acidentais nas variáveis de ambiente do Render
for (const key of Object.keys(process.env)) {
  const val = process.env[key];
  if (typeof val === "string") {
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      process.env[key] = val.slice(1, -1).trim();
    }
  }
}

import { createServer } from "node:http";
import { Server } from "socket.io";

import { createApp } from "./app.js";
import { isFrontendOriginAllowed } from "./config/frontend-origins.js";
import { setupSocketServer } from "./realtime/socket.js";
import { ensureBucketExists } from "./config/supabase.js";
import { initStorageCleanupCron } from "./jobs/cleanup.cron.js";
import { initTtlScheduler } from "./services/ttl-scheduler.service.js";
import { prisma } from "./database/prisma.js";

const port = Number(process.env.PORT ?? 3333);
const app = createApp();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (!origin || isFrontendOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origem nao permitida pelo CORS."));
    },
  },
});

setupSocketServer(io);

// Inicializa o bucket privado do Supabase Storage, o Agendador de Limpeza e o Scheduler de Autodestruição (TTL)
ensureBucketExists().catch(() => {});
initStorageCleanupCron();
initTtlScheduler().catch(() => {});

// Testa a conexão do banco de dados na inicialização
prisma.$connect()
  .then(() => console.log("[Database] Conexão com Supabase PostgreSQL estabelecida com sucesso! ✅"))
  .catch((err) => console.error("[Database] Erro ao conectar ao PostgreSQL:", err.message));

httpServer.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
