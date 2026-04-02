'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { BookReader } from '@/components/BookReader';
import { SettingsButton } from '@/components/SettingsButton';
import { type Book, loadBooks } from '@/lib/books';
import { useTTS } from '@/hooks/useTTS';
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

  const getStartedRef = useRef<HTMLButtonElement | null>(null);
  const libraryListRef = useRef<HTMLOListElement | null>(null);
  const hasAnnouncedWelcomeRef = useRef(false);
  const hasAnnouncedLibraryRef = useRef(false);
  const speakRef = useRef(speak);

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

  // WELCOME: focus the Get Started button on mount; greeting is spoken on first interaction
  // (Chrome blocks speechSynthesis before user gesture, so we don't auto-speak)
  useEffect(() => {
    if (appState !== 'WELCOME') return;
    const id = window.setTimeout(() => {
      getStartedRef.current?.focus();
    }, 100);
    return () => window.clearTimeout(id);
  }, [appState]);

  // LIBRARY: speak announcement once when state becomes LIBRARY
  useEffect(() => {
    if (appState !== 'LIBRARY') {
      hasAnnouncedLibraryRef.current = false;
      // Reset welcome announcement so greeting replays when returning to WELCOME
      if (appState === 'WELCOME') hasAnnouncedWelcomeRef.current = false;
      return;
    }
    if (hasAnnouncedLibraryRef.current) return;
    hasAnnouncedLibraryRef.current = true;
    setFocusedLibraryIndex(0);
    void speakRef.current(voiceDictionary.library.open(books.length), {
      priority: 'high',
    });
  }, [appState, books.length]);

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

      const numericKeys: Record<string, number> = {
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
        '6': 5, '7': 6, '8': 7, '9': 8,
      };

      if (event.key in numericKeys) {
        const idx = numericKeys[event.key];
        if (idx !== undefined && idx < books.length) {
          event.preventDefault();
          setFocusedLibraryIndex(idx);
          const book = books[idx];
          if (book) {
            void speakRef.current(
              voiceDictionary.library.bookFocus(idx + 1, book.title, book.author),
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
          const next = Math.min(prev + 1, books.length - 1);
          const book = books[next];
          if (book) {
            void speakRef.current(
              voiceDictionary.library.bookFocus(next + 1, book.title, book.author),
              { priority: 'high' },
            );
          }
          return next;
        });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedLibraryIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          const book = books[next];
          if (book) {
            void speakRef.current(
              voiceDictionary.library.bookFocus(next + 1, book.title, book.author),
              { priority: 'high' },
            );
          }
          return next;
        });
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const book = books[focusedLibraryIndex];
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
  }, [appState, books, focusedLibraryIndex]);

  // Keep focused library item's DOM button in focus
  useEffect(() => {
    if (appState !== 'LIBRARY') return;
    const list = libraryListRef.current;
    if (!list) return;
    const buttons = list.querySelectorAll<HTMLButtonElement>('button[data-book-index]');
    const target = buttons[focusedLibraryIndex];
    target?.focus();
  }, [appState, focusedLibraryIndex]);

  const openLibrary = useCallback(() => {
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

  function handleCloseReader() {
    setSelectedBook(null);
    setSelectedChapterId('');
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
          <button
            ref={getStartedRef}
            type="button"
            aria-label="Get started, open book library"
            className="mt-12 min-h-[64px] min-w-[280px] rounded-2xl bg-access-accent text-2xl font-semibold text-access-bg transition hover:bg-access-accent/90 focus-visible:outline focus-visible:outline-4 focus-visible:outline-access-highlight"
            onFocus={() => {
              if (!hasAnnouncedWelcomeRef.current) {
                hasAnnouncedWelcomeRef.current = true;
                void speakRef.current(voiceDictionary.welcome.greeting, { priority: 'high' });
              }
            }}
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

            <ol
              ref={libraryListRef}
              className="mt-8 flex flex-col gap-3"
              aria-label="Book list"
            >
              {books.map((book, index) => {
                const isFocused = focusedLibraryIndex === index;
                return (
                  <li key={book.id}>
                    <button
                      type="button"
                      data-book-index={index}
                      aria-label={`${index + 1}. ${book.title} by ${book.author}`}
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
                          voiceDictionary.library.bookFocus(index + 1, book.title, book.author),
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
                        {index + 1}
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
              })}
            </ol>

            <p className="mt-8 text-lg text-access-text/40">
              Press 1–9 to select a book, Arrow keys to navigate, Enter to open,
              Escape to go back.
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
