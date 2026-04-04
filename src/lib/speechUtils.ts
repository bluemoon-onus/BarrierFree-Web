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

// ── UI manifest (/public/audio/manifest.json) ────────────────────────────────
// Maps "voice|model|text" → "/audio/{sha1}.mp3"
let uiManifestPromise: Promise<Record<string, string>> | null = null;

function loadUIManifest(): Promise<Record<string, string>> {
  if (!uiManifestPromise) {
    uiManifestPromise = fetch('/audio/manifest.json')
      .then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : {}))
      .catch(() => ({} as Record<string, string>));
  }
  return uiManifestPromise;
}

// ── Per-book manifests (/public/audio/{bookId}/{bookId}.json) ─────────────────
// Maps "voice|model|text" → "/audio/{bookId}/{sha1}.mp3"
const bookManifestCache = new Map<string, Record<string, string>>();
const bookManifestLoading = new Map<string, Promise<void>>();

/**
 * Load and cache the pre-generated audio manifest for a specific book.
 * Call this when opening a book so all its sentences resolve from static files
 * instead of hitting /api/tts.
 */
export function loadBookManifest(bookId: string): Promise<void> {
  if (bookManifestCache.has(bookId)) return Promise.resolve();
  const existing = bookManifestLoading.get(bookId);
  if (existing) return existing;

  const p = (async () => {
    try {
      const r = await fetch(`/audio/${bookId}/${bookId}.json`);
      const data: Record<string, string> = r.ok ? (await r.json() as Record<string, string>) : {};
      bookManifestCache.set(bookId, data);
    } catch {
      bookManifestCache.set(bookId, {});
    }
  })();

  bookManifestLoading.set(bookId, p);
  return p;
}

// ── In-memory blob cache (current session) ───────────────────────────────────
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
 *
 * Resolution order:
 *   1. In-memory blob cache (instant)
 *   2. UI manifest  (/audio/manifest.json — UI phrases)
 *   3. Per-book manifests (/audio/{bookId}/{bookId}.json — book sentences)
 *   4. Dynamic /api/tts (fallback, ~300ms)
 */
async function resolveAudio(
  text: string,
  voice: string,
  model: string,
  signal: AbortSignal,
): Promise<{ src: string; isBlob: boolean } | null> {
  const key = `${voice}|${model}|${text}`;

  // 1. In-memory blob cache
  const cachedBlob = blobCache.get(key);
  if (cachedBlob) {
    return { src: URL.createObjectURL(cachedBlob), isBlob: true };
  }

  // 2. UI manifest
  const uiManifest = await loadUIManifest();
  if (signal.aborted) return null;
  const uiPath = uiManifest[key];
  if (uiPath) return { src: uiPath, isBlob: false };

  // 3. Per-book manifests (already-loaded books)
  for (const bookManifest of Array.from(bookManifestCache.values())) {
    const bookPath = bookManifest[key];
    if (bookPath) return { src: bookPath, isBlob: false };
  }

  if (signal.aborted) return null;

  // 4. Dynamic API (last resort — generates on the fly)
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, model }),
    signal,
  });
  if (!response.ok || signal.aborted) return null;

  const blob = await response.blob();
  if (signal.aborted) return null;

  // Cache short texts; skip long book sentences (they'll be in the per-book manifest)
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
 * Pre-warm audio into the in-memory blob cache.
 * Checks UI manifest and per-book manifests before falling back to /api/tts.
 */
export async function prewarm(texts: string[]): Promise<void> {
  if (typeof window === 'undefined') return;

  const voice = prefs.voice;
  const model = prefs.model;
  const uiManifest = await loadUIManifest();

  await Promise.allSettled(
    texts.map(async (rawText) => {
      const text = rawText.trim();
      if (!text) return;
      const key = `${voice}|${model}|${text}`;

      if (blobCache.has(key)) return;

      // Find a static URL (UI manifest first, then per-book manifests)
      let staticUrl: string | null = uiManifest[key] ?? null;
      if (!staticUrl) {
        for (const bookManifest of Array.from(bookManifestCache.values())) {
          const p = bookManifest[key];
          if (p) { staticUrl = p; break; }
        }
      }

      try {
        const response = staticUrl
          ? await fetch(staticUrl)
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
