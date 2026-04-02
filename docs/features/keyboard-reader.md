# Feature: Keyboard Reader (useKeyboardReader.ts)

## Overview
사용자가 타이핑할 때 각 키 입력을 실시간으로 음성으로 읽어준다.
엔터키를 누르면 전체 텍스트를 LLM에 보내 오타 교정.

## Hook Interface
```typescript
interface KeyboardReaderState {
  currentText: string;
  isListening: boolean;
  isProcessing: boolean;  // LLM 호출 중
}

interface KeyboardReaderActions {
  startListening: () => void;
  stopListening: () => void;
  clearText: () => void;
}

function useKeyboardReader(): [KeyboardReaderState, KeyboardReaderActions];
```

## Key Event Handling
| Key | Action | Voice |
|-----|--------|-------|
| a-z, 0-9 | Append to text, speak character | "a", "b", "1" |
| Space | Append space, speak "space" | "space" |
| Backspace | Remove last char, speak "delete" | "delete" |
| Enter | Submit text to LLM | "Checking your input..." |
| Escape | Clear and exit | "Input cleared." |

## Typo Correction Flow
1. User presses Enter
2. `isProcessing = true`
3. POST `/api/typo-check` with `{ text: currentText }`
4. If no typo: "Your input is correct: [text]. Searching now."
5. If typo found: "Did you mean [corrected] instead of [original]? Press Enter to accept, or Space to retype."
6. Enter → accept correction, proceed
7. Space → clear text, refocus editor, "Let's try again."
