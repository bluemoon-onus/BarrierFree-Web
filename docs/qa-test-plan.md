# BarrierFree-Web QA Test Plan

**Last Updated**: 2026-04-02

## Purpose
This document provides a comprehensive QA testing framework for BarrierFree-Web, an AI-powered accessible eBook reader. It covers all major features including the Text-To-Speech (TTS) engine, mouse zone navigation, keyboard input handling, typo correction API, and UI components.

## Scope
- **Features Tested**: TTS engine, mouse zone detection, keyboard reader, typo-check API, TypingEditor, BookReader, Onboarding, accessibility & layout
- **Browsers**: Chrome (macOS, Windows), Safari (macOS)
- **Device Types**: Desktop only (1024px+ viewport width)
- **API Dependencies**: ANTHROPIC_API_KEY environment variable for typo-check tests

## Test Environment Requirements

### Browser & OS Combinations
- Chrome (Version 120+) on macOS 13+
- Chrome (Version 120+) on Windows 10+
- Safari (Version 16+) on macOS 13+

### Local Setup
1. Clone the repository and install dependencies: `npm install`
2. Set `ANTHROPIC_API_KEY` environment variable with a valid Anthropic API key
3. Ensure Node.js 18+ is installed
4. Have a mouse/trackpad available (not touchscreen-only)
5. Test at minimum 1024px viewport width

### Browser DevTools Access
- Inspect accessibility tree (Elements tab → Accessibility pane)
- Monitor console for errors (Console tab)
- View network requests (Network tab) for typo-check API calls
- Test reduced motion preferences (DevTools → Rendering → prefers-reduced-motion)
- Test high-contrast mode (DevTools → Rendering → prefers-contrast: more)

---

## How to Run Tests

### Manual Testing Steps
1. **Start the development server**:
   ```bash
   npm run dev
   ```
   App should be available at `http://localhost:3000`

2. **For each test scenario**:
   - Read the preconditions
   - Follow the numbered steps exactly
   - Observe the expected result
   - Document any deviations or errors

3. **Use browser DevTools**:
   - Open DevTools with F12 (Windows) or Cmd+Option+I (macOS)
   - Keep Console tab open to watch for errors
   - Use Accessibility Inspector to verify ARIA roles and labels

4. **Test voice output**:
   - Ensure system volume is audible (test with a simple TTS utterance first)
   - Have a way to record audio if needed for bug documentation
   - Test on multiple OS/browser combinations per TTS test

5. **Test keyboard navigation**:
   - Use only keyboard (no mouse) to navigate through the feature
   - Tab through all interactive elements in logical order
   - Verify focus is visible on every interactive element

---

## Known Limitations

### TTS Testing
- **Browser-dependent**: Web Speech API behavior varies between Chrome and Safari. TTS output requires a real browser, not jsdom mocks. Some voices may be unavailable on certain OS versions.
- **Voice selection**: macOS and Windows have different default voices. Tests should pass with any en-US or generic English voice available.
- **No audio API**: Cannot programmatically verify audio waveform; testing relies on human observation and browser device logs.

### API Testing
- **ANTHROPIC_API_KEY required**: Typo-check tests need a valid API key. Set it as an environment variable or the API will return a 500 error with graceful fallback.
- **Network latency**: Timeout tests assume a 5-second abort window; slow networks may cause flakiness.
- **Claude Haiku rate limits**: If running many tests rapidly, the API may throttle requests.

### Accessibility Testing
- **Screen reader compatibility**: These tests focus on ARIA attributes and keyboard navigation. Full screen reader testing (NVDA, JAWS, VoiceOver) should be done separately.
- **Platform specifics**: Some high-contrast color tokens may render differently on Windows vs. macOS.

---

## A. TTS Engine Tests

### TTS-001: Chrome (macOS) produces audio
- **Description**: Web Speech API on Chrome/macOS should synthesize audible speech
- **Preconditions**: App loaded in Chrome on macOS, system volume audible, no other audio playing
- **Steps**:
  1. Open app at `http://localhost:3000`
  2. Wait for TTS to initialize (listen for "welcome guide" intro)
  3. Observe speaker output
- **Expected Result**: Clear, audible English voice speaking the welcome message
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### TTS-002: Chrome (Windows) produces audio
- **Description**: Web Speech API on Chrome/Windows should synthesize audible speech
- **Preconditions**: App loaded in Chrome on Windows, system volume audible
- **Steps**:
  1. Open app at `http://localhost:3000`
  2. Wait for TTS to initialize
  3. Observe speaker output
- **Expected Result**: Clear, audible English voice speaking the welcome message
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### TTS-003: Safari (macOS) produces audio
- **Description**: Web Speech API on Safari/macOS should synthesize audible speech
- **Preconditions**: App loaded in Safari on macOS, system volume audible
- **Steps**:
  1. Open app at `http://localhost:3000`
  2. Wait for TTS to initialize
  3. Observe speaker output
