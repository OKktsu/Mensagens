import { useState, useEffect, useRef, useCallback } from "react";
import type {
  ChatSocket,
  GroupCallJoinedPayload,
  GroupCallUserJoinedPayload,
  GroupCallSignalPayload,
  GroupCallUserLeftPayload,
  GroupCallStatusPayload,
} from "../services/socket";
import { createCallLog } from "../services/api";
import { playEndCallTone } from "../utils/sound-effects";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function describeMediaError(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Não foi possível acessar os dispositivos de áudio ou vídeo.";
  }
  if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
    return "Permissão de microfone ou câmera negada. Clique no ícone de cadeado na barra de endereços para permitir o acesso.";
  }
  if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
    return "Nenhum microfone ou câmera foi encontrado no seu computador.";
  }
  if (err.name === "NotReadableError" || err.name === "TrackStartError") {
    return "A câmera ou o microfone já está em uso por outro aplicativo (ex: Discord, Zoom ou outra aba).";
  }
  return err.message || "Não foi possível acessar seus dispositivos de áudio/vídeo.";
}

export type RemoteGroupParticipant = {
  userId: string;
  userName: string;
  stream: MediaStream | null;
  isMuted?: boolean;
  isVideoOff?: boolean;
};

export type GroupCallBannerInfo = {
  isActive: boolean;
  callType: "audio" | "video";
  participantCount: number;
  initiatorName: string;
};

