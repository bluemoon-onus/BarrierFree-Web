# Execution Prompts — Copy & Paste Guide

## 사용법
1. 아래 프롬프트를 순서대로 실행
2. "→ Codex"는 Codex Mac App에 붙여넣기
3. "→ Claude CLI"는 터미널에서 `claude` 명령으로 실행
4. 각 작업이 끝나면 다음 작업으로 진행
5. 에이전트가 완료 확인을 하면 다음 프롬프트를 입력

---

## 사전 준비 (수동)

### 0-1. GitHub Repository 생성
```bash
mkdir BarrierFree-Web && cd BarrierFree-Web
git init
git remote add origin https://github.com/YOUR_USERNAME/BarrierFree-Web.git
```

### 0-2. Anthropic API Key 준비
- https://console.anthropic.com 에서 API 키 발급
- 나중에 Vercel 환경변수에 `ANTHROPIC_API_KEY`로 등록

---

## Task #1 → Codex
**목표**: Next.js 프로젝트 스캐폴딩 + 기본 설정

```
Read agents.md first, then scaffold the project.

1. Initialize Next.js 14 with App Router:
   npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-import-alias

2. Install dependencies:
   npm install @anthropic-ai/sdk

3. Copy the following files from docs/ into the project (they already exist, just verify the structure):
   - agents.md (project root)
   - claude.md (project root)
   - docs/ (entire folder)

4. Create the file structure as defined in agents.md:
   - src/app/layout.tsx (basic layout with metadata for accessibility)
   - src/app/page.tsx (placeholder with "BarrierFree-Web" title)
   - src/app/api/typo-check/route.ts (empty placeholder)
   - src/components/ (empty dir with .gitkeep)
   - src/hooks/ (empty dir with .gitkeep)
   - src/lib/ (empty dir with .gitkeep)
   - public/books/ (empty dir with .gitkeep)

5. Configure tailwind.config.ts with high-contrast color tokens:
   - colors.access.bg: '#000000' (black background)
   - colors.access.text: '#FFFFFF' (white text)
   - colors.access.accent: '#FFD700' (gold accent)
   - colors.access.zone: '#1a1a2e' (zone background)
   - colors.access.highlight: '#00FF88' (active highlight)

6. Update src/styles/globals.css:
   - Set body background to black, text to white
   - Font size base: 18px
   - Add @media (prefers-contrast: more) styles

7. Verify: npm run dev works without errors.

After completion, update docs/CHANGELOG.md:
- Task #1 complete, list files created.
```

---

## Task #2 → Codex
**목표**: TTS 엔진 모듈 구현

```
Read docs/features/tts-engine.md, then implement src/lib/speechUtils.ts.

Requirements:
1. Create src/lib/speechUtils.ts with these exports:
   - speak(text: string, options?: SpeakOptions): Promise<void>
   - stopSpeaking(): void
   - pauseSpeaking(): void
   - resumeSpeaking(): void
   - isSpeaking(): boolean
   - getAvailableVoices(): SpeechSynthesisVoice[]
   - getEnglishVoice(): SpeechSynthesisVoice | null
   - initTTS(): Promise<void> — call on app load to preload voices

2. SpeakOptions type:
   { rate?: number; pitch?: number; volume?: number; priority?: 'high' | 'normal' }

3. priority 'high' must cancel current speech before speaking.
   priority 'normal' queues after current speech.

4. For long text (>100 chars), split by sentences (split on '. ' or '.\n') and create separate utterances for each sentence. This works around Chrome's 15-second utterance limit.

5. getEnglishVoice() should:
   - First try to find a voice with lang === 'en-US'
   - Fallback to any voice with lang starting with 'en'
   - Handle both Chrome and Safari voice naming

6. initTTS() should:
   - Call speechSynthesis.getVoices()
   - Listen for 'voiceschanged' event
   - Resolve when voices are loaded

7. Create src/hooks/useTTS.ts — a React hook that wraps speechUtils:
   - Returns { speak, stop, pause, resume, isSpeaking, isSupported }
   - Calls initTTS() on mount
   - isSupported = true if window.speechSynthesis exists

After completion, update docs/CHANGELOG.md.
```

---

## Task #3 → Codex
**목표**: 마우스 존 트래킹 훅 구현

