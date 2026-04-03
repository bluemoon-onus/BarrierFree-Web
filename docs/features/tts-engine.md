# Feature: TTS Engine (speechUtils.ts)

## Overview
OpenAI TTS API를 래핑하는 유틸리티 모듈.
모든 음성 출력은 이 모듈을 통해서만 이루어져야 한다.
컴포넌트에서 OpenAI SDK나 `fetch('/api/tts')`를 직접 호출하지 말 것.

## Audio Resolution Pipeline (3-layer cache)

```
speak(text)
  │
  ├─1─ In-memory blob cache (Map<key, Blob>)  ← instant, current session
  │
  ├─2─ Static manifest (/audio/manifest.json)  ← CDN-served pre-generated MP3s
  │       key format: "{voice}|{model}|{text}"
  │
  └─3─ Dynamic API fetch: POST /api/tts        ← fallback, ~500ms
           └─ OpenAI audio.speech.create()
           └─ response cached in blob cache (text < 300 chars)
```

## API

```typescript
// Core functions
speak(text: string, options?: SpeakOptions): Promise<void>
stopSpeaking(): void
pauseSpeaking(): void
resumeSpeaking(): void
isSpeaking(): boolean

// Pre-warming (fill blob cache before needed)
prewarm(texts: string[]): Promise<void>

// Voice preferences
setVoicePreferences(prefs: Partial<VoicePreferences>): void
getVoicePreferences(): VoicePreferences

// Types
interface SpeakOptions {
  priority?: 'high' | 'normal';   // high = cancel current speech immediately
  voice?: string;                  // overrides prefs.voice for this call
  model?: string;                  // overrides prefs.model for this call
}

interface VoicePreferences {
  voice: string;   // default: 'nova'
  model: string;   // default: 'tts-1'
}
```

## Supported Voices
`alloy`, `ash`, `coral`, `echo`, `fable`, `nova` (default), `onyx`, `sage`, `shimmer`

## Supported Models
| Model | Quality | Latency |
|-------|---------|---------|
| `tts-1` (default) | Standard | ~300ms |
| `tts-1-hd` | High definition | ~500ms |

## API Route: POST /api/tts
Located at `src/app/api/tts/route.ts`.

```typescript
// Request body
{ text: string; voice?: string; model?: string }

// Response
// Content-Type: audio/mpeg  (MP3 binary)
// Cache-Control: public, max-age=3600
```

- Input validation: unknown voice/model values fall back to `nova` / `tts-1`
- Text truncated at 4096 characters (OpenAI limit)
- OpenAI client instantiated lazily on first request (build succeeds without API key)

## Audio Pre-Generation Script
`scripts/generate-audio.mjs` — run with `npm run generate-audio`
- Reads all books from `public/books/books.json`
- Fetches ch1 + ch2 content, splits into sentences (first 3000 chars)
- Calls OpenAI TTS and saves MP3s to `public/audio/`
- Updates `public/audio/manifest.json` with `voice|model|text → path` mappings
- Pre-warmed phrases include: library open, search focus, navigation cues

## Events
```typescript
TTS_STATE_EVENT  = 'barrierfree-web:tts-state-change'  // isSpeaking changed
TTS_BLOCKED_EVENT = 'barrierfree-web:tts-blocked'       // autoplay blocked by browser
```

## Implementation Notes
- `priority: 'high'` cancels in-flight audio (aborts fetch + pauses HTMLAudioElement) before starting new speech
- Blob URLs are revoked after playback to prevent memory leaks
- 30s safety timeout resolves the promise if audio events never fire
- Long book sentences should use `prewarm()` (called by BookReader on ±3 sentence window) rather than `speak()` to avoid latency at sentence boundaries