- **Expected Result**: Clear, audible English voice speaking the welcome message
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### TTS-004: English voice is selected correctly
- **Description**: getEnglishVoice() should prefer en-US, fall back to en, then any English variant
- **Preconditions**: App loaded, browser DevTools open (Console tab)
- **Steps**:
  1. In Console, run: `await window.__debug?.getVoices?.()`
  2. Verify the returned voice object has a lang property starting with "en"
  3. Confirm it says "en-US" (preferred) or "en-*" (fallback)
- **Expected Result**: Voice lang is "en-US" or another English variant (e.g., "en-GB", "en-AU")
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### TTS-005: Long text (>100 chars) is split into sentences
- **Description**: speechUtils.splitIntoUtteranceChunks() should break long text at sentence boundaries
- **Preconditions**: App loaded, text to submit in TypingEditor
- **Steps**:
  1. Click the Search zone to open TypingEditor
  2. Type a sentence longer than 100 characters: "The quick brown fox jumps over the lazy dog. This is the second sentence. And here is a third one."
  3. Press Enter to submit
  4. Listen carefully to TTS output
- **Expected Result**: TTS pauses briefly between sentences (speaker may say each sentence distinctly)
- **Severity if failing**: Medium
- [ ] Pass / [ ] Fail

### TTS-006: Priority 'high' interrupts current speech
- **Description**: speak() with priority='high' should cancel ongoing utterances immediately
- **Preconditions**: App with long paragraph ready in BookReader
- **Steps**:
  1. Select a book from the library
  2. BookReader should start reading a paragraph
  3. Before it finishes, press Escape
  4. App should immediately stop the current speech
  5. Move mouse to a new zone
  6. App should speak the new zone announcement immediately (without waiting for prior speech)
- **Expected Result**: Zone announcement is spoken immediately, no overlap with previous paragraph audio
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### TTS-007: stopSpeaking() silences immediately
- **Description**: stopSpeaking() should cancel all pending utterances
- **Preconditions**: BookReader with active speech
- **Steps**:
  1. Select a book and start reading
  2. Wait for the first paragraph to be read
  3. Press Escape to close the BookReader
- **Expected Result**: Speech stops immediately, no trailing words heard
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### TTS-008: pauseSpeaking() and resumeSpeaking() work
- **Description**: pause() and resume() should pause and resume active speech
- **Preconditions**: BookReader with active speech
- **Steps**:
  1. Select a book and start reading a paragraph
  2. Press Space to pause
  3. Listen: speech should stop mid-word
  4. Press Space again to resume
  5. Speech should continue from where it paused
- **Expected Result**: Speech pauses and resumes without repeating text
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### TTS-009: initTTS() resolves after voices are loaded
- **Description**: initTTS() promise should resolve once speechSynthesis.getVoices() returns a non-empty array
- **Preconditions**: Fresh app load, browser DevTools open
- **Steps**:
  1. Open app and wait 2 seconds
  2. In Console, run: `console.log(speechSynthesis.getVoices().length)`
  3. Should return > 0
- **Expected Result**: At least one voice is available after app initialization
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

---

## B. Mouse Zone Tests

### ZONE-001: Moving to upper-left announces 'back' zone
- **Description**: Cursor in upper-left quadrant (x<50%, y<50%) triggers back zone announcement
- **Preconditions**: App loaded, mouse available, speaker volume on, no onboarding blocking
- **Steps**:
  1. Dismiss the onboarding overlay (click anywhere or press Enter)
  2. Move mouse to the top-left corner of the viewport
  3. Remain idle for ~800ms
  4. Listen for zone announcement
- **Expected Result**: Hear "Back zone" or similar announcement
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ZONE-002: Moving to upper-right announces 'forward' zone
- **Description**: Cursor in upper-right quadrant (x≥50%, y<50%) triggers forward zone announcement
- **Preconditions**: App loaded, mouse available, speaker volume on
- **Steps**:
  1. Dismiss onboarding
  2. Move mouse to the top-right corner
  3. Remain idle for ~800ms
- **Expected Result**: Hear "Forward zone" or similar announcement
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ZONE-003: Moving to lower-left announces 'books' zone
- **Description**: Cursor in lower-left area (x<35%, y≥50%) triggers books zone announcement
- **Preconditions**: App loaded, mouse available, speaker volume on
- **Steps**:
  1. Dismiss onboarding
  2. Move mouse to the lower-left area (approximately 20% x, 75% y)
  3. Remain idle for ~800ms
- **Expected Result**: Hear "Books zone" or similar announcement
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ZONE-004: Moving to lower-right announces 'search' zone
- **Description**: Cursor in lower-right area (x≥65%, y≥50%) triggers search zone announcement
- **Preconditions**: App loaded, mouse available, speaker volume on
- **Steps**:
  1. Dismiss onboarding
  2. Move mouse to the lower-right area (approximately 80% x, 75% y)
  3. Remain idle for ~800ms