```
Read docs/features/mouse-navigation.md and docs/design/architecture.md (Zone Detection Logic section).

Implement src/hooks/useMouseZone.ts:

1. Define Zone type: 'back' | 'forward' | 'books' | 'search' | 'home'

2. Zone detection logic (from architecture.md):
   - upper-left (x<50%, y<50%) → 'back'
   - upper-right (x≥50%, y<50%) → 'forward'
   - lower-left (x<35%, y≥50%) → 'books'
   - lower-right (x≥65%, y≥50%) → 'search'
   - bottom-center (35%≤x<65%, y≥70%) → 'home'
   - If no match (gap area), return nearest zone

3. Hook returns:
   {
     currentZone: Zone,
     previousZone: Zone | null,
     mousePosition: { x: number, y: number },
     isIdle: boolean,
     nearbyZones: { zone: Zone, direction: string }[]
   }

4. Idle detection:
   - Track last mousemove timestamp
   - After 800ms of no movement, set isIdle = true
   - Reset on next mousemove

5. nearbyZones calculation:
   - Based on current zone, list adjacent zones with direction words
   - Example: if in 'books', nearbyZones = [{ zone: 'home', direction: 'right' }, { zone: 'back', direction: 'up' }]

6. Performance:
   - Use requestAnimationFrame to throttle mousemove processing
   - Only update state when zone actually changes

After completion, update docs/CHANGELOG.md.
```

---

## Task #4 → Claude CLI
**목표**: 음성 안내 문구 사전 작성

```
claude "Read docs/features/mouse-navigation.md and docs/design/architecture.md.

Create src/lib/voiceDictionary.ts with all voice guidance text strings.

Requirements:
1. Export an object with these categories:

onboarding: {
  welcome: string,          // Full welcome message (see architecture.md Voice Guidance Flow)
  instructions: string,     // Zone layout explanation
  startPrompt: string       // 'You can start by moving your mouse now.'
}

zones: {
  [zone: Zone]: {
    enter: string,          // When mouse enters this zone
    idle: string,           // When mouse is idle in this zone
    click: string,          // When zone is clicked
  }
}

navigation: {
  direction: (targetZone: string, direction: string) => string,
  // e.g., 'Move right for Search.'
}

keyboard: {
  keyPress: (key: string) => string,    // Just the key name
  enter: string,                         // 'Checking your input...'
  escape: string,                        // 'Input cleared.'
  space: string,                         // 'space'
  backspace: string,                     // 'delete'
}

typoCorrection: {
  checking: string,
  noTypo: (text: string) => string,
  hasTypo: (original: string, corrected: string) => string,
  accepted: (corrected: string) => string,
  retry: string,
  error: string,
}

bookReader: {
  nowReading: (title: string, chapter: string) => string,
  paused: string,
  resumed: string,
  stopped: string,
  nextParagraph: string,
  prevParagraph: string,
}

2. All strings should be natural, spoken English — conversational tone.
3. Keep sentences short for TTS clarity.
4. Use template literals for dynamic content.

After completion, update docs/CHANGELOG.md with what was created."
```

---

## Task #5 → Codex
**목표**: 키보드 입력 감지 + 읽기 훅

```
Read docs/features/keyboard-reader.md.

Implement src/hooks/useKeyboardReader.ts:

1. Hook signature:
   function useKeyboardReader(
     onSubmit: (text: string) => Promise<void>,
     ttsSpeak: (text: string, options?: SpeakOptions) => Promise<void>
   ): {
     currentText: string,
     isListening: boolean,
     isProcessing: boolean,
     startListening: () => void,
     stopListening: () => void,
     clearText: () => void,
   }

2. When isListening is true:
   - Capture keydown events on the document
   - For printable characters (a-z, 0-9, symbols): append to currentText, speak the character
   - Space: append space, speak 'space'
   - Backspace: remove last char, speak 'delete'
   - Enter: call onSubmit(currentText), set isProcessing = true
   - Escape: clearText(), speak 'Input cleared'

3. The speak calls should use priority 'high' so each keystroke interrupts the previous one.

4. When isProcessing is true, ignore all keystrokes except Escape.

5. Provide a way to handle the typo correction response:
   - After onSubmit resolves, if correction is needed, listen for Enter (accept) or Space (retry)
   - This state machine: idle → listening → processing → confirming → idle

After completion, update docs/CHANGELOG.md.
```

---

