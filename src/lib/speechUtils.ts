export interface SpeakOptions {
  priority?: 'high' | 'normal';
  voice?: string;
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

// ── Static manifest (pre-generated audio files in public/audio/) ─────────────
// Maps "voice|model|text" → "/audio/{sha1}.mp3"
let manifestPromise: Promise<Record<string, string>> | null = null;

function loadManifest(): Promise<Record<string, string>> {
  if (!manifestPromise) {
    manifestPromise = fetch('/audio/manifest.json')
      .then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : {}))
      .catch(() => ({} as Record<string, string>));
  }
  return manifestPromise;
}

// ── In-memory blob cache (current session) ───────────────────────────────────
// Short texts (UI phrases, book titles) are cached after first fetch.
const blobCache = new Map<string, Blob>();

// ── Playback state ───────────────────────────────────────────────────────────
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

/**
 * Resolve audio source for a given text.
 * Priority: blobCache → static manifest file → dynamic /api/tts fetch
 */
async function resolveAudio(
  text: string,
  voice: string,
  model: string,
  signal: AbortSignal,
): Promise<{ src: string; isBlob: boolean } | null> {
  const key = `${voice}|${model}|${text}`;

  // 1. In-memory blob cache (instant)
  const cachedBlob = blobCache.get(key);
  if (cachedBlob) {
    return { src: URL.createObjectURL(cachedBlob), isBlob: true };
  }

  // 2. Static manifest (pre-generated, CDN-served)
  const manifest = await loadManifest();
  if (signal.aborted) return null;
  const staticPath = manifest[key];
  if (staticPath) {
    return { src: staticPath, isBlob: false };
  }

  // 3. Dynamic API fetch (fallback for text not in manifest)
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, model }),
    signal,
  });
  if (!response.ok || signal.aborted) return null;

  const blob = await response.blob();
  if (signal.aborted) return null;

  // Cache short texts (UI cues, book titles) but not long book sentences
  if (text.length < 300) {
    blobCache.set(key, blob);
  }

  return { src: URL.createObjectURL(blob), isBlob: true };
}

// ── Public API ───────────────────────────────────────────────────────────────

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
    const resolved = await resolveAudio(normalizedText, voice, model, controller.signal);
    if (!resolved || controller.signal.aborted) return;

    const { src, isBlob } = resolved;
    const audio = new Audio(src);
    currentAudio = audio;
    emit(TTS_STATE_EVENT);

    await new Promise<void>((resolve) => {
      pendingResolve = resolve;

      const done = () => {
        window.clearTimeout(safetyTimer);
        if (isBlob) URL.revokeObjectURL(src);
        if (currentAudio === audio) currentAudio = null;
        if (pendingResolve === resolve) pendingResolve = null;
        emit(TTS_STATE_EVENT);
        resolve();
      };

      // Safety: if audio events never fire (e.g. corrupt MP3), resolve after 30s
      const safetyTimer = window.setTimeout(() => {
        console.warn('[TTS] audio timeout — forcing resolve');
        done();
      }, 30_000);

      audio.onended = done;
      audio.onerror = done;

      audio.play().catch((err: Error) => {
        if (err.name === 'NotAllowedError') {
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

/**
 * Pre-warm audio for a list of texts into the in-memory blob cache.
 * Call this when transitioning to a new screen so audio is instant when needed.
 */
export async function prewarm(texts: string[]): Promise<void> {
  if (typeof window === 'undefined') return;

  const voice = prefs.voice;
  const model = prefs.model;
  const manifest = await loadManifest();

  await Promise.allSettled(
    texts.map(async (rawText) => {
      const text = rawText.trim();
      if (!text) return;
      const key = `${voice}|${model}|${text}`;

      // Already in memory
      if (blobCache.has(key)) return;

      const staticPath = manifest[key];
      const url = staticPath ?? null;

      // Fetch from static file or API
      const fetchUrl = url
        ? url
        : `/api/tts`; // POST below

      try {
        const response = url
          ? await fetch(fetchUrl)
          : await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, voice, model }),
            });

        if (response.ok) {
          const blob = await response.blob();
          blobCache.set(key, blob);
        }
      } catch { /* ignore errors in pre-warming */ }
    }),
  );
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

// Legacy stubs kept for compatibility
export async function initTTS() {}
export function getAvailableVoices() { return []; }
export function getEnglishVoice() { return null; }