- **Expected Result**: Hear "Search zone" or similar announcement
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ZONE-005: Moving to bottom-center announces 'home' zone
- **Description**: Cursor in bottom-center area (35%≤x<65%, y≥70%) triggers home zone announcement
- **Preconditions**: App loaded, mouse available, speaker volume on
- **Steps**:
  1. Dismiss onboarding
  2. Move mouse to the bottom-center area (50% x, 85% y)
  3. Remain idle for ~800ms
- **Expected Result**: Hear "Home zone" or similar announcement
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ZONE-006: Idle for 800ms triggers guidance message
- **Description**: Remaining still in a zone for 800ms should trigger "nearby zones" guidance announcement
- **Preconditions**: App loaded, mouse available, speaker volume on
- **Steps**:
  1. Dismiss onboarding
  2. Move mouse to upper-left (back zone)
  3. Keep mouse completely still for at least 1 second
  4. Listen for a second announcement after the zone name
- **Expected Result**: After zone announcement, hear nearby zones (e.g., "Forward zone on the right")
- **Severity if failing**: Medium
- [ ] Pass / [ ] Fail

### ZONE-007: Nearby zones are announced correctly
- **Description**: Nearby zones should be listed in relation to the current zone
- **Preconditions**: App loaded, mouse available, speaker volume on
- **Steps**:
  1. Dismiss onboarding
  2. Move to upper-left (back zone)
  3. Wait for idle guidance
  4. Listen for nearby zone announcements
- **Expected Result**: Should hear mentions of adjacent zones (e.g., "Forward right", "Books down")
- **Severity if failing**: Medium
- [ ] Pass / [ ] Fail

### ZONE-008: Zone highlighting shows visually
- **Description**: Active zone should have a highlight (access-highlight color, green glow)
- **Preconditions**: App loaded, mouse available, DevTools open
- **Steps**:
  1. Dismiss onboarding
  2. Move mouse to upper-left corner and keep still
  3. Inspect the zone button element in DevTools
  4. Check computed styles
- **Expected Result**: Zone button has `bg-access-highlight/12` (light green background) or similar highlight class
- **Severity if failing**: Medium
- [ ] Pass / [ ] Fail

### ZONE-009: Click in 'books' zone opens book list
- **Description**: Clicking the books zone button should navigate to the books view
- **Preconditions**: App loaded, mouse available, in DEFAULT view
- **Steps**:
  1. Dismiss onboarding
  2. Move mouse to lower-left (books zone)
  3. Click on the zone
  4. Observe view change
- **Expected Result**: Books list overlay appears with "Choose a book" heading and 3+ books listed
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### ZONE-010: Click in 'search' zone opens TypingEditor
- **Description**: Clicking the search zone button should open the typing editor
- **Preconditions**: App loaded, mouse available, in DEFAULT view
- **Steps**:
  1. Dismiss onboarding
  2. Move mouse to lower-right (search zone)
  3. Click on the zone
  4. Observe overlay
- **Expected Result**: TypingEditor overlay appears with "Search" title and input prompt
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### ZONE-011: Click in 'home' zone resets view
- **Description**: Clicking the home zone should return to DEFAULT view from any other view
- **Preconditions**: App in BOOKS view (after opening books list)
- **Steps**:
  1. Open books list (click books zone)
  2. Move mouse to bottom-center (home zone)
  3. Click the home zone
  4. Observe view change
- **Expected Result**: Books overlay closes, main page with zones reappears
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ZONE-012: 'D' key toggles debug overlay
- **Description**: Pressing 'D' should toggle the MouseZoneOverlay visibility
- **Preconditions**: App loaded, in DEFAULT view
- **Steps**:
  1. Dismiss onboarding
  2. Press the 'D' key
  3. Observe a debug visualization overlaying the zones
  4. Press 'D' again
  5. Verify the overlay is hidden
- **Expected Result**: Debug overlay appears/disappears on each 'D' press; press 'D' multiple times to toggle on/off
- **Severity if failing**: Low
- [ ] Pass / [ ] Fail

---

## C. Keyboard Reader Tests

### KB-001: Each printable key is spoken with priority='high'
- **Description**: Typing a character should immediately speak that character at high priority
- **Preconditions**: App loaded, TypingEditor open, speaker volume on
- **Steps**:
  1. Click Search zone to open TypingEditor
  2. Type the letter 'A'
  3. Listen for immediate announcement of 'A'
- **Expected Result**: Hear the letter 'A' spoken immediately after pressing the key
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### KB-002: Backspace speaks 'delete' and removes last character
- **Description**: Pressing Backspace should announce 'delete' and remove the last typed character
- **Preconditions**: TypingEditor open with text "hello" already typed
- **Steps**:
  1. Open TypingEditor and type "hello"
  2. Press Backspace
  3. Listen for announcement
  4. Check displayed text
