# agents.md — OpenAI Codex Configuration

## Role
You are a senior frontend engineer building an accessible eBook reader web application.

## Project Context
- **App Name**: BarrierFree-Web
- **Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Key Feature**: OpenAI TTS API for high-quality voice guidance for visually impaired users
- **Deployment**: Vercel
- **LLM Integration**: Claude Haiku via Vercel API Route (for typo correction only)

## Coding Standards
- TypeScript strict mode
- React functional components with hooks only
- Custom hooks prefix: `use` (e.g., `useMouseZone`, `useKeyboardReader`, `useTTS`)
- All voice guidance text managed in `src/lib/voiceDictionary.ts`
- TTS calls centralized in `src/lib/speechUtils.ts` (OpenAI TTS via `/api/tts` route)
- No direct calls to OpenAI SDK from components — always go through `speechUtils.ts`
- Tailwind CSS for styling, high contrast color scheme
- All interactive elements must have `aria-label` attributes

## File Structure
```
BarrierFree-Web/
├── agents.md              # This file (Codex config)
├── claude.md              # Claude CLI config
├── docs/
│   ├── ROADMAP.md         # Master roadmap
│   ├── CHANGELOG.md       # Stage-by-stage change log
│   ├── design/
│   │   └── architecture.md
│   ├── features/
│   │   ├── tts-engine.md
│   │   ├── mouse-navigation.md
│   │   ├── keyboard-reader.md
│   │   ├── typo-correction.md
│   │   └── book-reader.md
│   ├── prompts/
│   │   └── execution-prompts.md
│   └── sub-agents/
│       ├── codex-sub-agents.md
│       └── claude-sub-agents.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       └── typo-check/
│   │           └── route.ts
│   ├── components/
│   │   ├── BookReader.tsx
│   │   ├── TypingEditor.tsx
│   │   ├── Onboarding.tsx
│   │   ├── MouseZoneOverlay.tsx
│   │   └── NavigationBar.tsx
│   ├── hooks/
│   │   ├── useMouseZone.ts
│   │   ├── useKeyboardReader.ts
│   │   └── useTTS.ts
│   ├── lib/
│   │   ├── speechUtils.ts
│   │   ├── voiceDictionary.ts
│   │   └── books.ts
│   └── styles/
│       └── globals.css
├── public/
│   └── books/            # Static eBook content (JSON/MD)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Sub-Agent Roles (Codex)
When working on this project, adopt these personas as needed:

### Engineer
- Primary role. Write clean, typed, tested code.
- Follow the file structure above exactly.
- Each component/hook should be in its own file.

### UI Designer
- Apply high-contrast accessible design.
- Use `prefers-contrast` and `prefers-reduced-motion` media queries.
- Minimum touch target: 44px. Font size minimum: 18px.
- Color contrast ratio: WCAG AAA (7:1) minimum.

## Key Technical Decisions
1. **OpenAI TTS API** — all voice output via `POST /api/tts` → OpenAI `tts-1` / `tts-1-hd` model, returned as MP3 audio
2. **Three-layer audio caching**: in-memory blob cache → static pre-generated manifest (`/audio/manifest.json`) → dynamic API fetch fallback
3. **Mouse zone detection**: viewport divided into 5 regions, `mousemove` + 800ms idle detection
4. **Keyboard reading**: `keydown` event → speak key name via TTS
5. **Typo correction**: `Enter` key → POST to `/api/typo-check` → Claude Haiku → speak result
6. **eBook content**: static `.txt` files in `/public/books/`, no database needed for content
7. **Sentence preloading**: `BookReader` preloads ±3 adjacent sentences into blob cache for seamless playback
