let audioCtx: AudioContext | null = null;
let alarmInterval: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'square', volume = 0.35) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Envelope: quick attack, sustain, quick release
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
  gain.gain.setValueAtTime(volume, ctx.currentTime + duration - 0.05);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/**
 * Plays a short urgent siren sound (alternating tones).
 * Repeats `cycles` times. Total duration ~2.5s for 5 cycles.
 */
export function playAlarmSound(cycles = 5): void {
  if (typeof window === 'undefined') return;
  try {
    let i = 0;
    const play = () => {
      if (i >= cycles) return;
      const highFreq = 880;
      const lowFreq = 580;
      const freq = i % 2 === 0 ? highFreq : lowFreq;
      playTone(freq, 0.22, 'square', 0.3);
      setTimeout(() => playTone(freq * 1.5, 0.18, 'sawtooth', 0.15), 50);
      i++;
      setTimeout(play, 280);
    };
    play();
  } catch {
    // Audio not available — silent fallback
  }
}

/**
 * Plays a continuous alarm that repeats until stopAlarm() is called.
 */
export function startContinuousAlarm(): void {
  if (typeof window === 'undefined') return;
  stopAlarm();
  playAlarmSound(5);
  alarmInterval = setInterval(() => playAlarmSound(5), 3000);
}

export function stopAlarm(): void {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}