- **Expected Result**: Hear "delete" announcement; displayed text changes from "hello" to "hell"
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### KB-003: Space appends space and speaks 'space'
- **Description**: Pressing Space should add a space character and announce "space"
- **Preconditions**: TypingEditor open with text "hello"
- **Steps**:
  1. Open TypingEditor and type "hello"
  2. Press Space
  3. Listen for announcement
  4. Check displayed text
- **Expected Result**: Hear "space" announcement; displayed text is "hello " (with trailing space)
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### KB-004: Enter submits text to typo-check API
- **Description**: Pressing Enter should submit text to /api/typo-check and set isProcessing=true
- **Preconditions**: TypingEditor open, ANTHROPIC_API_KEY set, network request logging enabled
- **Steps**:
  1. Open TypingEditor and type "hello"
  2. Press Enter
  3. Check DevTools Network tab
  4. Observe processing state (message should change)
- **Expected Result**: POST request to /api/typo-check sent with { text: "hello" }; UI shows "CHECKING" state
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### KB-005: Escape clears text and speaks 'Input cleared'
- **Description**: Pressing Escape should clear all typed text and announce "Input cleared"
- **Preconditions**: TypingEditor open with text typed
- **Steps**:
  1. Open TypingEditor and type "hello"
  2. Press Escape
  3. Listen for announcement
  4. Check displayed text
- **Expected Result**: Hear "Input cleared"; displayed text is empty (returns to "Type to search..." placeholder)
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### KB-006: Keystrokes ignored when isProcessing=true
- **Description**: While the API is processing, typed keys should be ignored (except Escape)
- **Preconditions**: TypingEditor open, text submitted, API call pending
- **Steps**:
  1. Open TypingEditor and type "aplle" (typo on purpose)
  2. Press Enter to submit
  3. While "CHECKING" state is active, press 'X'
  4. Check displayed text and mode
- **Expected Result**: Text does not change; remains "aplle"; Escape still works to cancel
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### KB-007: Confirming state: Enter accepts correction
- **Description**: In CONFIRMING state, pressing Enter should accept the corrected text
- **Preconditions**: TypingEditor showing a typo correction (e.g., "aplle" → "apple")
- **Steps**:
  1. Open TypingEditor and type "aplle"
  2. Press Enter (triggers correction)
  3. Wait for "Did you mean apple?" message
  4. Press Enter again
  5. Check result
- **Expected Result**: Correction is accepted; TypingEditor closes; main page shows "Search: apple" (or similar)
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### KB-008: Confirming state: Space retries input
- **Description**: In CONFIRMING state, pressing Space should clear and return to listening mode
- **Preconditions**: TypingEditor showing a typo correction
- **Steps**:
  1. Open TypingEditor and type "aplle"
  2. Press Enter (triggers correction)
  3. Wait for "Did you mean apple?" message
  4. Press Space
  5. Check mode
- **Expected Result**: Text is cleared; returns to TYPING/LISTENING state; can type a new query
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

---

## D. Typo Correction API Tests

### API-001: Valid input 'hello' returns hasTypo=false
- **Description**: Correct input should return hasTypo: false, corrected === original
- **Preconditions**: App loaded, ANTHROPIC_API_KEY set, network tab open
- **Steps**:
  1. Open TypingEditor
  2. Type "hello"
  3. Press Enter
  4. Check Network tab → response body
- **Expected Result**: Response includes `{ hasTypo: false, original: "hello", corrected: "hello" }`
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### API-002: Input 'aplle' returns hasTypo=true, corrected='apple'
- **Description**: Typo input should return hasTypo: true with corrected spelling
- **Preconditions**: App loaded, ANTHROPIC_API_KEY set
- **Steps**:
  1. Open TypingEditor
  2. Type "aplle"
  3. Press Enter
  4. Check Network tab response
- **Expected Result**: Response includes `{ hasTypo: true, original: "aplle", corrected: "apple" }`
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### API-003: Input 'recieve' returns hasTypo=true, corrected='receive'
- **Description**: Common spelling mistake should be corrected
- **Preconditions**: App loaded, ANTHROPIC_API_KEY set
- **Steps**:
  1. Open TypingEditor
  2. Type "recieve"
  3. Press Enter
  4. Check response
- **Expected Result**: Response includes corrected: "receive"
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### API-004: Input 'teh' returns hasTypo=true, corrected='the'
- **Description**: Single-letter typo should be corrected
- **Preconditions**: App loaded, ANTHROPIC_API_KEY set
- **Steps**:
  1. Open TypingEditor
  2. Type "teh"
  3. Press Enter
  4. Check response
- **Expected Result**: Response includes corrected: "the"
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### API-005: Empty string returns 400 error response
- **Description**: Empty or whitespace-only text should return 400 with error message
- **Preconditions**: TypingEditor open, Network tab open
- **Steps**:
  1. Open TypingEditor
  2. Type nothing (or only spaces)
  3. Press Enter
  4. Check Network tab
