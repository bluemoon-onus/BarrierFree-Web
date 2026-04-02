export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  priority?: "high" | "normal";
}

export interface VoicePreferences {
  lang: string;
  rate: number;
  pitch: number;
}

type SpeechBatch = {
  remaining: number;
  resolve: () => void;
  settled: boolean;
};

const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  lang: "en-US",
  rate: 1,
  pitch: 1,
};

const TTS_STATE_EVENT = "barrierfree-web:tts-state-change";

let voicePreferences = { ...DEFAULT_VOICE_PREFERENCES };
let initPromise: Promise<void> | null = null;
let voicesListenerRegistered = false;
const activeBatches = new Set<SpeechBatch>();

function getSpeechSynthesisInstance(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  return window.speechSynthesis;
}

function emitSpeechStateChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(TTS_STATE_EVENT));
}

function normalizeLanguageTag(lang: string) {
  return lang.replace("_", "-").toLowerCase();
}

function ensureVoicesListener() {
  const synthesis = getSpeechSynthesisInstance();

  if (!synthesis || voicesListenerRegistered) {
    return;
  }

  synthesis.addEventListener("voiceschanged", () => {
    emitSpeechStateChange();
  });
  voicesListenerRegistered = true;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function splitIntoUtteranceChunks(text: string) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return [];
  }

  if (normalizedText.length <= 100) {
    return [normalizedText];
  }

  const sentences = normalizedText
    .split(/\.\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence, index, allSentences) => {
      const isLastSentence = index === allSentences.length - 1;
      const endsWithPeriod = sentence.endsWith(".");

      if (endsWithPeriod || (isLastSentence && !normalizedText.endsWith("."))) {
        return sentence;
      }

      return `${sentence}.`;
    });

  return sentences.length > 0 ? sentences : [normalizedText];
}

function resolveBatch(batch: SpeechBatch) {
  if (batch.settled) {
    return;
  }

  batch.settled = true;
  activeBatches.delete(batch);
  batch.resolve();
}

function clearActiveBatches() {
  activeBatches.forEach((batch) => {
    resolveBatch(batch);
  });
}

function registerBatch(utterances: SpeechSynthesisUtterance[]) {
  if (utterances.length === 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const batch: SpeechBatch = {
      remaining: utterances.length,
      resolve,
      settled: false,
    };

    activeBatches.add(batch);

    const markUtteranceComplete = () => {
      if (batch.settled) {
        return;
      }

      batch.remaining -= 1;

      if (batch.remaining <= 0) {
        resolveBatch(batch);
      }

      emitSpeechStateChange();
    };

    utterances.forEach((utterance) => {
      utterance.onstart = () => {
        emitSpeechStateChange();
      };
      utterance.onend = markUtteranceComplete;
      utterance.onerror = markUtteranceComplete;
    });
  });
}

function createUtterances(text: string, options: SpeakOptions) {
  const chunks = splitIntoUtteranceChunks(text);
  const voice = getEnglishVoice();
  const rate = clamp(options.rate ?? voicePreferences.rate, 0.1, 10);
  const pitch = clamp(options.pitch ?? voicePreferences.pitch, 0, 2);
  const volume = clamp(options.volume ?? 1, 0, 1);

  return chunks.map((chunk) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = voice?.lang ?? voicePreferences.lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    if (voice) {
      utterance.voice = voice;
    }

    return utterance;
  });
}

export function setVoicePreferences(preferences: VoicePreferences) {
  voicePreferences = {
    lang: preferences.lang,
    rate: clamp(preferences.rate, 0.1, 10),
    pitch: clamp(preferences.pitch, 0, 2),
  };
}

export async function initTTS() {
  const synthesis = getSpeechSynthesisInstance();

  if (!synthesis) {
    return;
  }

  ensureVoicesListener();

  const voices = synthesis.getVoices();

  if (voices.length > 0) {
    return;
  }

  if (!initPromise) {
    initPromise = new Promise<void>((resolve) => {
      const handleVoicesChanged = () => {
        if (synthesis.getVoices().length === 0) {
          return;
        }

        synthesis.removeEventListener("voiceschanged", handleVoicesChanged);
        resolve();
      };

      synthesis.addEventListener("voiceschanged", handleVoicesChanged);
    });
  }

  await initPromise;
}

export function getAvailableVoices() {
  const synthesis = getSpeechSynthesisInstance();

  if (!synthesis) {
    return [];
  }

  ensureVoicesListener();

  return synthesis.getVoices();
}

export function getEnglishVoice() {
  const voices = getAvailableVoices();

  if (voices.length === 0) {
    return null;
  }

  const isEnglish = (v: SpeechSynthesisVoice) =>
    normalizeLanguageTag(v.lang).startsWith("en");

  const qualityTerms = ["premium", "enhanced", "neural", "natural", "siri"];
  const isHighQuality = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    return qualityTerms.some((t) => n.includes(t));
  };

  // 1. Premium/Enhanced English voice (macOS Siri Neural, etc.)
  const premiumEnUS = voices.find(
    (v) => normalizeLanguageTag(v.lang) === "en-us" && isHighQuality(v),
  );
  if (premiumEnUS) return premiumEnUS;

  const premiumEn = voices.find((v) => isEnglish(v) && isHighQuality(v));
  if (premiumEn) return premiumEn;

  // 2. Exact en-US match
  const enUS = voices.find(
    (v) => normalizeLanguageTag(v.lang) === "en-us",
  );
  if (enUS) return enUS;

  // 3. Any English voice
  return voices.find(isEnglish) ?? null;
}

export async function speak(text: string, options: SpeakOptions = {}) {
  const synthesis = getSpeechSynthesisInstance();
  const normalizedText = text.trim();

  if (!synthesis || !normalizedText) {
    return;
  }

  ensureVoicesListener();

  if (options.priority === "high") {
    clearActiveBatches();
    synthesis.cancel();
  }

  const utterances = createUtterances(normalizedText, options);
  const batchPromise = registerBatch(utterances);

  utterances.forEach((utterance) => {
    synthesis.speak(utterance);
  });

  emitSpeechStateChange();
  await batchPromise;
}

export function stopSpeaking() {
  const synthesis = getSpeechSynthesisInstance();

  if (!synthesis) {
    return;
  }

  clearActiveBatches();
  synthesis.cancel();
  emitSpeechStateChange();
}

export function pauseSpeaking() {
  const synthesis = getSpeechSynthesisInstance();

  if (!synthesis) {
    return;
  }

  synthesis.pause();
  emitSpeechStateChange();
}

export function resumeSpeaking() {
  const synthesis = getSpeechSynthesisInstance();

  if (!synthesis) {
    return;
  }

  synthesis.resume();
  emitSpeechStateChange();
}

export function isSpeaking() {
  const synthesis = getSpeechSynthesisInstance();

  if (!synthesis) {
    return false;
  }

  return synthesis.speaking || synthesis.pending || synthesis.paused;
}
