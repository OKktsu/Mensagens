import "dotenv/config";

import { createServer } from "node:http";
import { Server } from "socket.io";

import { createApp } from "./app.js";
import { isFrontendOriginAllowed } from "./config/frontend-origins.js";
import { setupSocketServer } from "./realtime/socket.js";
import { ensureBucketExists } from "./config/supabase.js";
import { initStorageCleanupCron } from "./jobs/cleanup.cron.js";

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

// Inicializa o bucket privado do Supabase Storage e o Agendador (Cron/Worker)
ensureBucketExists().catch(() => {});
initStorageCleanupCron();

httpServer.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