- **Expected Result**: Response status is 400; body includes `{ error: "Text is required" }` or similar
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### API-006: Text > 500 chars returns 400 error response
- **Description**: Overly long input should be rejected
- **Preconditions**: TypingEditor open
- **Steps**:
  1. Open TypingEditor
  2. Generate 501+ character string (e.g., "a" repeated 501 times)
  3. Type or paste it
  4. Press Enter
  5. Check Network tab
- **Expected Result**: Response status is 400; body includes `{ error: "Text must be under 500 characters" }`
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### API-007: Missing ANTHROPIC_API_KEY returns graceful 500 error
- **Description**: If API key is not set, endpoint should return 500 with graceful fallback (hasTypo: false, original text returned)
- **Preconditions**: ANTHROPIC_API_KEY unset (simulate by removing it temporarily if possible)
- **Steps**:
  1. Unset ANTHROPIC_API_KEY environment variable
  2. Restart dev server
  3. Open TypingEditor and type "hello"
  4. Press Enter
  5. Check Network response
- **Expected Result**: Response status is 500; body includes `{ hasTypo: false, original: "hello", corrected: "hello", error: "Failed to check text" }`; app does not crash
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### API-008: Gibberish input handles gracefully
- **Description**: Non-dictionary gibberish should not cause a crash
- **Preconditions**: App loaded, ANTHROPIC_API_KEY set
- **Steps**:
  1. Open TypingEditor
  2. Type "xyzqwerty"
  3. Press Enter
  4. Check response and UI state
- **Expected Result**: Response returns (either hasTypo: true/false); no console errors; UI remains stable
- **Severity if failing**: Medium
- [ ] Pass / [ ] Fail

### API-009: Request timeout after 5 seconds
- **Description**: If Claude Haiku API takes >5 seconds, request should abort and return 500
- **Preconditions**: App loaded, simulated network throttling (or slow API)
- **Steps**:
  1. Open DevTools → Network tab → Throttle (set to Slow 3G or Offline)
  2. Open TypingEditor and type "hello"
  3. Press Enter
  4. Wait 5+ seconds
  5. Check Network response
- **Expected Result**: Request aborts after ~5 seconds; response is 500 with timeout error message or graceful fallback
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

---

## E. TypingEditor UI Tests

### TE-001: Opens when search zone is clicked
- **Description**: Clicking search zone should open the TypingEditor overlay
- **Preconditions**: App in DEFAULT view
- **Steps**:
  1. Dismiss onboarding
  2. Click the lower-right zone (Search)
  3. Observe overlay
- **Expected Result**: TypingEditor overlay appears with modal dialog backdrop
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### TE-002: IDLE state shows cursor blink and "Type to search..." prompt
- **Description**: On open, TypingEditor should show placeholder and blinking cursor
- **Preconditions**: TypingEditor just opened
- **Steps**:
  1. Open TypingEditor (click Search zone)
  2. Observe the main text area
- **Expected Result**: Large empty text area with placeholder "Type to search..." and a blinking vertical cursor line
- **Severity if failing**: Medium
- [ ] Pass / [ ] Fail

### TE-003: TYPING state displays typed text in large font
- **Description**: As user types, text should appear in large, readable font
- **Preconditions**: TypingEditor open
- **Steps**:
  1. Open TypingEditor
  2. Type "hello world"
  3. Observe text display
- **Expected Result**: Text appears in large font (4xl or 5xl); placeholder disappears; cursor visible
- **Severity if failing**: Medium
- [ ] Pass / [ ] Fail

### TE-004: CHECKING state shows spinner and "Checking your input..." message
- **Description**: During API call, UI should indicate processing
- **Preconditions**: TypingEditor open with text, ready to submit
- **Steps**:
  1. Open TypingEditor and type "hello"
  2. Press Enter
  3. Observe UI immediately
- **Expected Result**: Status text changes to "CHECKING"; spinner animation visible (or pulse effect); input area dims
- **Severity if failing**: Medium
- [ ] Pass / [ ] Fail

### TE-005: CONFIRMING state shows correction with "Did you mean X?"
- **Description**: When a typo is detected, show correction and prompt for confirmation
- **Preconditions**: Submit text with a typo (e.g., "aplle")
- **Steps**:
  1. Open TypingEditor and type "aplle"
  2. Press Enter
  3. Wait for response with typo detected
  4. Observe overlay
- **Expected Result**: Status changes to "CONFIRMING"; shows "Did you mean apple?"; displays the corrected word in a box
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### TE-006: COMPLETE state triggers onSearch callback and closes
- **Description**: After accepting a correction or correct input, editor should close and call onSearch
- **Preconditions**: Typo correction displayed or correct input processed
- **Steps**:
  1. Open TypingEditor and type "hello"
  2. Press Enter (no typo)
  3. Observe the editor state
  4. Wait ~200ms
