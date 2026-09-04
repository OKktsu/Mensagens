// Gerenciador de Efeitos Sonoros Nativos via Web Audio API

let audioCtx: AudioContext | null = null;
let outgoingInterval: number | null = null;
let incomingInterval: number | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Som de discagem (chamando o contato): "tuuu... tuuu..."
export function startOutgoingRingtone() {
  stopOutgoingRingtone();
  stopIncomingRingtone();

  const playTone = () => {
    try {
      const ctx = getAudioContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 440; // Hz
      osc2.frequency.value = 480; // Hz
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.6);
      osc2.stop(ctx.currentTime + 1.6);
    } catch {
      // Ignora erro se áudio ainda não foi desbloqueado pelo usuário
    }
  };

  playTone();
  outgoingInterval = window.setInterval(playTone, 3500);
}

export function stopOutgoingRingtone() {
  if (outgoingInterval !== null) {
    clearInterval(outgoingInterval);
    outgoingInterval = null;
  }
}

// Som de chamada recebida (tocando no celular): "trim... trim..."
export function startIncomingRingtone() {
  stopIncomingRingtone();
  stopOutgoingRingtone();

  const playChime = () => {
    try {
      const ctx = getAudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // Dó, Mi, Sol, Dó (C5, E5, G5, C6)

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + index * 0.12;

        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch {
      // Ignora erro
    }
  };

  playChime();
  incomingInterval = window.setInterval(playChime, 2500);
}

export function stopIncomingRingtone() {
  if (incomingInterval !== null) {
    clearInterval(incomingInterval);
    incomingInterval = null;
  }
}

// Som de chamada encerrada
export function playEndCallTone() {
  stopOutgoingRingtone();
  stopIncomingRingtone();

  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignora erro
  }
}
