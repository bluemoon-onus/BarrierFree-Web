# Feature: TTS Engine (speechUtils.ts)

## Overview
Web Speech API SpeechSynthesis를 래핑하는 유틸리티 모듈.
모든 음성 출력은 이 모듈을 통해서만 이루어져야 한다.

## API

```typescript
// Core functions
speak(text: string, options?: SpeakOptions): Promise<void>
stopSpeaking(): void
pauseSpeaking(): void
resumeSpeaking(): void
isSpeaking(): boolean

// Voice management
getAvailableVoices(): SpeechSynthesisVoice[]
getEnglishVoice(): SpeechSynthesisVoice | null
setVoicePreferences(prefs: VoicePreferences): void

// Types
interface SpeakOptions {
  rate?: number;      // 0.1 - 10, default 1
  pitch?: number;     // 0 - 2, default 1
  volume?: number;    // 0 - 1, default 1
  priority?: 'high' | 'normal';  // high = cancel current, normal = queue
}

interface VoicePreferences {
  lang: string;       // 'en-US'
  rate: number;
  pitch: number;
}
```

## Implementation Notes
- `priority: 'high'`일 때 `speechSynthesis.cancel()` 후 즉시 발화
- Chrome에서 voices 로딩이 비동기 → `onvoiceschanged` 이벤트 핸들링 필수
- Safari에서 voice 이름이 다름 → lang으로 매칭 (`en-US` 또는 `en_US`)
- 긴 텍스트는 문장 단위로 분할하여 큐에 넣기 (Chrome 15초 제한 우회)

## Browser Quirks
- Chrome: 15초 이상 utterance가 자동 중단됨 → 문장 분할 필수
- Safari: `getVoices()`가 동기적으로 즉시 반환
- Both: `rate` 값이 너무 높으면 음성이 깨짐 → max 2.0 권장