- **Expected Result**: Editor closes automatically; main page shows the search result; no errors in console
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### TE-007: Close button (✕/Esc) dismisses the editor
- **Description**: Pressing Escape or clicking close button should exit the editor
- **Preconditions**: TypingEditor open
- **Steps**:
  1. Open TypingEditor
  2. Press Escape key
  3. Observe overlay
- **Expected Result**: Editor closes immediately; returns to DEFAULT view; no text submitted
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### TE-008: aria-live region updates for screen readers
- **Description**: Dynamic status text should use aria-live for SR announcements
- **Preconditions**: DevTools Accessibility Inspector open
- **Steps**:
  1. Open TypingEditor
  2. In DevTools, find the status text element (id="typing-editor-status")
  3. Inspect its ARIA attributes
- **Expected Result**: Element has `aria-live="polite"` and `aria-atomic="true"`
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### TE-009: Animated cursor has aria-hidden="true"
- **Description**: Decorative cursor animation should not be announced by screen readers
- **Preconditions**: DevTools open, TypingEditor showing IDLE state with cursor
- **Steps**:
  1. Open TypingEditor (IDLE state)
  2. In DevTools, inspect the blinking cursor element (span with animation)
- **Expected Result**: Element has `aria-hidden="true"` attribute
- **Severity if failing**: Medium
- [ ] Pass / [ ] Fail

---

## F. BookReader Tests

### BR-001: Book list shows 3+ books from books.json
- **Description**: Clicking Books zone should display a list of available books
- **Preconditions**: App in DEFAULT view
- **Steps**:
  1. Dismiss onboarding
  2. Click Books zone (lower-left)
  3. Observe the book list overlay
- **Expected Result**: List displays 3 or more books with title, author, and chapter information
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### BR-002: Selecting a book starts TTS with "Now reading: [title]"
- **Description**: Clicking a book should announce the title and start reading
- **Preconditions**: Book list open
- **Steps**:
  1. Open Books list
  2. Click on any book
  3. Listen for announcement
  4. Wait for reading to begin
- **Expected Result**: Hear "Now reading: [book title]" announcement; reading begins shortly after
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### BR-003: Paragraphs read sequentially with 500ms gap
- **Description**: Each paragraph should have a 500ms delay before the next one starts
- **Preconditions**: BookReader active and reading
- **Steps**:
  1. Select a book (watch the first paragraph)
  2. Listen to the timing between paragraphs
  3. Count approximate gap duration
- **Expected Result**: Audible gap of roughly 500ms between end of one paragraph and start of next
- **Severity if failing**: Low
- [ ] Pass / [ ] Fail

### BR-004: Space key pauses/resumes reading
- **Description**: Pressing Space toggles pause/resume state
- **Preconditions**: BookReader with active reading
- **Steps**:
  1. Select a book and start reading
  2. Wait for a paragraph to be read
  3. Press Space
  4. Listen: speech should stop mid-word or after current utterance
  5. Press Space again
  6. Speech should resume
- **Expected Result**: Speech pauses; "Paused" status shown; resume on Space; speech continues
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### BR-005: Escape key stops reading and calls onClose
- **Description**: Pressing Escape should exit the reader and return to books list
- **Preconditions**: BookReader active
- **Steps**:
  1. Select a book and start reading
  2. Press Escape
  3. Observe view change
- **Expected Result**: Reader closes; returns to Books list view; no errors in console
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### BR-006: Right arrow skips to next paragraph
- **Description**: Pressing → arrow key should advance to the next paragraph
- **Preconditions**: BookReader showing first paragraph
- **Steps**:
  1. Select a book (should show paragraph 1)
  2. Press Right arrow key
  3. Observe paragraph display
- **Expected Result**: Paragraph counter increments; next paragraph text displays; TTS reads the new paragraph
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### BR-007: Left arrow goes back one paragraph
- **Description**: Pressing ← arrow key should go to the previous paragraph
- **Preconditions**: BookReader showing paragraph 2 or later
- **Steps**:
  1. Select a book and press Right arrow to advance to paragraph 2
  2. Press Left arrow key
  3. Observe paragraph display
- **Expected Result**: Paragraph counter decrements; previous paragraph text displays; TTS reads it
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### BR-008: Progress counter shows "Paragraph N of M"
- **Description**: Paragraph counter should display current position
- **Preconditions**: BookReader active
- **Steps**:
  1. Select a book
  2. Observe the paragraph counter text
  3. Press Right arrow
  4. Observe counter update
- **Expected Result**: Counter displays "Paragraph 1 of [total]", then "Paragraph 2 of [total]", etc.
- **Severity if failing**: Medium
- [ ] Pass / [ ] Fail

### BR-009: aria-live on paragraph counter and current text
- **Description**: Dynamic text updates should use aria-live regions
- **Preconditions**: DevTools Accessibility Inspector open, BookReader active
- **Steps**:
  1. Select a book
  2. In DevTools, find the paragraph counter element
  3. Inspect its ARIA attributes
  4. Also inspect the paragraph text element