## Task #6 → Claude CLI
**목표**: 오타교정 API Route 구현

```
claude "Read docs/features/typo-correction.md.

Implement src/app/api/typo-check/route.ts:

1. POST handler that:
   - Parses JSON body: { text: string }
   - Validates text is non-empty and under 500 chars
   - Calls Anthropic API (Claude Haiku) with the system prompt from typo-correction.md
   - Returns JSON: { hasTypo, original, corrected, explanation }

2. Use @anthropic-ai/sdk:
   import Anthropic from '@anthropic-ai/sdk';
   const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

3. Model: 'claude-haiku-4-5-20251001'
   max_tokens: 200
   temperature: 0

4. Parse Haiku's response: expect JSON in the text content block.
   Strip any markdown fences if present before JSON.parse().

5. Error handling:
   - Missing text → 400 { error: 'Text is required' }
   - API error → 500 { error: 'Failed to check text', hasTypo: false, original: text, corrected: text }
   - Timeout → use AbortController with 5s timeout

6. Add runtime = 'edge' for Vercel Edge deployment.

After completion, update docs/CHANGELOG.md."
```

---

## Task #7 → Codex
**목표**: 오타교정 UI 컴포넌트

```
Read docs/features/keyboard-reader.md and docs/features/typo-correction.md.

Implement src/components/TypingEditor.tsx:

1. A full-screen overlay component that activates when user enters the Search zone.

2. Visual elements:
   - Large text display area showing currentText (white on black, min 24px)
   - Status indicator: "Listening..." / "Checking..." / "Did you mean...?"
   - Visual keyboard feedback (optional: highlight last typed key)

3. Integration:
   - Use useKeyboardReader hook for input handling
   - Use useTTS hook for voice output
   - Import voiceDictionary for all text strings
   - Call /api/typo-check via fetch on Enter

4. State flow:
   - IDLE: shows cursor blinking, "Type to search..."
   - TYPING: shows typed text, reads each key
   - CHECKING: shows spinner, "Checking your input..."
   - CONFIRMING: shows "Did you mean X?" with Enter/Space instructions
   - COMPLETE: triggers search callback and closes

5. Props:
   interface TypingEditorProps {
     isOpen: boolean;
     onClose: () => void;
     onSearch: (query: string) => void;
   }

6. Styling: Tailwind, high contrast (access color tokens).
   Center the text. Large font. Minimal UI.

After completion, update docs/CHANGELOG.md.
```

---

## Task #8 → Codex
**목표**: eBook 리더 컴포넌트

```
Read docs/features/book-reader.md.

1. Create public/books/books.json with 3 books:
   - "Alice's Adventures in Wonderland" Ch.1 (first 10 paragraphs, public domain)
   - "The Gift of the Magi" by O. Henry (first 10 paragraphs, public domain)
   - "Aesop's Fables" — 5 short fables (public domain)
   Structure: { id, title, author, chapters: [{ id, title, paragraphs: string[] }] }

2. Create src/lib/books.ts:
   - loadBooks(): Promise<Book[]> — fetch from /books/books.json
   - getBook(id: string): Promise<Book | null>

3. Create src/components/BookReader.tsx:
   Props: { book: Book | null, onClose: () => void }

   Features:
   - On mount, announce: "Now reading: [title]" via TTS
   - Read paragraphs sequentially using speechUtils
   - Space key: pause/resume
   - Escape: stop and call onClose
   - Right arrow: skip to next paragraph
   - Left arrow: go back one paragraph
   - Show current paragraph text on screen (high contrast)
   - Show progress: "Paragraph 3 of 15"

   Between paragraphs, wait 500ms before starting next.

After completion, update docs/CHANGELOG.md.
```

---

## Task #9 → Codex
**목표**: 메인 페이지 + 4분면 레이아웃

