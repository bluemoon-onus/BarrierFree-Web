'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useTTS } from '@/hooks/useTTS';
import type { Book, Chapter } from '@/lib/books';
import { loadChapterContent } from '@/lib/bookParser';
import voiceDictionary from '@/lib/voiceDictionary';

const PARAGRAPH_DELAY_MS = 500;

export interface BookReaderProps {
  book: Book | null;
  chapterId: string;
  onClose: () => void;
  onChapterChange: (id: string) => void;
}

type LoadState = 'loading' | 'ready' | 'error';

export function BookReader({
  book,
  chapterId,
  onClose,
  onChapterChange,
}: BookReaderProps) {
  const { pause, resume, speak, stop } = useTTS();

  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [paragraphIndex, setParagraphIndex] = useState(0);
  const [readerState, setReaderState] = useState<'idle' | 'reading' | 'paused'>('idle');
  const [isReadyToRead, setIsReadyToRead] = useState(false);

  const playbackTokenRef = useRef(0);
  const delayRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onChapterChangeRef = useRef(onChapterChange);
  const invalidatePlaybackRef = useRef<() => void>(() => {});

  onCloseRef.current = onClose;
  onChapterChangeRef.current = onChapterChange;

  const activeChapter: Chapter | null = useMemo(() => {
    if (!book) return null;
    return book.chapters.find((ch) => ch.id === chapterId) ?? book.chapters[0] ?? null;
  }, [book, chapterId]);

  const chapterIndex: number = useMemo(() => {
    if (!book || !activeChapter) return 0;
    return book.chapters.findIndex((ch) => ch.id === activeChapter.id);
  }, [book, activeChapter]);

  const totalParagraphs = paragraphs.length;
  const currentParagraph = paragraphs[paragraphIndex] ?? '';

  useEffect(() => {
    isPausedRef.current = readerState === 'paused';
  }, [readerState]);

  function clearDelay() {
    if (delayRef.current !== null) {
      window.clearTimeout(delayRef.current);
      delayRef.current = null;
    }
  }

  function invalidatePlayback() {
    playbackTokenRef.current += 1;
    clearDelay();
    stop();
  }

  invalidatePlaybackRef.current = invalidatePlayback;

  // Load chapter content whenever the chapter changes
  useEffect(() => {
    invalidatePlaybackRef.current();

    if (!book || !activeChapter) {
      setParagraphs([]);
      setParagraphIndex(0);
      setIsReadyToRead(false);
      setReaderState('idle');
      setLoadState('loading');
      return;
    }

    let cancelled = false;

    setLoadState('loading');
    setIsReadyToRead(false);
    setParagraphIndex(0);
    setReaderState('idle');

    void (async () => {
      try {
        void speak(voiceDictionary.reader.loading, { priority: 'high' });
        const loaded = await loadChapterContent(
          book.filename,
          activeChapter.lineStart,
          activeChapter.lineEnd,
        );

        if (cancelled) return;

        setParagraphs(loaded);
        setLoadState('ready');
        setReaderState('reading');

        const playbackToken = playbackTokenRef.current;

        await speak(
          voiceDictionary.reader.chapterStart(book.title, activeChapter.title),
          { priority: 'high' },
        );

        if (cancelled || playbackToken !== playbackTokenRef.current) return;

        setIsReadyToRead(true);
      } catch {
        if (!cancelled) {
          setLoadState('error');
          setReaderState('idle');
        }
      }
    })();

    return () => {
      cancelled = true;
      invalidatePlaybackRef.current();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, activeChapter]);

  // Auto-advance paragraphs
  useEffect(() => {
    if (!book || !activeChapter || !isReadyToRead || paragraphs.length === 0) {
      return;
    }

    const playbackToken = playbackTokenRef.current;
    let cancelled = false;

    setReaderState((prev) => (prev === 'paused' ? prev : 'reading'));

    void (async () => {
      await speak(paragraphs[paragraphIndex] ?? '', { priority: 'high' });

      if (cancelled || playbackToken !== playbackTokenRef.current) return;

      if (paragraphIndex >= paragraphs.length - 1) {
        void speak(voiceDictionary.reader.endOfChapter, { priority: 'normal' });
        setReaderState('idle');
        return;
      }

      delayRef.current = window.setTimeout(() => {
        if (playbackToken !== playbackTokenRef.current || isPausedRef.current) {
          return;
        }
        setParagraphIndex((prev) => Math.min(prev + 1, paragraphs.length - 1));
      }, PARAGRAPH_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      clearDelay();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter, book, isReadyToRead, paragraphIndex, paragraphs]);

  // Keyboard controls
  useEffect(() => {
    if (!book) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      switch (event.key) {
        case ' ': {
          event.preventDefault();
          if (readerState === 'paused') {
            resume();
            setReaderState('reading');
            void speak(voiceDictionary.reader.resumed, { priority: 'high' });
          } else if (readerState === 'reading') {
            pause();
            setReaderState('paused');
            void speak(voiceDictionary.reader.paused, { priority: 'high' });
          }
          break;
        }

        case 'ArrowRight': {
          if (totalParagraphs === 0) break;
          event.preventDefault();
          invalidatePlaybackRef.current();
          setReaderState('reading');
          setIsReadyToRead(true);
          void speak(voiceDictionary.reader.nextParagraph, { priority: 'high' });
          setParagraphIndex((prev) => Math.min(prev + 1, totalParagraphs - 1));
          break;
        }

        case 'ArrowLeft': {
          if (totalParagraphs === 0) break;
          event.preventDefault();
          invalidatePlaybackRef.current();
          setReaderState('reading');
          setIsReadyToRead(true);
          void speak(voiceDictionary.reader.prevParagraph, { priority: 'high' });
          setParagraphIndex((prev) => Math.max(prev - 1, 0));
          break;
        }

        case 'PageDown':
        case 'n':
        case 'N': {
          event.preventDefault();
          if (!book) break;
          const nextChapter = book.chapters[chapterIndex + 1];
          if (nextChapter) {
            void speak(voiceDictionary.reader.nextChapter(nextChapter.title), {
              priority: 'high',
            });
            onChapterChangeRef.current(nextChapter.id);
          }
          break;
        }

        case 'PageUp':
        case 'p':
        case 'P': {
          event.preventDefault();
          if (!book) break;
          const prevChapter = book.chapters[chapterIndex - 1];
          if (prevChapter) {
            void speak(voiceDictionary.reader.prevChapter(prevChapter.title), {
              priority: 'high',
            });
            onChapterChangeRef.current(prevChapter.id);
          }
          break;
        }

        case 'c':
        case 'C': {
          event.preventDefault();
          if (!book) break;
          // Cycle to next chapter (wraps around)
          const nextIdx = (chapterIndex + 1) % book.chapters.length;
          const target = book.chapters[nextIdx];
          if (target) {
            void speak(voiceDictionary.reader.nextChapter(target.title), {
              priority: 'high',
            });
            onChapterChangeRef.current(target.id);
          }
          break;
        }

        case 'Escape': {
          event.preventDefault();
          invalidatePlaybackRef.current();
          void speak(voiceDictionary.reader.back, { priority: 'high' });
          onCloseRef.current();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [book, chapterIndex, pause, readerState, resume, totalParagraphs, speak]);

  if (!book || !activeChapter) {
    return null;
  }

  return (
    <section
      className="fixed inset-0 z-40 flex flex-col bg-access-bg"
      aria-label={`Book reader: ${book.title}`}
      aria-describedby="reader-keyboard-hints"
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-access-accent/20 px-6 py-4">
        <div className="min-w-0">
          <p
            className="truncate text-lg font-semibold text-access-text"
            aria-label={`Reading ${book.title}`}
          >
            {book.title}
          </p>
          <p className="mt-1 text-lg text-access-text/60">
            {activeChapter.title}
          </p>
        </div>
        <div
          className="shrink-0 text-lg text-access-accent"
          aria-live="polite"
          aria-atomic="true"
        >
          Para {Math.min(paragraphIndex + 1, Math.max(totalParagraphs, 1))} of{' '}
          {Math.max(totalParagraphs, 1)}
        </div>
        <button
          type="button"
          aria-label="Close reader, return to library"
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-full border border-access-accent/40 px-5 text-lg font-medium text-access-text transition hover:border-access-accent hover:text-access-accent focus-visible:outline focus-visible:outline-4 focus-visible:outline-access-highlight"
          onClick={() => {
            invalidatePlaybackRef.current();
            void speak(voiceDictionary.reader.back, { priority: 'high' });
            onCloseRef.current();
          }}
        >
          Esc
        </button>
      </div>

      {/* Paragraph display */}
      <div className="flex flex-1 items-center justify-center overflow-auto px-6 py-10">
        {loadState === 'loading' ? (
          <p
            className="text-2xl leading-relaxed text-access-text/60"
            role="status"
            aria-live="polite"
          >
            Loading chapter...
          </p>
        ) : loadState === 'error' ? (
          <p
            className="text-2xl leading-relaxed text-red-400"
            role="alert"
          >
            Failed to load chapter. Press Escape to return to the library.
          </p>
        ) : (
          <p
            className="max-w-3xl text-2xl leading-relaxed text-access-text"
            aria-live="polite"
            aria-atomic="true"
          >
            {currentParagraph}
          </p>
        )}
      </div>

      {/* Status + keyboard hints */}
      <div className="shrink-0 border-t border-access-accent/20 px-6 py-4">
        <div
          className="mb-3 text-center text-lg text-access-highlight"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {readerState === 'paused'
            ? voiceDictionary.reader.paused
            : readerState === 'idle'
              ? 'End of chapter'
              : 'Reading'}
        </div>
        <div
          id="reader-keyboard-hints"
          className="flex flex-wrap items-center justify-center gap-3 text-lg text-access-text/60"
        >
          <span className="rounded-full border border-access-text/10 bg-access-zone px-4 py-2">
            Space: Pause / Resume
          </span>
          <span className="rounded-full border border-access-text/10 bg-access-zone px-4 py-2">
            ← → : Paragraph
          </span>
          <span className="rounded-full border border-access-text/10 bg-access-zone px-4 py-2">
            N / P: Chapter
          </span>
          <span className="rounded-full border border-access-text/10 bg-access-zone px-4 py-2">
            C: Cycle chapter
          </span>
          <span className="rounded-full border border-access-text/10 bg-access-zone px-4 py-2">
            Esc: Library
          </span>
        </div>
      </div>
    </section>
  );
}
