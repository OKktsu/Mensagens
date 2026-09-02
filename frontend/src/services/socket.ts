import { io, Socket } from "socket.io-client";

import type { Message } from "./api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

export type TypingPayload = {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
};

type ServerToClientEvents = {
  "connection:ready": (payload: { socketId: string; userId?: string }) => void;
  "message:new": (message: Message) => void;
  "user:typing": (payload: TypingPayload) => void;
};

type ClientToServerEvents = {
  "conversation:join": (conversationId: string, callback?: (response: { ok: boolean }) => void) => void;
  "conversation:leave": (conversationId: string) => void;
  "typing:start": (payload: { conversationId: string }) => void;
  "typing:stop": (payload: { conversationId: string }) => void;
};

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createChatSocket(token: string): ChatSocket {
  return io(API_URL, {
    auth: {
      token,
    },
  });
}

