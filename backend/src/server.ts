import "dotenv/config";

import { createServer } from "node:http";
import { Server } from "socket.io";

import { createApp } from "./app.js";
import { setupSocketServer } from "./realtime/socket.js";

const port = Number(process.env.PORT ?? 3333);
const app = createApp();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.FRONTEND_URL ?? "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ],
  },
});

setupSocketServer(io);

httpServer.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
