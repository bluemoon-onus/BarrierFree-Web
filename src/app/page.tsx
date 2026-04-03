'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { BookReader } from '@/components/BookReader';
import { SettingsButton } from '@/components/SettingsButton';
import { type Book, loadBooks } from '@/lib/books';
import { useTTS } from '@/hooks/useTTS';
import { TTS_BLOCKED_EVENT, prewarm } from '@/lib/speechUtils';
import voiceDictionary from '@/lib/voiceDictionary';

type AppState = 'WELCOME' | 'LIBRARY' | 'READING';

export default function HomePage() {
  const { speak } = useTTS();

  const [appState, setAppState] = useState<AppState>('WELCOME');
  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoaded, setBooksLoaded] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [focusedLibraryIndex, setFocusedLibraryIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[] | null>(null);

  const getStartedRef = useRef<HTMLButtonElement | null>(null);
  const libraryListRef = useRef<HTMLOListElement | null>(null);
  const hasAnnouncedLibraryRef = useRef(false);
  const speakRef = useRef(speak);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchTokenRef = useRef(0);

  speakRef.current = speak;

  // Load books on mount
  useEffect(() => {
    void loadBooks()
      .then((loaded) => {
        setBooks(loaded);
        setBooksLoaded(true);
      })
      .catch(() => {
        setBooksLoaded(true);
      });
  }, []);

  // WELCOME: pre-warm greeting audio in background so it plays instantly
  useEffect(() => {
    if (appState !== 'WELCOME') return;
    void prewarm([voiceDictionary.welcome.greeting, voiceDictionary.welcome.getStarted]);
  }, [appState]);

  // WELCOME: focus button + speak greeting.
  // Safari speaks immediately. Chrome requires a user gesture — we detect the
  // "not-allowed" block via TTS_BLOCKED_EVENT and re-speak on the first interaction.
  useEffect(() => {
    if (appState !== 'WELCOME') return;

    const focusId = window.setTimeout(() => getStartedRef.current?.focus(), 100);

    // Track whether the greeting has been successfully queued this session
    let announced = false;
    const announce = () => {
      if (announced) return;
      announced = true;
      void speakRef.current(voiceDictionary.welcome.greeting, { priority: 'high' });
    };

    // Attempt immediately (Safari + Chrome with prior activation)
    announce();

    // Chrome autoplay fallback: reset and re-announce on first user interaction
    let interactionCleanup: (() => void) | null = null;
    const onBlocked = () => {
      announced = false; // allow re-announcement
      const onInteraction = () => {
        announce();
        interactionCleanup = null;
      };
      document.addEventListener('keydown', onInteraction, { once: true });
      document.addEventListener('pointerdown', onInteraction, { once: true });
      interactionCleanup = () => {
        document.removeEventListener('keydown', onInteraction);
        document.removeEventListener('pointerdown', onInteraction);
      };
    };
    window.addEventListener(TTS_BLOCKED_EVENT, onBlocked, { once: true });

    return () => {
      window.clearTimeout(focusId);
      window.removeEventListener(TTS_BLOCKED_EVENT, onBlocked);
      interactionCleanup?.();
    };
  }, [appState]);

  // LIBRARY: speak announcement + pre-warm all book title audio
  useEffect(() => {
    if (appState !== 'LIBRARY') {
      hasAnnouncedLibraryRef.current = false;
      return;
    }
    if (!booksLoaded) return;

    // Pre-warm all library phrases so navigation is instant
    void prewarm([
      voiceDictionary.library.open(books.length),
      voiceDictionary.library.back,
      voiceDictionary.library.searchFocus,
      voiceDictionary.library.searchResultsNav,
      voiceDictionary.library.searchNoResultsNav,
      voiceDictionary.library.searchClear,
      ...books.map((b, i) => voiceDictionary.library.bookFocus(i + 1, b.title, b.author)),
      ...books.map((b) => voiceDictionary.library.selected(b.title)),
    ]);

    if (hasAnnouncedLibraryRef.current) return;
    hasAnnouncedLibraryRef.current = true;
    setFocusedLibraryIndex(0);
    void speakRef.current(voiceDictionary.library.open(books.length), {
      priority: 'high',
    });
  }, [appState, books, booksLoaded]);

  // WELCOME keyboard: Enter → Get Started
  useEffect(() => {
    if (appState !== 'WELCOME') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        openLibrary();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // openLibrary is stable (defined with useCallback below, but we reference it
  // via a ref to avoid stale closure)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  // LIBRARY keyboard: number keys, arrows, Enter, Escape
  useEffect(() => {
    if (appState !== 'LIBRARY') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      // When search input is focused, let its own onKeyDown handle everything
      if (searchInputRef.current && document.activeElement === searchInputRef.current) return;

      const disp = searchResults ?? books;

      // Key 0 → move to search box
      if (event.key === '0') {
        event.preventDefault();
        setFocusedLibraryIndex(-1);
        void speakRef.current(voiceDictionary.library.searchFocus, { priority: 'high' });
        return;
      }

      const numericKeys: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
      if (event.key in numericKeys) {
        const idx = numericKeys[event.key];
        if (idx !== undefined && idx < disp.length) {
          event.preventDefault();
          setFocusedLibraryIndex(idx);
          const book = disp[idx];
          if (book) {
            const origIdx = books.indexOf(book);
            void speakRef.current(
              voiceDictionary.library.bookFocus(origIdx + 1, book.title, book.author),
              { priority: 'high' },
            );
            openBook(book);
          }
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedLibraryIndex((prev) => {
          const next = Math.min(prev + 1, disp.length - 1);
          const book = disp[next];
          if (book) {
            const origIdx = books.indexOf(book);
            void speakRef.current(
              voiceDictionary.library.bookFocus(origIdx + 1, book.title, book.author),
              { priority: 'high' },
            );
          }
          return next;
        });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        // From first book → move to search box
        if (focusedLibraryIndex === 0) {
          setFocusedLibraryIndex(-1);
          void speakRef.current(voiceDictionary.library.searchFocus, { priority: 'high' });
        } else {
          setFocusedLibraryIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            const book = disp[next];
            if (book) {
              const origIdx = books.indexOf(book);
              void speakRef.current(
                voiceDictionary.library.bookFocus(origIdx + 1, book.title, book.author),
                { priority: 'high' },
              );
            }
            return next;
          });
        }
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const book = disp[focusedLibraryIndex];
        if (book) {
          openBook(book);
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        void speakRef.current(voiceDictionary.library.back, { priority: 'high' });
        setAppState('WELCOME');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, books, focusedLibraryIndex, searchResults]);

  // Keep focused item in DOM focus (-1 = search, 0+ = book buttons)
  useEffect(() => {
    if (appState !== 'LIBRARY') return;
    if (focusedLibraryIndex === -1) {
      searchInputRef.current?.focus();
      return;
    }
    const list = libraryListRef.current;
    if (!list) return;
    const buttons = list.querySelectorAll<HTMLButtonElement>('button[data-book-index]');
    const target = buttons[focusedLibraryIndex];
    target?.focus();
  }, [appState, focusedLibraryIndex]);

  const openLibrary = useCallback(() => {
    // Speak the short "Opening library" cue and change state immediately — do NOT
    // await a long greeting here, or the button will feel unresponsive.
    void speakRef.current(voiceDictionary.welcome.getStarted, { priority: 'high' });
    setAppState('LIBRARY');
  }, []);

  function openBook(book: Book) {
    void speakRef.current(voiceDictionary.library.selected(book.title), {
      priority: 'high',
    });
    const firstChapter = book.chapters[0];
    setSelectedBook(book);
    setSelectedChapterId(firstChapter?.id ?? '');
    setAppState('READING');
  }

  function handleSearch() {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults(null);
      return;
    }

    const results = books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q),
    );
    setSearchResults(results);
    // Move focus to first result if any; keep search focused if no results
    if (results.length > 0) setFocusedLibraryIndex(0);

    searchTokenRef.current += 1;
    const token = searchTokenRef.current;

    // Prewarm the query-specific audio while generic "Searching." plays
    void prewarm([voiceDictionary.library.searchQuery(q)]);

    void (async () => {
      await speakRef.current(voiceDictionary.library.searching, { priority: 'high' });
      if (token !== searchTokenRef.current) return;
      await speakRef.current(voiceDictionary.library.searchQuery(q), { priority: 'high' });
      if (token !== searchTokenRef.current) return;
      if (results.length > 0) {
        await speakRef.current(
          voiceDictionary.library.searchFound(results.length, q),
          { priority: 'high' },
        );
        if (token !== searchTokenRef.current) return;
        await speakRef.current(voiceDictionary.library.searchResultsNav, { priority: 'high' });
      } else {
        await speakRef.current(
          voiceDictionary.library.searchNotFound(q),
          { priority: 'high' },
        );
        if (token !== searchTokenRef.current) return;
        await speakRef.current(voiceDictionary.library.searchNoResultsNav, { priority: 'high' });
      }
    })();
  }

  function handleCloseReader() {
    setSelectedBook(null);
    setSelectedChapterId('');
    setSearchQuery('');
    setSearchResults(null);
    setAppState('LIBRARY');
  }

  function handleChapterChange(chapterId: string) {
    setSelectedChapterId(chapterId);
  }

  function handleReplayGuide() {
    if (appState === 'WELCOME') {
      void speakRef.current(voiceDictionary.welcome.greeting, { priority: 'high' });
    } else if (appState === 'LIBRARY') {
      void speakRef.current(voiceDictionary.library.open(books.length), {
        priority: 'high',
      });
    }
  }

  const displayedBooks = searchResults ?? books;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative min-h-screen overflow-hidden bg-access-bg"
      aria-label="AccessReader"
    >
      {/* WELCOME state */}
      {appState === 'WELCOME' ? (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-lg uppercase tracking-widest text-access-highlight">
            AccessReader
          </p>
          <h1 className="mt-6 text-5xl font-semibold text-access-text">
            Voice-Guided Reading
          </h1>
          <p className="mt-5 text-xl text-access-text/70">
            Move your mouse. Listen. Read.
          </p>
          <p className="mt-8 rounded-xl border-2 border-access-accent px-6 py-3 text-lg font-bold text-access-accent">
            Please turn up your speaker volume to hear the voice guidance.
          </p>
          <button
            ref={getStartedRef}
            type="button"
            aria-label="Get started, open book library"
            className="mt-6 min-h-[64px] min-w-[280px] rounded-2xl bg-access-accent text-2xl font-semibold text-access-bg transition hover:bg-access-accent/90 focus-visible:outline focus-visible:outline-4 focus-visible:outline-access-highlight"
            onClick={openLibrary}
          >
            Get Started
          </button>
        </div>
      ) : null}

      {/* LIBRARY state */}
      {appState === 'LIBRARY' ? (
        <div className="flex min-h-screen flex-col px-6 py-10">
          <div className="mx-auto w-full max-w-3xl">
            <h1 className="text-4xl font-semibold text-access-text">Library</h1>
            <p className="mt-2 text-xl text-access-text/60">
              {booksLoaded ? `${books.length} books available` : 'Loading...'}
            </p>

            {/* Search input — item 0 */}
            <div
              className={[
                'mt-6 flex min-h-[72px] w-full cursor-text items-center gap-5 rounded-2xl border px-5 py-4 transition',
                focusedLibraryIndex === -1
                  ? 'border-access-accent bg-access-zone shadow-[0_0_0_1px_rgba(255,215,0,0.3)]'
                  : 'border-access-text/10 bg-access-zone/60 hover:border-access-accent/50 hover:bg-access-zone',
              ].join(' ')}
              role="search"
              onMouseEnter={() => {
                setFocusedLibraryIndex(-1);
                void speakRef.current(voiceDictionary.library.searchFocus, { priority: 'high' });
              }}
              onClick={() => searchInputRef.current?.focus()}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-access-accent text-xl font-bold text-access-bg"
                aria-hidden="true"
              >
                0
              </span>
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                placeholder={voiceDictionary.library.searchPlaceholder}
                aria-label="Search books by title or author"
                className="flex-1 bg-transparent text-xl text-access-text placeholder:text-access-text/40 focus:outline-none"
                onFocus={() => setFocusedLibraryIndex(-1)}
                onChange={(e) => {
                  const q = e.target.value;
                  setSearchQuery(q);
                  if (!q.trim()) {
                    setSearchResults(null);
                    searchTokenRef.current += 1;
                  }
                }}
                onKeyDown={(e) => {
                  if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    if (e.key.length === 1) {
                      void speakRef.current(e.key, { priority: 'high' });
                    } else if (e.key === 'Backspace') {
                      void speakRef.current(voiceDictionary.keyboard.backspace, { priority: 'high' });
                    }
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setSearchQuery('');
                    setSearchResults(null);
                    searchTokenRef.current += 1;
                    void speakRef.current(voiceDictionary.library.searchClear, { priority: 'high' });
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const disp = searchResults ?? books;
                    const firstBook = disp[0];
                    if (firstBook) {
                      const origIdx = books.indexOf(firstBook);
                      setFocusedLibraryIndex(0);
                      void speakRef.current(
                        voiceDictionary.library.bookFocus(origIdx + 1, firstBook.title, firstBook.author),
                        { priority: 'high' },
                      );
                    }
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    // Already at top — stay in search, re-announce
                    void speakRef.current(voiceDictionary.library.searchFocus, { priority: 'high' });
                  }
                }}
              />
            </div>

            <ol
              ref={libraryListRef}
              className="mt-6 flex flex-col gap-3"
              aria-label="Book list"
            >
              {displayedBooks.length === 0 && searchResults !== null ? (
                <li>
                  <p className="py-6 text-center text-xl text-access-text/50">
                    No results for &ldquo;{searchQuery}&rdquo;
                  </p>
                </li>
              ) : (
                displayedBooks.map((book, index) => {
                  const originalIndex = books.indexOf(book);
                  const isFocused = focusedLibraryIndex === index;
                  return (
                    <li key={book.id}>
                      <button
                        type="button"
                        data-book-index={index}
                        aria-label={`${originalIndex + 1}. ${book.title} by ${book.author}`}
                        aria-current={isFocused ? 'true' : undefined}
                        className={[
                          'flex w-full min-h-[72px] items-center gap-5 rounded-2xl border px-5 py-4 text-left transition',
                          'focus-visible:outline focus-visible:outline-4 focus-visible:outline-access-highlight',
                          isFocused
                            ? 'border-access-accent bg-access-zone shadow-[0_0_0_1px_rgba(255,215,0,0.3)]'
                            : 'border-access-text/10 bg-access-zone/60 hover:border-access-accent/50 hover:bg-access-zone',
                        ].join(' ')}
                        onMouseEnter={() => {
                          void speakRef.current(
                            voiceDictionary.library.bookFocus(originalIndex + 1, book.title, book.author),
                            { priority: 'high' },
                          );
                          setFocusedLibraryIndex(index);
                        }}
                        onClick={() => {
                          setFocusedLibraryIndex(index);
                          openBook(book);
                        }}
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-access-accent text-xl font-bold text-access-bg"
                          aria-hidden="true"
                        >
                          {originalIndex + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xl font-semibold text-access-text">
                            {book.title}
                          </p>
                          <p className="mt-1 truncate text-lg text-access-text/60">
                            {book.author}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ol>

            <p className="mt-8 text-lg text-access-text/40">
              0 — Search &nbsp;·&nbsp; 1–4 — Books &nbsp;·&nbsp; ↑↓ — Navigate &nbsp;·&nbsp; Enter — Open &nbsp;·&nbsp; Esc — Back
            </p>
          </div>
        </div>
      ) : null}

      {/* READING state */}
      {appState === 'READING' && selectedBook !== null ? (
        <BookReader
          book={selectedBook}
          chapterId={selectedChapterId}
          onClose={handleCloseReader}
          onChapterChange={handleChapterChange}
        />
      ) : null}

      <SettingsButton onReplayGuide={handleReplayGuide} />
    </main>
  );
}
