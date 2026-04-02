# CHANGELOG — BarrierFree-Web

All notable changes to this project will be documented in this file.
Format: Stage > Task > Agent > Status

---

## [Stage 0: Planning] — Design Phase
- **Status**: ✅ Complete
- **Agent**: Claude (claude.ai)
- **Date**: 2026-04-02
- **Changes**:
  - Created project documentation structure
  - Defined architecture and 5-zone navigation model
  - Designed TTS engine, mouse navigation, keyboard reader, typo correction, book reader features
  - Created agents.md and claude.md
  - Created sub-agent configurations
  - Created execution prompts for Codex and Claude CLI
  - Defined work delegation plan (15 tasks)

---

## [Stage 1: Design] — Pending
- **Status**: ✅ Task #1 Complete
- **Agent**: Codex
- **Date**: 2026-04-02
- **Changes**:
  - Initialized a Next.js 14 App Router scaffold with TypeScript and Tailwind CSS
  - Installed `@anthropic-ai/sdk`
  - Verified `agents.md`, `claude.md`, and the `docs/` structure
  - Reorganized docs into `design/`, `features/`, `prompts/`, and `sub-agents/`
  - Added accessible placeholder app files and high-contrast styling tokens
- **Files Created**:
  - `.eslintrc.json`
  - `.gitignore`
  - `next-env.d.ts`
  - `next.config.js`
  - `package-lock.json`
  - `package.json`
  - `postcss.config.mjs`
  - `tailwind.config.ts`
  - `tsconfig.json`
  - `public/books/.gitkeep`
  - `src/app/api/typo-check/route.ts`
  - `src/app/favicon.ico`
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
  - `src/components/.gitkeep`
  - `src/hooks/.gitkeep`
  - `src/lib/.gitkeep`
  - `src/styles/globals.css`
- **Next Task**: Task #2 — Core TTS engine and voice dictionary

## [Stage 2: Features] — Pending
- **Status**: ✅ Task #2 Complete
- **Agent**: Codex
- **Date**: 2026-04-02
- **Changes**:
  - Implemented `src/lib/speechUtils.ts` as the centralized Web Speech API wrapper
  - Added speech priority handling for interrupt vs queued playback
  - Split long text into sentence-based utterances to avoid Chrome cutoff issues
  - Added English voice selection and async voice initialization support
  - Implemented `src/hooks/useTTS.ts` to expose TTS controls and support detection to React components
  - Verified the implementation with `npm run lint` and `npm run build`
- **Files Created**:
  - `src/lib/speechUtils.ts`
  - `src/hooks/useTTS.ts`
- **Next Task**: Task #3 — Mouse tracking and zone detection hook

- **Status**: ✅ Task #3 Complete
- **Agent**: Codex
- **Date**: 2026-04-02
- **Changes**:
  - Implemented `src/hooks/useMouseZone.ts` with 5-zone viewport detection
  - Added nearest-zone fallback handling for the lower-center gap area
  - Added adjacent zone guidance metadata for voice prompts
  - Added 800ms idle detection with reset-on-move behavior
  - Throttled mousemove processing with `requestAnimationFrame`
  - Verified the hook with `npm run lint` and `npm run build`
- **Files Created**:
  - `src/hooks/useMouseZone.ts`
- **Next Task**: Task #4 — Voice guidance dictionary

- **Status**: ✅ Task #4 Complete
- **Agent**: Claude CLI
- **Date**: 2026-04-02
- **Changes**:
  - Created `src/lib/voiceDictionary.ts` with all voice guidance text strings
  - Defined onboarding messages (welcome, instructions, startPrompt)
  - Defined zone-level voice strings (enter, idle, click) for all 5 zones
  - Added navigation direction helper using template literals
  - Added keyboard feedback strings (keyPress, enter, escape, space, backspace)
  - Added typo correction voice flow strings (checking, noTypo, hasTypo, accepted, retry, error)
  - Added book reader voice strings (nowReading, paused, resumed, stopped, nextParagraph, prevParagraph)
  - Verified with `npm run lint` and `npm run build`
- **Files Created**:
  - `src/lib/voiceDictionary.ts`
- **Next Task**: Task #5 — Keyboard reader hook (Codex)

- **Status**: ✅ Task #5 Complete
- **Agent**: Codex
- **Date**: 2026-04-02
- **Changes**:
  - Implemented `src/hooks/useKeyboardReader.ts` for real-time typed character feedback
  - Added high-priority TTS handling for printable keys, space, backspace, enter, and escape
  - Added an internal state machine for idle, listening, processing, and typo-confirmation flows
  - Added confirmation handling so Enter accepts a correction and Space retries input
  - Added error recovery that returns the hook to listening mode after failed submission
  - Verified with `npm run lint` and `npm run build`
- **Files Created**:
  - `src/hooks/useKeyboardReader.ts`
- **Next Task**: Task #6 — Typo correction API route (Claude)

- **Status**: ✅ Task #6 Complete
- **Agent**: Claude CLI
- **Date**: 2026-04-02
- **Changes**:
  - Implemented `src/app/api/typo-check/route.ts` with Vercel Edge Runtime
  - Added input validation (non-empty, max 500 chars) with 400 error responses
  - Integrated Anthropic SDK calling `claude-haiku-4-5-20251001` at temperature 0
  - Added JSON extraction with markdown fence stripping before `JSON.parse()`
  - Added 5-second AbortController timeout with graceful error fallback
  - Verified with `npm run lint` and `npm run build`
- **Files Modified**:
  - `src/app/api/typo-check/route.ts`
- **Next Task**: Task #7 — Typing Editor UI component (Codex)

## [Stage 3: UI] — Pending
## [Stage 4: QA] — Pending
## [Stage 5: Deploy] — Pending