- **Expected Result**: Both elements have `aria-live="polite"` and `aria-atomic="true"`
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

---

## G. Onboarding Tests

### OB-001: First visit shows onboarding overlay
- **Description**: On first page load, onboarding should display (no localStorage flag)
- **Preconditions**: Fresh app load (clear localStorage first if needed)
- **Steps**:
  1. Clear browser localStorage: `localStorage.clear()`
  2. Refresh the page
  3. Observe overlay
- **Expected Result**: Onboarding dialog appears with "Welcome Guide" heading
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### OB-002: TTS plays welcome → instructions → startPrompt sequentially
- **Description**: Onboarding should speak 3 messages in order
- **Preconditions**: Onboarding visible, speaker volume on
- **Steps**:
  1. Open onboarding (fresh load)
  2. Listen to the audio sequence
  3. Note the time between messages
- **Expected Result**: Hear welcome message, then instructions, then start prompt, with pauses between each
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### OB-003: Click anywhere dismisses onboarding
- **Description**: Clicking the overlay should close it immediately
- **Preconditions**: Onboarding visible
- **Steps**:
  1. Click on the onboarding dialog
  2. Observe overlay
- **Expected Result**: Onboarding closes with fade-out animation; main page revealed
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### OB-004: Keypress dismisses onboarding
- **Description**: Pressing any key should close onboarding
- **Preconditions**: Onboarding visible (fresh load)
- **Steps**:
  1. Press any key (e.g., Space, 'A', Enter)
  2. Observe overlay
- **Expected Result**: Onboarding closes; main page revealed
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### OB-005: "Get Started" button dismisses onboarding
- **Description**: Clicking "Get Started" button should close onboarding
- **Preconditions**: Onboarding visible
- **Steps**:
  1. Locate and click the "Get Started" button
  2. Observe overlay
- **Expected Result**: Onboarding closes; main page revealed
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### OB-006: After dismiss, localStorage flag set and main page focused
- **Description**: After dismissal, localStorage should be set to prevent re-showing, and focus should move to main page
- **Preconditions**: Onboarding just dismissed
- **Steps**:
  1. Dismiss onboarding
  2. In Console, run: `localStorage.getItem('BarrierFree-Web_onboarded')`
  3. Check that it returns 'true'
  4. Tab through the page; verify main content is focusable
- **Expected Result**: localStorage has the flag set; main page is focused and Tab navigation works
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### OB-007: Second visit skips onboarding
- **Description**: On second page load, onboarding should not appear (flag present)
- **Preconditions**: Onboarding was dismissed on first visit (localStorage flag set)
- **Steps**:
  1. Dismiss onboarding (ensures flag is set)
  2. Refresh the page
  3. Observe overlay
- **Expected Result**: Main page loads immediately; no onboarding overlay
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### OB-008: "Replay Guide" button in NavigationBar re-triggers onboarding
- **Description**: Clicking "Replay Guide" should show onboarding again
- **Preconditions**: App loaded past onboarding, NavigationBar visible
- **Steps**:
  1. Dismiss onboarding
  2. Locate the "Replay Guide" or "Help" button in the top nav
  3. Click it
  4. Observe overlay
- **Expected Result**: Onboarding overlay reappears; audio plays again
- **Severity if failing**: Medium
- [ ] Pass / [ ] Fail

---

## H. Accessibility & Layout Tests

### ACC-001: Skip-to-content link visible on Tab focus
- **Description**: A skip link should be visible when Tab focuses it
- **Preconditions**: App loaded, no overlay visible
- **Steps**:
  1. Press Tab to cycle focus through page elements
  2. First focusable element should be a skip link
  3. Observe if it's visible
- **Expected Result**: Skip link is visible and announces something like "Skip to main content"
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ACC-002: All interactive elements reachable via Tab in logical order
- **Description**: Using Tab key alone, should be able to reach all buttons and interactive elements
- **Preconditions**: App in DEFAULT view, no overlays
- **Steps**:
  1. Press Tab repeatedly to cycle through all interactive elements
  2. Note the order: should be top to bottom, left to right (roughly)
  3. Verify each zone button is reachable
- **Expected Result**: All 5 zone buttons (back, forward, books, search, home) are focusable in a logical order; no traps
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ACC-003: All zone divs have role="button" and tabIndex=0
- **Description**: Zone buttons should have proper ARIA roles for keyboard activation
- **Preconditions**: DevTools Accessibility Inspector open
- **Steps**:
  1. Inspect any zone button element
  2. Check its attributes in Accessibility panel
- **Expected Result**: Element shows role="button" and tabIndex="0" (or similar)
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ACC-004: Enter/Space activates zone click handlers
- **Description**: When a zone button is focused, Enter or Space should activate it
- **Preconditions**: A zone button is focused (Tab to it)
- **Steps**:
  1. Press Tab until a zone button has focus (visible outline)
  2. Press Enter or Space
  3. Observe action
