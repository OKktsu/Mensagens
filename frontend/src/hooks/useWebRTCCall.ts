import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatSocket, CallIncomingPayload } from "../services/socket";
import { createCallLog } from "../services/api";
import {
  startOutgoingRingtone,
  stopOutgoingRingtone,
  startIncomingRingtone,
  stopIncomingRingtone,
  playEndCallTone,
} from "../utils/sound-effects";

export type CallState = "idle" | "calling" | "incoming" | "connected";
export type CallType = "audio" | "video";

type ActivePeer = {
  userId: string;
  userName: string;
  conversationId: string;
  callType: CallType;
};

type IncomingCallData = {
  fromUserId: string;
  fromUserName: string;
  conversationId: string;
  offer: RTCSessionDescriptionInit;
  callType: CallType;
};

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
  if (err.name === "OverconstrainedError") {
    return "A configuração de câmera solicitada não é suportada pelo seu dispositivo.";
  }
  if (err.name === "SecurityError") {
    return "Acesso à mídia bloqueado por políticas de segurança do navegador (requer HTTPS ou localhost).";
  }
  return err.message || "Não foi possível iniciar os dispositivos de mídia.";
}

function createSilentAudioStream(): MediaStream {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return new MediaStream();
    }
    const ctx = new AudioCtx();
    const dst = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(dst);
    osc.start();
    return dst.stream;
  } catch {
    return new MediaStream();
  }
}

async function safeAcquireMediaStream(callType: CallType): Promise<{
  stream: MediaStream;
  isVideoActive: boolean;
  warning?: string;
}> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      throw new Error("O navegador exige conexão segura (HTTPS ou localhost) para acessar câmera e microfone.");
    }
    throw new Error("Seu navegador não suporta captura de áudio/vídeo WebRTC.");
  }

  const baseAudioConstraint: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  if (callType === "video") {
    // 1. Tenta áudio + vídeo com resolução padrão
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: baseAudioConstraint,
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      return { stream, isVideoActive: true };
    } catch (idealErr: any) {
      console.warn("Falha ao obter vídeo com resolução ideal, tentando vídeo básico:", idealErr);
      // 2. Tenta áudio + vídeo básico sem restrições de resolução
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: baseAudioConstraint,
          video: true,
        });
        return { stream, isVideoActive: true };
      } catch (basicErr: any) {
        console.warn("Falha ao obter vídeo, tentando fallback para apenas áudio:", basicErr);
        // 3. Fallback: se câmera não existe ou falhou, tenta pelo menos áudio
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: baseAudioConstraint,
          });
          return {
            stream: audioStream,
            isVideoActive: false,
            warning: "Câmera não detectada ou ocupada. A chamada foi iniciada apenas com áudio.",
          };
        } catch (audioErr: any) {
          if (audioErr?.name === "NotFoundError" || audioErr?.name === "DevicesNotFoundError") {
            try {
              const silentStream = createSilentAudioStream();
              return {
                stream: silentStream,
                isVideoActive: false,
                warning: "Nenhum microfone ou câmera detectado. Você poderá ouvir e participar da chamada.",
              };
            } catch {
              // fallback failed
            }
          }
          throw new Error(describeMediaError(basicErr || idealErr || audioErr));
        }
      }
    }
  }

  // Apenas áudio
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: baseAudioConstraint,
    });
    return { stream, isVideoActive: false };
  } catch (err: any) {
    if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
      try {
        const silentStream = createSilentAudioStream();
        return {
          stream: silentStream,
          isVideoActive: false,
          warning: "Nenhum microfone detectado. Você poderá ouvir a chamada.",
        };
      } catch {
        // fallback failed
      }
    }
    throw new Error(describeMediaError(err));
  }
}


