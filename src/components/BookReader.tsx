'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useTTS } from '@/hooks/useTTS';
import type { Book } from '@/lib/books';
import voiceDictionary from '@/lib/voiceDictionary';

const PARAGRAPH_DELAY_MS = 500;

export interface BookReaderProps {
  book: Book | null;
  onClose: () => void;
}

export default function BookReader({ book, onClose }: BookReaderProps) {
  const { pause, resume, speak, stop } = useTTS();
  const [paragraphIndex, setParagraphIndex] = useState(0);
  const [readerState, setReaderState] = useState<'idle' | 'reading' | 'paused'>(
    'idle',
  );
  const [isReadyToRead, setIsReadyToRead] = useState(false);

  const playbackTokenRef = useRef(0);
  const delayRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const invalidatePlaybackRef = useRef<() => void>(() => {});

  const activeChapter = book?.chapters[0] ?? null;
  const paragraphs = useMemo(
    () => activeChapter?.paragraphs ?? [],
    [activeChapter],
  );
  const totalParagraphs = paragraphs.length;
  const currentParagraph = paragraphs[paragraphIndex] ?? '';

  onCloseRef.current = onClose;

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

  useEffect(() => {
    invalidatePlaybackRef.current();

    if (!book || !activeChapter || paragraphs.length === 0) {
      setParagraphIndex(0);
      setIsReadyToRead(false);
      setReaderState('idle');
      return;
    }

    setParagraphIndex(0);
    setIsReadyToRead(false);
    setReaderState('reading');

    const playbackToken = playbackTokenRef.current;

    void (async () => {
      await speak(
        voiceDictionary.bookReader.nowReading(book.title, activeChapter.title),
        { priority: 'high' },
      );

      if (playbackToken !== playbackTokenRef.current) {
        return;
      }

      setIsReadyToRead(true);
    })();

    return () => {
      invalidatePlaybackRef.current();
    };
  }, [activeChapter, book, paragraphs.length, speak, stop]);

  useEffect(() => {
    if (!book || !activeChapter || !isReadyToRead || paragraphs.length === 0) {
      return;
    }

    const playbackToken = playbackTokenRef.current;
    let cancelled = false;

    setReaderState((previousState) =>
      previousState === 'paused' ? previousState : 'reading',
    );

    void (async () => {
      await speak(paragraphs[paragraphIndex], { priority: 'high' });

      if (cancelled || playbackToken !== playbackTokenRef.current) {
        return;
      }

      if (paragraphIndex >= paragraphs.length - 1) {
        setReaderState('idle');
        return;
      }

      delayRef.current = window.setTimeout(() => {
        if (playbackToken !== playbackTokenRef.current || isPausedRef.current) {
          return;
        }

        setParagraphIndex((previousIndex) =>
          Math.min(previousIndex + 1, paragraphs.length - 1),
        );
      }, PARAGRAPH_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      clearDelay();
    };
  }, [activeChapter, book, isReadyToRead, paragraphIndex, paragraphs, speak]);

  useEffect(() => {
    if (!book) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault();

        if (readerState === 'paused') {
          resume();
          setReaderState('reading');
          return;
        }

        if (readerState === 'reading') {
          pause();
          setReaderState('paused');
        }

        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        invalidatePlaybackRef.current();
        onCloseRef.current();
        return;
      }

      if (event.key === 'ArrowRight' && totalParagraphs > 0) {
        event.preventDefault();
        invalidatePlaybackRef.current();
        setReaderState('reading');
        setIsReadyToRead(true);
        setParagraphIndex((previousIndex) =>
          Math.min(previousIndex + 1, totalParagraphs - 1),
        );
        return;
      }

      if (event.key === 'ArrowLeft' && totalParagraphs > 0) {
        event.preventDefault();
        invalidatePlaybackRef.current();
        setReaderState('reading');
        setIsReadyToRead(true);
        setParagraphIndex((previousIndex) => Math.max(previousIndex - 1, 0));
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [book, pause, readerState, resume, stop, totalParagraphs]);

  if (!book || !activeChapter) {
    return null;
  }

  return (
    <section
      className="fixed inset-0 z-40 flex items-center justify-center bg-access-bg/95 px-6 py-8"
      aria-label={`Book reader for ${book.title}`}
    >
      <div className="w-full max-w-5xl rounded-[2rem] border border-access-accent/40 bg-access-zone px-8 py-10 text-center shadow-[0_0_0_1px_rgba(255,215,0,0.12)]">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="text-left">
            <p className="text-sm uppercase tracking-[0.24em] text-access-highlight">
              {book.author}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-access-text sm:text-4xl">
              {book.title}
            </h2>
            <p className="mt-2 text-base text-access-text/75">{activeChapter.title}</p>
          </div>
          <button
            type="button"
            aria-label="Close reader"
            className="min-h-11 rounded-full border border-access-accent/40 px-5 text-sm font-medium text-access-text transition hover:border-access-accent hover:text-access-accent"
            onClick={() => {
              invalidatePlaybackRef.current();
              onCloseRef.current();
            }}
          >
            Esc
          </button>
        </div>

        <div className="rounded-[1.75rem] border border-access-text/10 bg-access-bg px-6 py-10 text-left">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm uppercase tracking-[0.22em] text-access-accent">
              Paragraph {Math.min(paragraphIndex + 1, Math.max(totalParagraphs, 1))} of{' '}
              {Math.max(totalParagraphs, 1)}
            </p>
            <div className="rounded-full border border-access-highlight/35 bg-access-highlight/10 px-4 py-2 text-sm text-access-highlight">
              {readerState === 'paused'
                ? voiceDictionary.bookReader.paused
                : readerState === 'idle'
                  ? voiceDictionary.bookReader.stopped
                  : 'Reading'}
            </div>
          </div>

          <p className="min-h-[16rem] text-2xl leading-10 text-access-text sm:text-[2rem] sm:leading-[3rem]">
            {currentParagraph}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-access-text/80">
          <div className="rounded-full border border-access-text/10 bg-access-bg px-4 py-2">
            Space: Pause or resume
          </div>
          <div className="rounded-full border border-access-text/10 bg-access-bg px-4 py-2">
            Left: Previous paragraph
          </div>
          <div className="rounded-full border border-access-text/10 bg-access-bg px-4 py-2">
            Right: Next paragraph
          </div>
          <div className="rounded-full border border-access-text/10 bg-access-bg px-4 py-2">
            Escape: Close reader
          </div>
        </div>
      </div>
    </section>
  );
}
