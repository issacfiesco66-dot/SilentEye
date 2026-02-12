/**
 * Alarm sound system that works on mobile browsers.
 *
 * Mobile browsers block AudioContext until a user gesture (tap/click).
 * Strategy:
 *  1. On first user interaction, unlock AudioContext by playing silent buffer.
 *  2. Also generate a WAV siren as data URI for HTML5 <audio> fallback.
 *  3. playAlarmSound() tries Web Audio API first, falls back to <audio>.
 */

let audioCtx: AudioContext | null = null;
let unlocked = false;
let listenersBound = false;

// ── Generate a WAV siren as base64 data URI (works without user gesture) ──

function generateSirenWav(): string {
  const sampleRate = 16000;
  const duration = 3; // seconds
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate alternating siren tones
  const highFreq = 880;
  const lowFreq = 580;
  const cycleLen = sampleRate * 0.4; // 0.4s per tone
  const volume = 0.7;

  for (let i = 0; i < numSamples; i++) {
    const cycle = Math.floor(i / cycleLen);
    const freq = cycle % 2 === 0 ? highFreq : lowFreq;
    const t = i / sampleRate;
    // Square-ish wave (clipped sine for more urgency)
    const raw = Math.sin(2 * Math.PI * freq * t);
    const shaped = Math.max(-1, Math.min(1, raw * 3)); // clip to make it harsher
    const sample = Math.round(shaped * volume * 32767);
    view.setInt16(44 + i * 2, sample, true);
  }

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

let sirenDataUri: string | null = null;

function getSirenUri(): string {
  if (!sirenDataUri) sirenDataUri = generateSirenWav();
  return sirenDataUri;
}

// ── AudioContext unlock on user gesture ──

function unlockAudio() {
  if (unlocked) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    // Play a silent buffer to unlock
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(0);
    unlocked = true;
  } catch {
    // ignore
  }
}

/**
 * Call this once to bind global touch/click listeners that unlock audio.
 * Safe to call multiple times — only binds once.
 */
export function initAudioOnInteraction(): void {
  if (typeof window === 'undefined' || listenersBound) return;
  listenersBound = true;
  const events = ['touchstart', 'touchend', 'click', 'keydown'];
  const handler = () => {
    unlockAudio();
    // Also pre-generate the siren URI
    getSirenUri();
    // Remove listeners after first interaction
    events.forEach((e) => document.removeEventListener(e, handler, true));
  };
  events.forEach((e) => document.addEventListener(e, handler, { capture: true, passive: true }));
}

// ── Play alarm ──

function playWithWebAudio(): boolean {
  if (!audioCtx || audioCtx.state === 'suspended') return false;
  try {
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const highFreq = 880;
    const lowFreq = 580;
    const toneLen = 0.35;
    const cycles = 8;

    for (let i = 0; i < cycles; i++) {
      const freq = i % 2 === 0 ? highFreq : lowFreq;
      const start = now + i * toneLen;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.5, start + 0.02);
      gain.gain.setValueAtTime(0.5, start + toneLen - 0.03);
      gain.gain.linearRampToValueAtTime(0, start + toneLen);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + toneLen);
    }
    return true;
  } catch {
    return false;
  }
}

function playWithHtmlAudio(): void {
  try {
    const audio = new Audio(getSirenUri());
    audio.volume = 1.0;
    audio.play().catch(() => {});
  } catch {
    // Truly no audio available
  }
}

/**
 * Play an alarm sound. Uses Web Audio API if unlocked, otherwise falls back to HTML5 Audio.
 */
export function playAlarmSound(): void {
  if (typeof window === 'undefined') return;
  // Try Web Audio first (better quality, already unlocked by user gesture)
  if (!playWithWebAudio()) {
    // Fallback to HTML5 Audio (may work if user has interacted with page)
    playWithHtmlAudio();
  }
}

let alarmInterval: ReturnType<typeof setInterval> | null = null;

export function startContinuousAlarm(): void {
  if (typeof window === 'undefined') return;
  stopAlarm();
  playAlarmSound();
  alarmInterval = setInterval(playAlarmSound, 3500);
}

export function stopAlarm(): void {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}
