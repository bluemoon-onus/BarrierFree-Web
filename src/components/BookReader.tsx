'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useTTS } from '@/hooks/useTTS';
import type { Book, Chapter } from '@/lib/books';
import { loadChapterContent } from '@/lib/bookParser';
import voiceDictionary from '@/lib/voiceDictionary';

const PARAGRAPH_DELAY_MS = 500;
// Time threshold for Up-arrow "near start" detection (~3 words at normal speech rate)
const NEAR_START_MS = 2200;

export interface BookReaderProps {
  book: Book | null;
  chapterId: string;
  onClose: () => void;
  onChapterChange: (id: string) => void;
}

type LoadState = 'loading' | 'ready' | 'error';
type ReaderState = 'idle' | 'reading' | 'paused';

export function BookReader({
  book,
  chapterId,
  onClose,
  onChapterChange,
}: BookReaderProps) {
  const { speak, stop } = useTTS();

  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [paragraphIndex, setParagraphIndex] = useState(0);
  const [readerState, setReaderState] = useState<ReaderState>('idle');
  const [isReadyToRead, setIsReadyToRead] = useState(false);
  // Incremented to force a restart of the current paragraph without changing index
  const [restartTrigger, setRestartTrigger] = useState(0);

  const playbackTokenRef = useRef(0);
  const delayRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  const onChapterChangeRef = useRef(onChapterChange);
  const invalidatePlaybackRef = useRef<() => void>(() => {});
  // Timestamp when current paragraph started speaking (for Up-arrow heuristic)
  const paragraphStartTimeRef = useRef<number>(Date.now());
  // Announce controls once per book session
  const hasAnnouncedControlsRef = useRef(false);

  onCloseRef.current = onClose;
  onChapterChangeRef.current = onChapterChange;

  const activeChapter: Chapter | null = useMemo(() => {
    if (!book) return null;
    return book.chapters.find((ch) => ch.id === chapterId) ?? book.chapters[0] ?? null;
  }, [book, chapterId]);

  const totalParagraphs = paragraphs.length;
  const currentParagraph = paragraphs[paragraphIndex] ?? '';

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

  // ─── Load chapter on change ───────────────────────────────────────────────
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
    setRestartTrigger(0);

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

        const token = playbackTokenRef.current;

        // Announce chapter title
        await speak(
          voiceDictionary.reader.chapterStart(book.title, activeChapter.title),
          { priority: 'high' },
        );

        if (cancelled || token !== playbackTokenRef.current) return;

        // Announce controls once per session
        if (!hasAnnouncedControlsRef.current) {
          hasAnnouncedControlsRef.current = true;
          await speak(voiceDictionary.reader.controlsGuide, { priority: 'normal' });
          if (cancelled || token !== playbackTokenRef.current) return;
        }

        setReaderState('reading');
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

  // ─── Auto-advance paragraph playback ────────────────────────────────────
  // Fires when: chapter loads, paragraph index changes, restart trigger fires,
  // or reader state changes TO 'reading' (resume after pause).
  useEffect(() => {
    if (!book || !activeChapter || !isReadyToRead || paragraphs.length === 0) return;
    if (readerState !== 'reading') return;

    const token = playbackTokenRef.current;
    let cancelled = false;

    paragraphStartTimeRef.current = Date.now();

    void (async () => {
      await speak(paragraphs[paragraphIndex] ?? '', { priority: 'high' });

      if (cancelled || token !== playbackTokenRef.current) return;

      if (paragraphIndex >= paragraphs.length - 1) {
        void speak(voiceDictionary.reader.endOfChapter, { priority: 'normal' });
        setReaderState('idle');
        return;
      }

      delayRef.current = window.setTimeout(() => {
        if (token !== playbackTokenRef.current) return;
        setParagraphIndex((prev) => Math.min(prev + 1, paragraphs.length - 1));
      }, PARAGRAPH_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      clearDelay();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter, book, isReadyToRead, paragraphIndex, paragraphs, readerState, restartTrigger]);

  // ─── Keyboard controls ───────────────────────────────────────────────────
  useEffect(() => {
    if (!book) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      switch (event.key) {
        // ── Space: pause / resume (stop+restart — works on both Chrome & Safari)
        case ' ': {
          event.preventDefault();
          if (readerState === 'paused') {
            // Resume: restart speaking from current paragraph
            setReaderState('reading');
            setRestartTrigger((t) => t + 1);
            void speak(voiceDictionary.reader.resumed, { priority: 'high' });
          } else if (readerState === 'reading') {
            // Pause: cancel TTS (cross-browser safe)
            invalidatePlaybackRef.current();
            setReaderState('paused');
            void speak(voiceDictionary.reader.paused, { priority: 'high' });
          }
          break;
        }

        // ── Down arrow: next paragraph
        case 'ArrowDown': {
          if (totalParagraphs === 0) break;
          event.preventDefault();
          invalidatePlaybackRef.current();
          void speak(voiceDictionary.reader.nextParagraph, { priority: 'high' });
          setParagraphIndex((prev) => {
            const next = Math.min(prev + 1, totalParagraphs - 1);
            return next;
          });
          setReaderState('reading');
          setIsReadyToRead(true);
          break;
        }

        // ── Up arrow: restart current paragraph OR previous paragraph
        // If within NEAR_START_MS of paragraph start → go to previous paragraph
        // Otherwise → restart from beginning of current paragraph
        case 'ArrowUp': {
          if (totalParagraphs === 0) break;
          event.preventDefault();
          const elapsed = Date.now() - paragraphStartTimeRef.current;
          const isNearStart = elapsed < NEAR_START_MS;
          invalidatePlaybackRef.current();
          setReaderState('reading');
          setIsReadyToRead(true);
          if (isNearStart && paragraphIndex > 0) {
            void speak(voiceDictionary.reader.prevParagraph, { priority: 'high' });
            setParagraphIndex((prev) => Math.max(prev - 1, 0));
          } else {
            // Restart current paragraph
            setRestartTrigger((t) => t + 1);
          }
          break;
        }

        // ── Right arrow: next paragraph (alias for ↓)
        case 'ArrowRight': {
          if (totalParagraphs === 0) break;
          event.preventDefault();
          invalidatePlaybackRef.current();
          void speak(voiceDictionary.reader.nextParagraph, { priority: 'high' });
          setParagraphIndex((prev) => Math.min(prev + 1, totalParagraphs - 1));
          setReaderState('reading');
          setIsReadyToRead(true);
          break;
        }

        // ── Left arrow: previous paragraph (always, no time check)
        case 'ArrowLeft': {
          if (totalParagraphs === 0) break;
          event.preventDefault();
          invalidatePlaybackRef.current();
          void speak(voiceDictionary.reader.prevParagraph, { priority: 'high' });
          setParagraphIndex((prev) => Math.max(prev - 1, 0));
          setReaderState('reading');
          setIsReadyToRead(true);
          break;
        }

        // ── Escape: back to library
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
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [book, paragraphIndex, readerState, totalParagraphs, speak]);

  if (!book || !activeChapter) return null;

  return (
    <section
      className="fixed inset-0 z-40 flex flex-col bg-access-bg"
      aria-label={`Book reader: ${book.title}`}
      aria-describedby="reader-keyboard-hints"
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-access-accent/20 px-6 py-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-access-text">
            {book.title}
          </p>
          <p className="mt-1 text-lg text-access-text/60">{activeChapter.title}</p>
        </div>
        <div
          className="shrink-0 text-lg text-access-accent"
          aria-live="polite"
          aria-atomic="true"
        >
          {totalParagraphs > 0
            ? `Para ${paragraphIndex + 1} of ${totalParagraphs}`
            : ''}
        </div>
        <button
          type="button"
          aria-label="Close reader, return to library"
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-full border border-access-accent/40 px-5 text-lg font-medium text-access-text transition hover:border-access-accent hover:text-access-accent focus-visible:outline focus-visible:outline-4 focus-visible:outline-access-highlight motion-reduce:transition-none"
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
          <p className="text-2xl leading-relaxed text-red-400" role="alert">
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
            ? 'Paused'
            : readerState === 'idle'
              ? 'End of chapter'
              : 'Reading'}
        </div>
        <div
          id="reader-keyboard-hints"
          className="flex flex-wrap items-center justify-center gap-3 text-lg text-access-text/50"
        >
          <span className="rounded-full border border-access-text/10 bg-access-zone px-4 py-2">
            Space — Pause / Resume
          </span>
          <span className="rounded-full border border-access-text/10 bg-access-zone px-4 py-2">
            ↓ → — Next paragraph
          </span>
          <span className="rounded-full border border-access-text/10 bg-access-zone px-4 py-2">
            ↑ — Restart / Prev paragraph
          </span>
          <span className="rounded-full border border-access-text/10 bg-access-zone px-4 py-2">
            ← — Prev paragraph
          </span>
          <span className="rounded-full border border-access-text/10 bg-access-zone px-4 py-2">
            Esc — Library
          </span>
        </div>
      </div>
    </section>
  );
}