export function useWebRTCCall(
  socket: ChatSocket | null,
  token: string | null = null,
  onCallLogged?: () => void,
) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [activePeer, setActivePeer] = useState<ActivePeer | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const durationTimerRef = useRef<number | null>(null);
  const durationCountRef = useRef<number>(0);
  const callStartTimeRef = useRef<Date | null>(null);
  const onCallLoggedRef = useRef(onCallLogged);
  onCallLoggedRef.current = onCallLogged;

  // Inicializa o elemento de áudio remoto
  useEffect(() => {
    if (!remoteAudioRef.current) {
      const audio = new Audio();
      audio.autoplay = true;
      remoteAudioRef.current = audio;
    }
  }, []);

  // Timer da chamada conectada
  useEffect(() => {
    if (callState === "connected") {
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
  }, [callState]);

  // Salvar registro de chamada no banco
  const recordCallToDatabase = useCallback(
    (
      peer: { userId: string; conversationId?: string; callType: CallType },
      status: "completed" | "missed" | "rejected",
    ) => {
      if (!token) return;

      const duration = status === "completed" ? durationCountRef.current : 0;
      const startedAt = callStartTimeRef.current ? callStartTimeRef.current.toISOString() : new Date().toISOString();
      const endedAt = new Date().toISOString();

      createCallLog(token, {
        receiverId: peer.userId,
        conversationId: peer.conversationId,
        type: peer.callType,
        status,
        duration,
        startedAt,
        endedAt,
      })
        .then(() => onCallLoggedRef.current?.())
        .catch(() => {});
    },
    [token],
  );

  // Limpeza de streams e conexões WebRTC
  const cleanupCall = useCallback(() => {
    stopOutgoingRingtone();
    stopIncomingRingtone();

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    iceCandidatesQueueRef.current = [];
    durationCountRef.current = 0;
    callStartTimeRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setActivePeer(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setIsDeafened(false);
  }, []);

    // Iniciar chamada (Voz ou Vídeo)
  const startCall = useCallback(
    async (
      targetUserId: string,
      targetUserName: string,
      conversationId: string,
      callType: CallType = "audio",
    ) => {
      if (!socket) return;
      try {
        setCallError("");
        cleanupCall();

        callStartTimeRef.current = new Date();

        // 1. ABRE A TELA DE CHAMADA INSTANTANEAMENTE
        setActivePeer({
          userId: targetUserId,
          userName: targetUserName,
          conversationId,
          callType,
        });
        setCallState("calling");
        startOutgoingRingtone();

        // 2. Obtem media stream
        const { stream, isVideoActive, warning } = await safeAcquireMediaStream(callType);
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsVideoOff(!isVideoActive);

        if (warning) {
          console.warn(warning);
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Garante suporte bidirecional de vídeo para compartilhamento de tela mesmo em chamadas iniciadas em áudio
        if (stream.getVideoTracks().length === 0) {
          pc.addTransceiver("video", { direction: "sendrecv" });
        }

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("call:ice-candidate", {
              toUserId: targetUserId,
              candidate: event.candidate.toJSON(),
            });
          }
        };

        pc.ontrack = (event) => {
          if (event.streams[0]) {
            setRemoteStream(event.streams[0]);
            if (remoteAudioRef.current && callType === "audio") {
              remoteAudioRef.current.srcObject = event.streams[0];
              remoteAudioRef.current.play().catch(() => {});
            }
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            stopOutgoingRingtone();
            setCallState("connected");
          } else if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "failed" ||
            pc.connectionState === "closed"
          ) {
            playEndCallTone();
            cleanupCall();
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call:invite", {
          toUserId: targetUserId,
          conversationId,
          offer,
          callType,
        });
      } catch (err) {
        console.error("Erro ao iniciar chamada:", err);
        stopOutgoingRingtone();
        setCallError(err instanceof Error ? err.message : describeMediaError(err));
      }
    },
    [socket, cleanupCall],
  );

  // Aceitar chamada recebida (Voz ou Vídeo)
  const acceptCall = useCallback(async () => {
    if (!socket || !incomingCall) return;

    try {
      setCallError("");
      stopIncomingRingtone();

      const { fromUserId, fromUserName, conversationId, offer, callType } = incomingCall;

      const { stream, isVideoActive, warning } = await safeAcquireMediaStream(callType);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoOff(!isVideoActive);

      if (warning) {
        console.warn(warning);
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Garante transceptor de vídeo caso a chamada tenha sido aceita em áudio
      if (stream.getVideoTracks().length === 0) {
        const hasVideo = pc.getTransceivers().some((t) => t.receiver?.track?.kind === "video");
        if (!hasVideo) {
          pc.addTransceiver("video", { direction: "sendrecv" });
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:ice-candidate", {
            toUserId: fromUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteAudioRef.current && callType === "audio") {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(() => {});
          }
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallState("connected");
        } else if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          playEndCallTone();
          cleanupCall();
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      while (iceCandidatesQueueRef.current.length > 0) {
        const candidate = iceCandidatesQueueRef.current.shift();
        if (candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call:answer", {
        toUserId: fromUserId,
        conversationId,
        answer,
      });

      setActivePeer({
        userId: fromUserId,
        userName: fromUserName,
        conversationId,
        callType,
      });
      setIncomingCall(null);
      setCallState("connected");
    } catch (err) {
      console.error("Erro ao atender chamada:", err);
      setCallError(err instanceof Error ? err.message : describeMediaError(err));
      if (incomingCall) {
        setActivePeer({
          userId: incomingCall.fromUserId,
          userName: incomingCall.fromUserName,
          conversationId: incomingCall.conversationId,
          callType: incomingCall.callType,
        });
        setCallState("connected");
        setIncomingCall(null);
      }
    }
  }, [socket, incomingCall, cleanupCall]);

  // Recusar chamada recebida
  const rejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;

    socket.emit("call:reject", {
      toUserId: incomingCall.fromUserId,
      conversationId: incomingCall.conversationId,
    });

    recordCallToDatabase(
      {
        userId: incomingCall.fromUserId,
        conversationId: incomingCall.conversationId,
        callType: incomingCall.callType,
      },
      "rejected",
    );

    playEndCallTone();
    cleanupCall();
  }, [socket, incomingCall, recordCallToDatabase, cleanupCall]);

  // Encerrar chamada ativa
  const endCall = useCallback(() => {
    if (activePeer) {
      if (socket) {
        socket.emit("call:end", {
          toUserId: activePeer.userId,
          conversationId: activePeer.conversationId,
        });
      }

      const status = callState === "connected" ? "completed" : "missed";
      recordCallToDatabase(activePeer, status);
    }

    playEndCallTone();
    cleanupCall();
  }, [socket, activePeer, callState, recordCallToDatabase, cleanupCall]);

  // Alternar mudo do microfone
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        return;
      }
    }
    setIsMuted((prev) => !prev);
  }, []);

  // Alternar desativar áudio (Deafen)
  const toggleDeafen = useCallback(() => {
    setIsDeafened((prev) => {
      const next = !prev;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  // Alternar câmera
  const toggleVideo = useCallback(async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        return;
      } else {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          const newVideoTrack = videoStream.getVideoTracks()[0];
          if (newVideoTrack) {
            localStreamRef.current.addTrack(newVideoTrack);
            const pc = peerConnectionRef.current;
            if (pc) {
              const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
              if (videoSender) {
                await videoSender.replaceTrack(newVideoTrack);
              } else {
                pc.addTrack(newVideoTrack, localStreamRef.current);
              }
            }
            setIsVideoOff(false);
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            return;
          }
        } catch (camErr) {
          console.error("Não foi possível ligar a câmera:", camErr);
          setCallError("Não foi possível acessar a câmera.");
        }
      }
    }
    setIsVideoOff((prev) => !prev);
  }, []);

  // Alternar Compartilhamento de Tela
  const toggleScreenShare = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      setIsScreenSharing((prev) => !prev);
      return;
    }

    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === "video" || s.track === null);
      const localVideoTrack = localStreamRef.current?.getVideoTracks()[0] || null;
      if (videoSender) {
        await videoSender.replaceTrack(localVideoTrack);
      }
      setLocalStream(localStreamRef.current);
      setIsScreenSharing(false);
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          setCallError("Compartilhamento de tela não suportado neste navegador.");
          return;
        }
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = displayStream;
        setLocalStream(displayStream);

        const screenVideoTrack = displayStream.getVideoTracks()[0];
        if (screenVideoTrack) {
          screenVideoTrack.onended = () => {
            if (screenStreamRef.current) {
              screenStreamRef.current.getTracks().forEach((track) => track.stop());
              screenStreamRef.current = null;
            }
            const sender = pc.getSenders().find((s) => (s.track && s.track.kind === "video") || s.track === null);
            const fallbackVideoTrack = localStreamRef.current?.getVideoTracks()[0] || null;
            if (sender) {
              sender.replaceTrack(fallbackVideoTrack).catch(() => {});
            }
            setLocalStream(localStreamRef.current);
            setIsScreenSharing(false);
          };

          const videoSender = pc.getSenders().find((s) => (s.track && s.track.kind === "video") || s.track === null);
          if (videoSender) {
            await videoSender.replaceTrack(screenVideoTrack);
          } else {
            const videoTransceiver = pc.getTransceivers().find(
              (t) => t.sender && (!t.sender.track || t.sender.track.kind === "video"),
            );
            if (videoTransceiver && videoTransceiver.sender) {
              await videoTransceiver.sender.replaceTrack(screenVideoTrack);
            } else {
              pc.addTrack(screenVideoTrack, displayStream);
            }
          }
          setIsScreenSharing(true);
        }
      } catch (screenErr) {
        console.warn("Compartilhamento de tela cancelado ou falhou:", screenErr);
      }
    }
  }, [isScreenSharing]);

  // Listeners dos eventos de sinalização do Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (payload: CallIncomingPayload) => {
      if (callState !== "idle") {
        socket.emit("call:reject", {
          toUserId: payload.fromUserId,
          conversationId: payload.conversationId,
        });
        return;
      }

      callStartTimeRef.current = new Date();
      setIncomingCall({
        fromUserId: payload.fromUserId,
        fromUserName: payload.fromUserName,
        conversationId: payload.conversationId,
        offer: payload.offer,
        callType: payload.callType ?? "audio",
      });
      setCallState("incoming");
      startIncomingRingtone();
    };

    const handleAnswered = async (payload: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
      stopOutgoingRingtone();
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
        setCallState("connected");
      }
    };

    const handleIceCandidate = async (payload: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch {
          // Ignora
        }
      } else {
        iceCandidatesQueueRef.current.push(payload.candidate);
      }
    };

    const handleRejected = () => {
      stopOutgoingRingtone();
      playEndCallTone();
      setCallError("Chamada recusada.");

      if (activePeer) {
        recordCallToDatabase(activePeer, "rejected");
      }

      cleanupCall();
    };

    const handleEnded = () => {
      stopOutgoingRingtone();
      stopIncomingRingtone();
      playEndCallTone();

      if (activePeer) {
        const status = callState === "connected" ? "completed" : "missed";
        recordCallToDatabase(activePeer, status);
      }

      cleanupCall();
    };

    socket.on("call:incoming", handleIncoming);
    socket.on("call:answered", handleAnswered);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:rejected", handleRejected);
    socket.on("call:ended", handleEnded);

    return () => {
      socket.off("call:incoming", handleIncoming);
      socket.off("call:answered", handleAnswered);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:rejected", handleRejected);
      socket.off("call:ended", handleEnded);
    };
  }, [socket, callState, activePeer, recordCallToDatabase, cleanupCall]);

  return {
    callState,
    callType: activePeer?.callType ?? incomingCall?.callType ?? "audio",
    activePeer,
    incomingCall,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isDeafened,
    callDuration,
    callError,
    localStream,
    remoteStream,
    screenStream: screenStreamRef.current,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleDeafen,
  };
}
