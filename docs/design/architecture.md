# Architecture Design — AccessReader

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                  Browser (Client)                 │
│                                                   │
│  ┌─────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Mouse   │  │ Keyboard │  │ OpenAI TTS API │  │
│  │ Tracker │  │ Reader   │  │ (HTMLAudio+MP3)│  │
│  └────┬────┘  └────┬─────┘  └───────┬────────┘  │
│       │            │                │             │
│  ┌────▼────────────▼────────────────▼──────────┐ │
│  │              React App (Next.js)             │ │
│  │                                              │ │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │ │
│  │  │ useMouse │ │ useKeybd │ │ useTTS      │  │ │
│  │  │ Zone     │ │ Reader   │ │ (hook)      │  │ │
│  │  └──────────┘ └──────────┘ └─────────────┘  │ │
│  │                                              │ │
│  │  ┌──────────────────────────────────────┐    │ │
│  │  │ Pages                                │    │ │
│  │  │  • Home (4-zone navigation)          │    │ │
│  │  │  • BookReader (TTS playback)         │    │ │
│  │  │  • Search (typing + typo correction) │    │ │
│  │  └──────────────────────────────────────┘    │ │
│  └──────────────────────────────────────────────┘ │
│                        │                          │
└────────────────────────┼──────────────────────────┘
                         │ POST /api/typo-check        POST /api/tts
                         ▼                                  ▼
               ┌──────────────────┐             ┌──────────────────┐
               │  Vercel API Route │             │  Vercel API Route │
               │  (Edge Function)  │             │  (Node Runtime)   │
               └────────┬─────────┘             └────────┬─────────┘
                        │                                 │
                        ▼                                 ▼
               ┌──────────────────┐             ┌──────────────────┐
               │  Anthropic API    │             │  OpenAI TTS API   │
               │  (Claude Haiku)   │             │  (tts-1 / hd)     │
               └──────────────────┘             └──────────────────┘
```

## Mouse 4-Zone Navigation Model

```
┌─────────────────┬─────────────────┐
│                 │                  │
│   ZONE 1        │   ZONE 2        │
│   ← Back        │   Forward →     │
│                 │                  │
│  (upper-left)   │  (upper-right)  │
├────────┬────────┴────────┬────────┤
│        │                 │        │
│ ZONE 3 │    ZONE 5       │ ZONE 4 │
│ Menu 1 │    Home (●)     │ Menu 2 │
│ Books  │                 │ Search │
│        │  (bottom-center)│        │
│(lower- │                 │(lower- │
│ left)  │                 │ right) │
└────────┴─────────────────┴────────┘
```

### Zone Detection Logic
```typescript
type Zone = 'back' | 'forward' | 'books' | 'search' | 'home';

function getZone(x: number, y: number, w: number, h: number): Zone {
  const midX = w / 2;
  const midY = h / 2;
  const centerMargin = w * 0.15; // 15% margin for center zone

  if (y < midY) {
    return x < midX ? 'back' : 'forward';
  } else {
    if (x > midX - centerMargin && x < midX + centerMargin && y > h * 0.7) {
      return 'home';
    }
    return x < midX ? 'books' : 'search';
  }
}
```

### Mouse Idle Voice Guidance
- Mouse stops moving for 800ms → announce current zone
- Also announce nearest adjacent zones: "Move left for Books, move right for Search"
- Mouse enters new zone → announce zone name immediately

## Voice Guidance Flow

### 1. Page Load (Onboarding)
```
"Welcome to AccessReader. This website is designed for voice-guided navigation.
 Move your mouse to explore. The screen is divided into zones.
 Upper left: go back. Upper right: go forward.
 Lower left: browse books. Lower right: search.
 Bottom center: home. You can start by moving your mouse now."
```

### 2. Mouse Navigation
```
[mouse idle in upper-left]
→ "You are in the Back zone. Click to go back.
   Move right for Forward. Move down for Books."

[mouse moves to lower-right]
→ "Search zone. Click to open search.
   Move left for Home. Move up for Forward."
```

### 3. Typing in Search
```
[user types 'h'] → "h"
[user types 'e'] → "e"
[user types 'l'] → "l"
[user types 'l'] → "l"
[user types 'o'] → "o"
[user presses Enter]
→ sends "hello" to /api/typo-check
→ "Your input looks correct. Searching for: hello"
   OR
→ "Did you mean 'apple' instead of 'aplle'? Press Enter to accept, Space to retype."
[user presses Enter] → "Corrected to apple. Searching now."
[user presses Space] → "Let's try again." (focus returns to editor, cleared)
```

### 4. Book Reading
```
[user selects a book]
→ "Now reading: Alice in Wonderland, Chapter 1.
   Press Space to pause. Press Escape to stop and return to books."
[TTS reads book content paragraph by paragraph]
```

## API Design

### POST /api/typo-check
```typescript
// Request
{ text: string }

// Response
{
  hasTypo: boolean;
  original: string;
  corrected: string;    // same as original if no typo
  explanation: string;  // human-readable, will be spoken
}
```

## Supabase (Optional, for v1.1)
- Table: `user_preferences`
  - `id`, `voice_rate`, `voice_pitch`, `voice_name`, `created_at`
- Purpose: persist voice settings across sessions
- Not needed for MVP v1.0

## Browser Compatibility
| Feature | Chrome (Win/Mac) | Safari (Mac) |
|---------|-----------------|--------------|
| HTMLAudioElement (MP3) | ✅ | ✅ |
| fetch (OpenAI TTS route) | ✅ | ✅ |
| mousemove events | ✅ | ✅ |
| keydown events | ✅ | ✅ |
| Vercel deploy | ✅ | ✅ |