```
Read docs/design/architecture.md (Mouse 4-Zone Navigation Model).

Implement src/app/page.tsx as the main page:

1. Full viewport layout divided into 5 visual zones (for sighted debug/demo):
   - Use CSS grid or absolute positioning
   - Each zone has a subtle border and label (e.g., "← Back", "Forward →")
   - Zones should be visually distinct but not overwhelming

2. Integrate useMouseZone hook:
   - Highlight the current zone (access.highlight color)
   - On zone change: speak zone entry message from voiceDictionary
   - On idle: speak idle message with nearby zone guidance

3. Zone click handlers:
   - 'back': window.history.back() or navigate to previous view
   - 'forward': window.history.forward() or navigate to next view
   - 'books': show book list (simple list of 3 books from books.json)
   - 'search': open TypingEditor
   - 'home': reset to default view

4. Page states:
   - DEFAULT: shows 5 zones with welcome message
   - BOOKS: shows book list overlay (click a book → BookReader)
   - READING: BookReader component active
   - SEARCH: TypingEditor active

5. Create src/components/MouseZoneOverlay.tsx:
   - Debug/demo overlay showing zone boundaries
   - Current mouse position dot
   - Zone labels
   - Can be toggled with 'D' key (for demo purposes)

After completion, update docs/CHANGELOG.md.
```

---

## Task #10 → Codex
**목표**: 온보딩 음성 가이드

```
Implement src/components/Onboarding.tsx:

1. Shows on first visit (check localStorage for 'BarrierFree-Web_onboarded').
   Wait — localStorage is not available in artifacts, but this is a standalone Next.js app deployed on Vercel, so localStorage IS available here.

2. On mount:
   - Display semi-transparent overlay with welcome text
   - Auto-play welcome message via TTS (from voiceDictionary.onboarding)
   - Read: welcome → instructions → startPrompt
   
3. After TTS completes OR user clicks anywhere OR presses any key:
   - Dismiss onboarding overlay
   - Set localStorage flag
   - Focus moves to main page

4. Provide a "Replay Guide" button in the navigation bar for re-triggering.

5. Visual: centered text panel, large font, gold accent border.
   Fade in/out animation (respect prefers-reduced-motion).

After completion, update docs/CHANGELOG.md.
```

---

## Task #11 → Claude CLI
**목표**: 고대비 접근성 스타일링 리뷰 + 수정

```
claude "As UI Designer and QA, review all components for accessibility:

1. Check every component in src/components/ and src/app/page.tsx for:
   - WCAG AAA color contrast (7:1 ratio minimum)
   - All interactive elements have aria-label
   - All zones have role='button' and tabIndex
   - Focus indicators are visible (outline style)
   - Font sizes are minimum 18px
   - Touch/click targets are minimum 44x44px

2. Check src/styles/globals.css for:
   - @media (prefers-contrast: more) overrides
   - @media (prefers-reduced-motion: reduce) — disable animations
   - Focus-visible styles

3. Add skip-to-content link in layout.tsx

4. Ensure keyboard navigation works:
   - Tab through all zones in logical order
   - Enter/Space to activate zones
   - Escape to close overlays

5. Fix any issues found. List all changes made.

After completion, update docs/CHANGELOG.md."
```

---

## Task #12 → Claude CLI
**목표**: QA — Chrome + Safari TTS 테스트 시나리오 작성

```
claude "As QA, create a comprehensive test plan:

1. Create docs/qa-test-plan.md with test scenarios:

   A. TTS Engine Tests:
   - [ ] Chrome (macOS): speak() produces audio
   - [ ] Chrome (Windows): speak() produces audio
   - [ ] Safari (macOS): speak() produces audio
   - [ ] English voice is selected correctly
   - [ ] Long text is split into sentences
   - [ ] Priority 'high' interrupts current speech
   - [ ] stopSpeaking() silences immediately

   B. Mouse Zone Tests:
   - [ ] Moving to each of 5 zones announces correct zone
   - [ ] Idle for 800ms triggers guidance
   - [ ] Nearby zones are announced correctly
   - [ ] Zone highlighting works visually
   - [ ] Click in each zone triggers correct action

   C. Keyboard Reader Tests:
   - [ ] Each key typed is spoken
   - [ ] Backspace speaks 'delete'
   - [ ] Enter submits to typo check API
   - [ ] Escape clears input

   D. Typo Correction Tests:
   - [ ] 'hello' → no typo detected
   - [ ] 'aplle' → suggests 'apple'
   - [ ] Enter accepts correction
   - [ ] Space triggers retype
   - [ ] API error gracefully handled

   E. Book Reader Tests:
   - [ ] Book list displays 3 books
   - [ ] Selecting book starts TTS reading
   - [ ] Space pauses/resumes
   - [ ] Escape returns to book list
   - [ ] Arrow keys navigate paragraphs

   F. Onboarding Tests:
   - [ ] First visit shows onboarding
   - [ ] TTS plays welcome message
   - [ ] Click/key dismisses
   - [ ] Second visit skips onboarding
   - [ ] Replay button works

2. Also verify: no console errors, no broken layouts at 1024px+ width.

After completion, update docs/CHANGELOG.md."
```