- **Expected Result**: Zone is activated (e.g., Books zone opens the list); no page scroll or default action
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### ACC-005: Escape closes all overlays
- **Description**: Escape key should close the topmost overlay from any view
- **Preconditions**: Any overlay open (books, reader, typing editor)
- **Steps**:
  1. Open an overlay (e.g., books list)
  2. Press Escape
  3. Observe view
- **Expected Result**: Overlay closes; returns to previous view
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ACC-006: All buttons have aria-label
- **Description**: Buttons without visible text should have descriptive aria-label
- **Preconditions**: DevTools Accessibility Inspector open
- **Steps**:
  1. Find a close button (e.g., the 'Esc' button in BookReader)
  2. Inspect its attributes
- **Expected Result**: Element has `aria-label="Close reader"` or similar descriptive label
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ACC-007: No text below 18px (text-lg minimum)
- **Description**: All interactive text and body text should be at least 18px (text-lg in Tailwind)
- **Preconditions**: DevTools open, browser viewport at 1024px+
- **Steps**:
  1. Inspect various text elements (paragraph, button labels, hints)
  2. Check computed font-size in Styles tab
- **Expected Result**: All body text is ≥ 18px (1.125rem or larger)
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ACC-008: All interactive elements ≥ 44x44px click target
- **Description**: Buttons and clickable areas should meet WCAG minimum touch target size
- **Preconditions**: DevTools open
- **Steps**:
  1. Inspect a zone button or dialog close button
  2. Check its computed width and height in the Layout section
- **Expected Result**: Element is at least 44x44px (may include padding)
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ACC-009: No layout breakage at 1024px+ viewport width
- **Description**: Zones and overlays should not break, wrap incorrectly, or overflow at 1024px
- **Preconditions**: Browser viewport set to 1024px width
- **Steps**:
  1. Resize viewport to exactly 1024px width
  2. Load app and navigate through all views
  3. Open overlays
  4. Check for overflow, text clipping, or misalignment
- **Expected Result**: All elements render cleanly at 1024px; no horizontal scrollbars; text is readable
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### ACC-010: No console errors on initial page load
- **Description**: Launching the app should not produce JavaScript errors
- **Preconditions**: DevTools Console tab open, app fresh load
- **Steps**:
  1. Open DevTools Console
  2. Refresh page
  3. Wait for page to fully load
  4. Review Console for errors (red icons)
- **Expected Result**: No error messages in console; only info/warnings are acceptable
- **Severity if failing**: Critical
- [ ] Pass / [ ] Fail

### ACC-011: prefers-reduced-motion: animations disabled
- **Description**: If user has prefers-reduced-motion set, animations should be disabled
- **Preconditions**: DevTools open, Rendering pane available
- **Steps**:
  1. In DevTools → Rendering → check "Emulate CSS media feature prefers-reduced-motion: reduce"
  2. Reload app
  3. Dismiss onboarding
  4. Observe cursor blink in TypingEditor (if visible)
  5. Open overlays and note animations
- **Expected Result**: No animations play; cursor does not blink; overlays appear instantly (no fade/scale)
- **Severity if failing**: High
- [ ] Pass / [ ] Fail

### ACC-012: prefers-contrast: enhanced borders visible
- **Description**: If user has prefers-contrast set to more, focus outlines and borders should be enhanced
- **Preconditions**: DevTools open, Rendering pane available
- **Steps**:
  1. In DevTools → Rendering → check "Emulate CSS media feature prefers-contrast: more"
  2. Reload app
  3. Press Tab to focus interactive elements
  4. Observe focus outlines
- **Expected Result**: Focus outlines are prominent (thick, bright color); high contrast with background
- **Severity if failing**: Medium
- [ ] Pass / [ ] Fail

---

## QA Run Results Template

Use the following template to document test runs:

```
## QA Run — [YYYY-MM-DD]
### Summary
- Tests Written: [X]
- Tests Passed: [X]
- Tests Failed: [X]
- Bugs Found: [X] ([Y] Critical, [Z] High, ...)

### Failed Tests
- [TTS-001] Chrome (macOS) produces audio
  - **Bug ID**: BUG-001
  - **Issue**: [description]

### Bugs Fixed This Run
- BUG-001: [description and resolution]

### Outstanding Issues
- [Non-critical bug] ([Bug ID]): [description and recommended fix]
```

---

## Test Execution Notes

- **Duration**: Expect 2-3 hours for a complete manual test run
- **Browser switching**: Allocate 15 minutes per browser/OS combination for TTS tests
- **Network testing**: Use DevTools throttling (Slow 3G) to simulate timeout conditions
- **API testing**: Monitor the Network tab closely to verify request/response payloads
- **Accessibility**: Use both keyboard navigation and DevTools Accessibility Inspector for validation

---

## Document Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-02 | 1.0 | Initial comprehensive QA test plan created |
