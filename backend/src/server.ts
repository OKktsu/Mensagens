import "dotenv/config";

import { createServer } from "node:http";
import { Server } from "socket.io";

import { createApp } from "./app.js";
import { getAllowedFrontendOrigins } from "./config/frontend-origins.js";
import { setupSocketServer } from "./realtime/socket.js";

const port = Number(process.env.PORT ?? 3333);
const app = createApp();
const httpServer = createServer(app);
const allowedOrigins = getAllowedFrontendOrigins();

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
  },
});

setupSocketServer(io);

httpServer.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