---

## Task #13 → Claude CLI
**목표**: QA — 오타교정 E2E 검증

```
claude "As QA and Engineer, verify the typo correction E2E flow:

1. Run the app locally (npm run dev)
2. Navigate to the search zone
3. Test these inputs via the TypingEditor:
   - 'hello' → should report no typo
   - 'teh' → should suggest 'the'
   - 'recieve' → should suggest 'receive'
   - 'aplle' → should suggest 'apple'
   - '' (empty) → should reject with message
   - 'aaaaabbbbcccc' (gibberish) → should handle gracefully

4. Verify the voice flow:
   - Typing each character is spoken
   - 'Checking your input...' is spoken on Enter
   - Result is spoken clearly
   - Enter/Space confirmation works

5. Check API route error handling:
   - Remove ANTHROPIC_API_KEY env var → should get graceful error
   - Send malformed request → should get 400

6. Document any bugs found and fix critical ones.

After completion, update docs/CHANGELOG.md."
```

---

## Task #14 → Codex
**목표**: Vercel 배포 설정

```
1. Create vercel.json in project root (if needed):
   {
     "framework": "nextjs"
   }

2. Create .env.example:
   ANTHROPIC_API_KEY=your_api_key_here

3. Create .gitignore additions:
   .env
   .env.local

4. Update README.md with:
   - Project description
   - Setup instructions (clone, npm install, add .env, npm run dev)
   - Deployment instructions (vercel deploy)
   - Browser requirements (Chrome or Safari, desktop)
   - Feature list
   - Architecture overview (brief)

5. Ensure next.config.js has no issues for Vercel deployment.

6. Run: npm run build — fix any build errors.

After completion, update docs/CHANGELOG.md.
```

**⚠️ 수동 작업 (사용자)**:
```bash
# Vercel에 배포
vercel
# 환경변수 설정
vercel env add ANTHROPIC_API_KEY
# 프로덕션 배포
vercel --prod
```

---

## Task #15 → Claude CLI
**목표**: 최종 문서 + 변경이력 마무리

```
claude "As PM, finalize all documentation:

1. Update docs/CHANGELOG.md with final Stage 5 completion.

2. Review and update docs/ROADMAP.md:
   - Mark all completed stages
   - Add v1.1 roadmap section:
     - Korean language support (ko-KR TTS voice)
     - Supabase user preferences storage
     - Voice speed/pitch settings UI
     - Mobile/tablet support exploration
     - Additional eBook content

3. Create docs/DEPLOYMENT.md with:
   - Production URL
   - Environment variables list
   - How to update/redeploy
   - Monitoring (Vercel dashboard)

4. Review README.md for completeness.

5. Final CHANGELOG entry with summary of entire project.

After completion, the project is DONE."
```

---

## 전체 실행 요약

| Task | Agent | 예상시간 | 입력 파일 |
|------|-------|----------|-----------|
| #1 Scaffolding | Codex | 30min | agents.md |
| #2 TTS Engine | Codex | 45min | tts-engine.md |
| #3 Mouse Zone | Codex | 60min | mouse-navigation.md, architecture.md |
| #4 Voice Dict | Claude CLI | 30min | mouse-navigation.md, architecture.md |
| #5 Keyboard Reader | Codex | 45min | keyboard-reader.md |
| #6 Typo API | Claude CLI | 30min | typo-correction.md |
| #7 Typing Editor | Codex | 60min | keyboard-reader.md, typo-correction.md |
| #8 Book Reader | Codex | 60min | book-reader.md |
| #9 Main Page | Codex | 60min | architecture.md |
| #10 Onboarding | Codex | 30min | voiceDictionary |
| #11 Accessibility | Claude CLI | 45min | all components |
| #12 QA Test Plan | Claude CLI | 60min | all features |
| #13 QA E2E | Claude CLI | 30min | typo-correction flow |
| #14 Deploy | Codex | 30min | all |
| #15 Final Docs | Claude CLI | 30min | all |

**총 예상시간: ~10시간 (2일 내 충분)**
