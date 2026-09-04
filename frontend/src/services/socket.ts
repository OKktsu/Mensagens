import { io, Socket } from "socket.io-client";

import type { Message } from "./api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

export type TypingPayload = {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
};

export type UserStatusPayload = {
  userId: string;
  isOnline: boolean;
};

export type ConversationReadPayload = {
  conversationId: string;
  userId: string;
  readAt: string;
};

export type CallIncomingPayload = {
  fromUserId: string;
  fromUserName: string;
  conversationId: string;
  offer: RTCSessionDescriptionInit;
  callType?: "audio" | "video";
};

export type CallAnsweredPayload = {
  fromUserId: string;
  conversationId: string;
  answer: RTCSessionDescriptionInit;
};

export type CallIceCandidatePayload = {
  fromUserId: string;
  candidate: RTCIceCandidateInit;
};

export type CallRejectedPayload = {
  fromUserId: string;
  conversationId?: string;
};

export type CallEndedPayload = {
  fromUserId: string;
  conversationId?: string;
};

type ServerToClientEvents = {
  "connection:ready": (payload: { socketId: string; userId?: string; onlineUserIds?: string[] }) => void;
  "message:new": (message: Message) => void;
  "user:typing": (payload: TypingPayload) => void;
  "user:status": (payload: UserStatusPayload) => void;
  "conversation:read": (payload: ConversationReadPayload) => void;
  "call:incoming": (payload: CallIncomingPayload) => void;
  "call:answered": (payload: CallAnsweredPayload) => void;
  "call:ice-candidate": (payload: CallIceCandidatePayload) => void;
  "call:rejected": (payload: CallRejectedPayload) => void;
  "call:ended": (payload: CallEndedPayload) => void;
};

type ClientToServerEvents = {
  "conversation:join": (conversationId: string, callback?: (response: { ok: boolean }) => void) => void;
  "conversation:leave": (conversationId: string) => void;
  "typing:start": (payload: { conversationId: string }) => void;
  "typing:stop": (payload: { conversationId: string }) => void;
  "call:invite": (payload: { toUserId: string; conversationId: string; offer: RTCSessionDescriptionInit; callType?: "audio" | "video" }) => void;
  "call:answer": (payload: { toUserId: string; conversationId: string; answer: RTCSessionDescriptionInit }) => void;
  "call:ice-candidate": (payload: { toUserId: string; candidate: RTCIceCandidateInit }) => void;
  "call:reject": (payload: { toUserId: string; conversationId?: string }) => void;
  "call:end": (payload: { toUserId: string; conversationId?: string }) => void;
};


export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;


export function createChatSocket(token: string): ChatSocket {
  return io(API_URL, {
    auth: {
      token,
    },
  });
}

