type Zone = 'back' | 'forward' | 'books' | 'search' | 'home';

const voiceDictionary = {
  onboarding: {
    welcome:
      'Welcome to AccessReader. This website is designed for voice-guided navigation.',
    instructions:
      'The screen is divided into five zones. Upper left: go back. Upper right: go forward. Lower left: browse books. Lower right: search. Bottom center: home.',
    startPrompt: 'You can start by moving your mouse now.',
  },

  zones: {
    back: {
      enter: 'Back zone.',
      idle: 'You are in the Back zone. Click to go back. Move right for Forward. Move down for Books.',
      click: 'Going back.',
    },
    forward: {
      enter: 'Forward zone.',
      idle: 'You are in the Forward zone. Click to go forward. Move left for Back. Move down for Search.',
      click: 'Going forward.',
    },
    books: {
      enter: 'Books zone.',
      idle: 'You are in the Books zone. Click to browse books. Move right for Home. Move up for Back.',
      click: 'Opening book list.',
    },
    search: {
      enter: 'Search zone.',
      idle: 'You are in the Search zone. Click to open search. Move left for Home. Move up for Forward.',
      click: 'Opening search.',
    },
    home: {
      enter: 'Home zone.',
      idle: 'You are in the Home zone. Click to go home. Move left for Books. Move right for Search.',
      click: 'Going home.',
    },
  } as Record<Zone, { enter: string; idle: string; click: string }>,

  navigation: {
    direction: (targetZone: string, direction: string): string =>
      `Move ${direction} for ${targetZone}.`,
  },

  keyboard: {
    keyPress: (key: string): string => key,
    enter: 'Checking your input.',
    escape: 'Input cleared.',
    space: 'space',
    backspace: 'delete',
  },

  typoCorrection: {
    checking: 'Checking your input.',
    noTypo: (text: string): string =>
      `Your input looks correct. Searching for: ${text}.`,
    hasTypo: (original: string, corrected: string): string =>
      `Did you mean "${corrected}" instead of "${original}"? Press Enter to accept, or Space to retype.`,
    accepted: (corrected: string): string =>
      `Corrected to ${corrected}. Searching now.`,
    retry: "Let's try again.",
    error: 'Something went wrong. Please try again.',
  },

  bookReader: {
    nowReading: (title: string, chapter: string): string =>
      `Now reading: ${title}, ${chapter}. Press Space to pause. Press Escape to stop and return to books.`,
    paused: 'Paused.',
    resumed: 'Resuming.',
    stopped: 'Stopped. Returning to book list.',
    nextParagraph: 'Next paragraph.',
    prevParagraph: 'Previous paragraph.',
  },

  typingEditor: {
    title: 'Search',
    idle: 'Type to search...',
    listening: 'Listening...',
    checking: 'Checking your input...',
    confirming: 'Did you mean this?',
    complete: 'Searching now.',
    acceptHint: 'Press Enter to accept.',
    retryHint: 'Press Space to type again.',
    close: 'Close search',
    originalLabel: 'Original input',
    correctedLabel: 'Suggested correction',
    lastKeyLabel: 'Last key',
  },
};

export type { Zone };
export default voiceDictionary;