export function useGroupWebRTCCall(
  socket: ChatSocket | null,
  token: string | null = null,
  currentUserId?: string,
  onCallLogged?: () => void,
) {
  const [isInGroupCall, setIsInGroupCall] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [callType, setCallType] = useState<"audio" | "video">("video");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteGroupParticipant[]>([]);
  const [groupCallBanners, setGroupCallBanners] = useState<Record<string, GroupCallBannerInfo>>({});

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const durationTimerRef = useRef<number | null>(null);
  const durationCountRef = useRef<number>(0);
  const callStartTimeRef = useRef<Date | null>(null);
  const onCallLoggedRef = useRef(onCallLogged);
  onCallLoggedRef.current = onCallLogged;

  // Timer de duração da chamada em grupo
  useEffect(() => {
    if (isInGroupCall) {
      setCallDuration(0);
      durationCountRef.current = 0;
      durationTimerRef.current = window.setInterval(() => {
        durationCountRef.current += 1;
        setCallDuration(durationCountRef.current);
      }, 1000);
    } else {
      if (durationTimerRef.current !== null) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }

    return () => {
      if (durationTimerRef.current !== null) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [isInGroupCall]);

  // Limpeza de streams e conexões WebRTC Mesh
  const cleanupGroupCall = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    for (const [, pc] of peersRef.current) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
    }
    peersRef.current.clear();
    pendingCandidatesRef.current.clear();

    setIsInGroupCall(false);
    setActiveConversationId(null);
    setLocalStream(null);
    setRemoteParticipants([]);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setIsDeafened(false);
    durationCountRef.current = 0;
    callStartTimeRef.current = null;
  }, []);

  // Criação de PeerConnection para um participante da malha (Mesh)
  const createPeerConnection = useCallback(
    (targetUserId: string, targetUserName: string, convId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("group-call:signal", {
            conversationId: convId,
            toUserId: targetUserId,
            signal: {
              type: "candidate",
              candidate: event.candidate.toJSON(),
            },
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          const stream = event.streams[0];
          setRemoteParticipants((prev) => {
            const index = prev.findIndex((p) => p.userId === targetUserId);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = { ...updated[index], stream };
              return updated;
            }
            return [...prev, { userId: targetUserId, userName: targetUserName, stream }];
          });
        }
      };

      peersRef.current.set(targetUserId, pc);
      return pc;
    },
    [socket],
  );

    // Iniciar ou entrar em uma chamada de grupo
  const joinGroupCall = useCallback(
    async (conversationId: string, type: "audio" | "video" = "video") => {
      if (!socket) return;

      try {
        setCallError("");
        cleanupGroupCall();
        callStartTimeRef.current = new Date();

        // 1. ABRE A TELA DE CHAMADA EM GRUPO INSTANTANEAMENTE
        setActiveConversationId(conversationId);
        setCallType(type);
        setIsInGroupCall(true);

        let stream: MediaStream | null = null;
        let isVidActive = false;

        const baseAudio: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

        if (type === "video") {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: baseAudio,
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            isVidActive = true;
          } catch {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: baseAudio, video: true });
              isVidActive = true;
            } catch {
              stream = await navigator.mediaDevices.getUserMedia({ audio: baseAudio });
              isVidActive = false;
            }
          }
        } else {
          stream = await navigator.mediaDevices.getUserMedia({ audio: baseAudio });
          isVidActive = false;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsVideoOff(!isVidActive);

        socket.emit("group-call:join", {
          conversationId,
          callType: type,
        });
      } catch (err) {
        console.error("Erro ao obter mídia para chamada em grupo:", err);
        setCallError(describeMediaError(err));
        cleanupGroupCall();
      }
    },
    [socket, cleanupGroupCall],
  );

  // Sair da chamada de grupo
  const leaveGroupCall = useCallback(() => {
    if (socket && activeConversationId) {
      socket.emit("group-call:leave", { conversationId: activeConversationId });

      if (token && currentUserId) {
        createCallLog(token, {
          receiverId: currentUserId,
          conversationId: activeConversationId,
          type: callType,
          status: "completed",
          duration: durationCountRef.current,
          startedAt: callStartTimeRef.current?.toISOString(),
          endedAt: new Date().toISOString(),
        })
          .then(() => onCallLoggedRef.current?.())
          .catch(() => {});
      }
    }

    playEndCallTone();
    cleanupGroupCall();
  }, [socket, activeConversationId, token, currentUserId, callType, cleanupGroupCall]);

  // Alternar microfone
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Alternar Deafen
  const toggleDeafen = useCallback(() => {
    setIsDeafened((prev) => !prev);
  }, []);

  // Alternar câmera
  const toggleVideo = useCallback(async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      } else {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          const newVideoTrack = videoStream.getVideoTracks()[0];
          if (newVideoTrack) {
            localStreamRef.current.addTrack(newVideoTrack);
            for (const [, pc] of peersRef.current) {
              const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
              if (videoSender) {
                videoSender.replaceTrack(newVideoTrack);
              } else {
                pc.addTrack(newVideoTrack, localStreamRef.current);
              }
            }
            setIsVideoOff(false);
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          }
        } catch (camErr) {
          console.error("Não foi possível ligar a câmera:", camErr);
        }
      }
    }
  }, []);

  // Alternar tela
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      const localVideoTrack = localStreamRef.current?.getVideoTracks()[0] || null;
      for (const [, pc] of peersRef.current) {
        const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(localVideoTrack);
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) return;
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = displayStream;
        const screenVideoTrack = displayStream.getVideoTracks()[0];
        if (screenVideoTrack) {
          screenVideoTrack.onended = () => {
            if (screenStreamRef.current) {
              screenStreamRef.current.getTracks().forEach((track) => track.stop());
              screenStreamRef.current = null;
            }
            const localVideoTrack = localStreamRef.current?.getVideoTracks()[0] || null;
            for (const [, pc] of peersRef.current) {
              const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
              if (videoSender) {
                videoSender.replaceTrack(localVideoTrack);
              }
            }
            setIsScreenSharing(false);
          };

          for (const [, pc] of peersRef.current) {
            const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
            if (videoSender) {
              videoSender.replaceTrack(screenVideoTrack);
            } else {
              pc.addTrack(screenVideoTrack, displayStream);
            }
          }
          setIsScreenSharing(true);
        }
      } catch (screenErr) {
        console.warn("Falha no compartilhamento de tela:", screenErr);
      }
    }
  }, [isScreenSharing]);

  // Processa candidatos ICE pendentes
  const drainPendingCandidates = async (userId: string, pc: RTCPeerConnection) => {
    const queue = pendingCandidatesRef.current.get(userId) || [];
    while (queue.length > 0) {
      const candidate = queue.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // Ignora
        }
      }
    }
  };

  // Listeners de sinalização Socket.IO para chamadas em grupo
  useEffect(() => {
    if (!socket) return;

    const handleJoined = async (payload: GroupCallJoinedPayload) => {
      const { conversationId, participants } = payload;

      setRemoteParticipants(
        participants.map((p) => ({ userId: p.userId, userName: p.userName, stream: null })),
      );

      for (const p of participants) {
        const pc = createPeerConnection(p.userId, p.userName, conversationId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("group-call:signal", {
          conversationId,
          toUserId: p.userId,
          signal: { type: "offer", offer },
        });
      }
    };

    const handleUserJoined = (payload: GroupCallUserJoinedPayload) => {
      setRemoteParticipants((prev) => {
        if (prev.some((p) => p.userId === payload.userId)) return prev;
        return [...prev, { userId: payload.userId, userName: payload.userName, stream: null }];
      });
    };

    const handleSignal = async (payload: GroupCallSignalPayload) => {
      const { fromUserId, fromUserName, conversationId, signal } = payload;

      if (signal.type === "offer") {
        let pc = peersRef.current.get(fromUserId);
        if (!pc) {
          pc = createPeerConnection(fromUserId, fromUserName, conversationId);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        await drainPendingCandidates(fromUserId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("group-call:signal", {
          conversationId,
          toUserId: fromUserId,
          signal: { type: "answer", answer },
        });
      } else if (signal.type === "answer") {
        const pc = peersRef.current.get(fromUserId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
          await drainPendingCandidates(fromUserId, pc);
        }
      } else if (signal.type === "candidate") {
        const pc = peersRef.current.get(fromUserId);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch {
            // Ignora
          }
        } else {
          if (!pendingCandidatesRef.current.has(fromUserId)) {
            pendingCandidatesRef.current.set(fromUserId, []);
          }
          pendingCandidatesRef.current.get(fromUserId)!.push(signal.candidate);
        }
      }
    };

    const handleUserLeft = (payload: GroupCallUserLeftPayload) => {
      const pc = peersRef.current.get(payload.userId);
      if (pc) {
        pc.close();
        peersRef.current.delete(payload.userId);
      }
      setRemoteParticipants((prev) => prev.filter((p) => p.userId !== payload.userId));
    };

    const handleStatus = (payload: GroupCallStatusPayload) => {
      setGroupCallBanners((prev) => ({
        ...prev,
        [payload.conversationId]: {
          isActive: payload.isActive,
          callType: payload.callType ?? "video",
          participantCount: payload.participantCount,
          initiatorName: payload.initiatorName ?? "Alguém",
        },
      }));
    };

    socket.on("group-call:joined", handleJoined);
    socket.on("group-call:user-joined", handleUserJoined);
    socket.on("group-call:signal", handleSignal);
    socket.on("group-call:user-left", handleUserLeft);
    socket.on("group-call:status", handleStatus);

    return () => {
      socket.off("group-call:joined", handleJoined);
      socket.off("group-call:user-joined", handleUserJoined);
      socket.off("group-call:signal", handleSignal);
      socket.off("group-call:user-left", handleUserLeft);
      socket.off("group-call:status", handleStatus);
    };
  }, [socket, createPeerConnection]);

  return {
    isInGroupCall,
    activeConversationId,
    callType,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isDeafened,
    callDuration,
    callError,
    localStream,
    remoteParticipants,
    groupCallBanners,
    joinGroupCall,
    leaveGroupCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleDeafen,
  };
}
