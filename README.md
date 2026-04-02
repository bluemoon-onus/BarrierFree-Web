# BarrierFree-Web

BarrierFree-Web is an accessible eBook reader built with Next.js 14, TypeScript, and Tailwind CSS. It uses the browser's Web Speech API to provide high-contrast, voice-guided navigation for desktop users who benefit from spoken interaction cues.

## Features

- Voice-guided five-zone mouse navigation for back, forward, books, search, and home
- Keyboard-driven search input with spoken key feedback
- Claude Haiku typo correction through a Vercel API route
- Public-domain sample books with spoken paragraph-by-paragraph reading
- High-contrast visual design with focus styling and reduced-motion support

## Setup

1. Clone the repository:

```bash
git clone https://github.com/bluemoon-onus/BarrierFree-Web.git
cd BarrierFree-Web
```

2. Install dependencies:

```bash
npm install
```

3. Add environment variables:

```bash
cp .env.example .env.local
```

Set `ANTHROPIC_API_KEY` in `.env.local` with your Anthropic API key.

4. Start the development server:

```bash
npm run dev
```

5. Open the app in your browser:

```text
http://localhost:3000
```

## Deployment

Deploy with Vercel from the project root:

```bash
vercel
```

For a production deployment:

```bash
vercel --prod
```

Make sure `ANTHROPIC_API_KEY` is configured in Vercel before promoting to production:

```bash
vercel env add ANTHROPIC_API_KEY
```

## Browser Requirements

- Desktop Chrome on macOS or Windows
- Desktop Safari on macOS
- A browser with Web Speech API `speechSynthesis` support

Mobile and tablet layouts are not yet a primary target for this MVP.

## Architecture Overview

BarrierFree-Web is a Next.js App Router application with a client-side accessibility layer built from focused hooks and components:

- `useMouseZone` tracks the viewport zones and drives spoken navigation guidance.
- `useKeyboardReader` turns keyboard input into a voiced typing workflow.
- `useTTS` and `speechUtils.ts` centralize all browser speech synthesis access.
- `/api/typo-check` calls Claude Haiku for typo correction only.
- Static books are served from `public/books/books.json` and rendered in the in-app reader.

## Project Structure

```text
src/app/page.tsx                Main five-zone navigation page
src/components/TypingEditor.tsx Search overlay with typo correction flow
src/components/BookReader.tsx   Spoken book reader
src/components/Onboarding.tsx   First-visit onboarding guide
src/hooks/useMouseZone.ts       Mouse zone detection logic
src/hooks/useKeyboardReader.ts  Keyboard input reader
src/hooks/useTTS.ts             TTS React wrapper
src/lib/speechUtils.ts          Browser speech utilities
src/lib/voiceDictionary.ts      Spoken text dictionary
```
