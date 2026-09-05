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

export type GroupCallJoinedPayload = {
  conversationId: string;
  callType: "audio" | "video";
  participants: Array<{ userId: string; userName: string }>;
};

export type GroupCallUserJoinedPayload = {
  conversationId: string;
  userId: string;
  userName: string;
  callType: "audio" | "video";
};

export type GroupCallSignalPayload = {
  conversationId: string;
  fromUserId: string;
  fromUserName: string;
  signal:
    | { type: "offer"; offer: RTCSessionDescriptionInit }
    | { type: "answer"; answer: RTCSessionDescriptionInit }
    | { type: "candidate"; candidate: RTCIceCandidateInit };
};

export type GroupCallUserLeftPayload = {
  conversationId: string;
  userId: string;
  userName: string;
};

export type GroupCallStatusPayload = {
  conversationId: string;
  isActive: boolean;
  callType?: "audio" | "video";
  initiatorName?: string;
  participantCount: number;
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
  "group-call:joined": (payload: GroupCallJoinedPayload) => void;
  "group-call:user-joined": (payload: GroupCallUserJoinedPayload) => void;
  "group-call:signal": (payload: GroupCallSignalPayload) => void;
  "group-call:user-left": (payload: GroupCallUserLeftPayload) => void;
  "group-call:status": (payload: GroupCallStatusPayload) => void;
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
  "group-call:join": (payload: { conversationId: string; callType?: "audio" | "video" }) => void;
  "group-call:signal": (payload: { conversationId: string; toUserId: string; signal: unknown }) => void;
  "group-call:leave": (payload: { conversationId: string }) => void;
  "group-call:get-status": (payload: { conversationId: string }, callback?: (status: { isActive: boolean; callType?: "audio" | "video"; initiatorName?: string; participantCount: number }) => void) => void;
};



export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;


export function createChatSocket(token: string): ChatSocket {
  return io(API_URL, {
    auth: {
      token,
    },
  });
}

