import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatSocket } from "../services/socket";
import {
  startOutgoingRingtone,
  stopOutgoingRingtone,
  startIncomingRingtone,
  stopIncomingRingtone,
  playEndCallTone,
} from "../utils/sound-effects";

export type CallState = "idle" | "calling" | "incoming" | "connected";

type ActivePeer = {
  userId: string;
  userName: string;
  conversationId: string;
};

type IncomingCallData = {
  fromUserId: string;
  fromUserName: string;
  conversationId: string;
  offer: RTCSessionDescriptionInit;
};

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTCCall(socket: ChatSocket | null) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [activePeer, setActivePeer] = useState<ActivePeer | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState("");

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const durationTimerRef = useRef<number | null>(null);

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
      durationTimerRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
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

  // Limpeza de streams e conexões WebRTC
  const cleanupCall = useCallback(() => {
    stopOutgoingRingtone();
    stopIncomingRingtone();

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
    setCallState("idle");
    setActivePeer(null);
    setIncomingCall(null);
    setIsMuted(false);
  }, []);

  // Iniciar chamada de áudio (Outgoing)
  const startCall = useCallback(
    async (targetUserId: string, targetUserName: string, conversationId: string) => {
      if (!socket) return;
      try {
        setCallError("");
        cleanupCall();

        // 1. Obtém acesso ao microfone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        localStreamRef.current = stream;

        // 2. Cria PeerConnection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        // Adiciona faixas de áudio locais
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Envia candidatos ICE
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("call:ice-candidate", {
              toUserId: targetUserId,
              candidate: event.candidate.toJSON(),
            });
          }
        };

        // Recebe áudio remoto
        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(() => {});
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

        // 3. Cria Oferta SDP
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // 4. Envia para o outro usuário via Socket
        socket.emit("call:invite", {
          toUserId: targetUserId,
          conversationId,
          offer,
        });

        setActivePeer({
          userId: targetUserId,
          userName: targetUserName,
          conversationId,
        });
        setCallState("calling");
        startOutgoingRingtone();
      } catch (err) {
        setCallError(
          err instanceof Error && err.name === "NotAllowedError"
            ? "Permissão de microfone negada no navegador."
            : "Não foi possível iniciar a chamada.",
        );
        cleanupCall();
      }
    },
    [socket, cleanupCall],
  );

  // Aceitar chamada recebida (Incoming)
  const acceptCall = useCallback(async () => {
    if (!socket || !incomingCall) return;

    try {
      setCallError("");
      stopIncomingRingtone();

      const { fromUserId, fromUserName, conversationId, offer } = incomingCall;

      // 1. Obtém acesso ao microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;

      // 2. Cria PeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:ice-candidate", {
            toUserId: fromUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
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

      // 3. Define descrição remota (Oferta)
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Aplica candidatos ICE que chegaram antes
      while (iceCandidatesQueueRef.current.length > 0) {
        const candidate = iceCandidatesQueueRef.current.shift();
        if (candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }

      // 4. Cria e envia Resposta (Answer)
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
      });
      setIncomingCall(null);
      setCallState("connected");
    } catch (err) {
      setCallError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Permissão de microfone negada."
          : "Não foi possível atender a chamada.",
      );
      cleanupCall();
    }
  }, [socket, incomingCall, cleanupCall]);

  // Recusar chamada recebida
  const rejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;

    socket.emit("call:reject", {
      toUserId: incomingCall.fromUserId,
      conversationId: incomingCall.conversationId,
    });

    playEndCallTone();
    cleanupCall();
  }, [socket, incomingCall, cleanupCall]);

  // Encerrar chamada ativa
  const endCall = useCallback(() => {
    if (socket && activePeer) {
      socket.emit("call:end", {
        toUserId: activePeer.userId,
        conversationId: activePeer.conversationId,
      });
    }

    playEndCallTone();
    cleanupCall();
  }, [socket, activePeer, cleanupCall]);

  // Alternar mudo do microfone
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Listeners dos eventos de sinalização do Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (payload: IncomingCallData) => {
      // Se já estiver em uma chamada, rejeita automaticamente
      if (callState !== "idle") {
        socket.emit("call:reject", {
          toUserId: payload.fromUserId,
          conversationId: payload.conversationId,
        });
        return;
      }

      setIncomingCall(payload);
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
          // Ignora erro de candidato isolado
        }
      } else {
        iceCandidatesQueueRef.current.push(payload.candidate);
      }
    };

    const handleRejected = () => {
      stopOutgoingRingtone();
      playEndCallTone();
      setCallError("Chamada recusada.");
      cleanupCall();
    };

    const handleEnded = () => {
      stopOutgoingRingtone();
      stopIncomingRingtone();
      playEndCallTone();
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
  }, [socket, callState, cleanupCall]);

  return {
    callState,
    activePeer,
    incomingCall,
    isMuted,
    callDuration,
    callError,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };
}
