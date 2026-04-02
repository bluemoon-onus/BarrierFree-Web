export interface SpeakOptions {
  priority?: 'high' | 'normal';
  /** Override voice for this call (default: configured voice preference) */
  voice?: string;
  /** Override model for this call (default: configured model preference) */
  model?: string;
}

export interface VoicePreferences {
  voice: string;
  model: string;
}

export const TTS_STATE_EVENT = 'barrierfree-web:tts-state-change';
export const TTS_BLOCKED_EVENT = 'barrierfree-web:tts-blocked';

const DEFAULT_PREFERENCES: VoicePreferences = { voice: 'nova', model: 'tts-1' };

let prefs: VoicePreferences = { ...DEFAULT_PREFERENCES };

// In-memory cache: short phrases like "Next." "Paused." are reused constantly.
// Only texts under 200 chars are cached to avoid large book-sentence blobs piling up.
const blobCache = new Map<string, Blob>();

let currentAudio: HTMLAudioElement | null = null;
let currentAbort: AbortController | null = null;
let pendingResolve: (() => void) | null = null;

function emit(eventName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}

function cancelCurrent() {
  currentAbort?.abort();
  currentAbort = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (pendingResolve) {
    pendingResolve();
    pendingResolve = null;
  }
  emit(TTS_STATE_EVENT);
}

async function fetchAudioBlob(
  text: string,
  voice: string,
  model: string,
  signal: AbortSignal,
): Promise<Blob> {
  const cacheKey = `${voice}|${model}|${text}`;
  const cached = blobCache.get(cacheKey);
  if (cached) return cached;

  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, model }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`TTS API ${response.status}`);
  }

  const blob = await response.blob();

  // Cache only short texts (UI cues) — long book sentences would bloat memory
  if (text.length < 200) {
    blobCache.set(cacheKey, blob);
  }

  return blob;
}

export async function speak(text: string, options: SpeakOptions = {}) {
  if (typeof window === 'undefined') return;
  const normalizedText = text.trim();
  if (!normalizedText) return;

  if (options.priority === 'high') {
    cancelCurrent();
  }

  const controller = new AbortController();
  currentAbort = controller;
  emit(TTS_STATE_EVENT);

  const voice = options.voice ?? prefs.voice;
  const model = options.model ?? prefs.model;

  try {
    const blob = await fetchAudioBlob(normalizedText, voice, model, controller.signal);

    if (controller.signal.aborted) return;

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    emit(TTS_STATE_EVENT);

    await new Promise<void>((resolve) => {
      pendingResolve = resolve;

      const done = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        if (pendingResolve === resolve) pendingResolve = null;
        emit(TTS_STATE_EVENT);
        resolve();
      };

      audio.onended = done;
      audio.onerror = done;

      audio.play().catch((err: Error) => {
        if (err.name === 'NotAllowedError') {
          // Browser blocked autoplay — notify WELCOME screen to retry on interaction
          emit(TTS_BLOCKED_EVENT);
        }
        done();
      });
    });
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      console.error('[TTS]', err.message);
    }
  } finally {
    if (currentAbort === controller) currentAbort = null;
    emit(TTS_STATE_EVENT);
  }
}

export function stopSpeaking() {
  cancelCurrent();
}

export function pauseSpeaking() {
  currentAudio?.pause();
  emit(TTS_STATE_EVENT);
}

export function resumeSpeaking() {
  void currentAudio?.play().catch(() => {});
  emit(TTS_STATE_EVENT);
}

export function isSpeaking() {
  return !!currentAudio && !currentAudio.paused && !currentAudio.ended;
}

export function setVoicePreferences(newPrefs: Partial<VoicePreferences>) {
  prefs = { ...prefs, ...newPrefs };
}

export function getVoicePreferences(): VoicePreferences {
  return { ...prefs };
}

// Legacy stubs kept for compatibility — no-op with OpenAI TTS
export async function initTTS() {}
export function getAvailableVoices() { return []; }
export function getEnglishVoice() { return null; }
