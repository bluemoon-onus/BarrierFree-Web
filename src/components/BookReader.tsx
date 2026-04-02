'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useTTS } from '@/hooks/useTTS';
import type { Book, Chapter } from '@/lib/books';
import { loadChapterContent } from '@/lib/bookParser';
import voiceDictionary from '@/lib/voiceDictionary';

const SENTENCE_DELAY_MS = 300;
// Up-arrow "near start" threshold: within ~3 spoken words → go to previous sentence
const NEAR_START_MS = 2200;

export interface BookReaderProps {
  book: Book | null;
  chapterId: string;
  onClose: () => void;
  onChapterChange: (id: string) => void;
}

type LoadState = 'loading' | 'ready' | 'error';
type ReaderState = 'idle' | 'reading' | 'paused';

/**
 * Split a paragraph into sentences.
 * Splits on [.!?]+ followed by whitespace then capital letter or opening quote.
 */
function splitSentences(paragraph: string): string[] {
  if (!paragraph.trim()) return [];
  const result: string[] = [];
  const re = /([.!?]+)\s+(?=[A-Z"'\u201C\u2018])/g;
  let start = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(paragraph)) !== null) {
    const sentence = paragraph.slice(start, match.index + match[1].length).trim();
    if (sentence.length > 2) result.push(sentence);
    start = match.index + match[0].length;
  }
  const tail = paragraph.slice(start).trim();
  if (tail.length > 2) result.push(tail);
  return result.length > 0 ? result : [paragraph.trim()];
}

export function BookReader({
  book,
  chapterId,
  onClose,
  onChapterChange,
}: BookReaderProps) {
  const { speak, stop } = useTTS();

  const [sentences, setSentences] = useState<string[]>([]);
  // Sentence index of the first sentence in each paragraph (for ←/→ navigation)
  const [paragraphBoundaries, setParagraphBoundaries] = useState<number[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [readerState, setReaderState] = useState<ReaderState>('idle');
  const [isReadyToRead, setIsReadyToRead] = useState(false);
  const [restartTrigger, setRestartTrigger] = useState(0);

  const playbackTokenRef = useRef(0);
  const delayRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  const onChapterChangeRef = useRef(onChapterChange);
  const invalidatePlaybackRef = useRef<() => void>(() => {});
  const sentenceStartTimeRef = useRef<number>(Date.now());
  const hasAnnouncedControlsRef = useRef(false);

  onCloseRef.current = onClose;
  onChapterChangeRef.current = onChapterChange;

  const activeChapter: Chapter | null = useMemo(() => {
    if (!book) return null;
    return book.chapters.find((ch) => ch.id === chapterId) ?? book.chapters[0] ?? null;
  }, [book, chapterId]);

  const totalSentences = sentences.length;
  const currentSentence = sentences[sentenceIndex] ?? '';

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

  // ─── Load chapter ─────────────────────────────────────────────────────────
  useEffect(() => {
    invalidatePlaybackRef.current();

    if (!book || !activeChapter) {
      setSentences([]);
      setParagraphBoundaries([]);
      setSentenceIndex(0);
      setIsReadyToRead(false);
      setReaderState('idle');
      setLoadState('loading');
      return;
    }

    let cancelled = false;

    setLoadState('loading');
    setIsReadyToRead(false);
    setSentenceIndex(0);
    setReaderState('idle');
    setRestartTrigger(0);

    void (async () => {
      try {
        void speak(voiceDictionary.reader.loading, { priority: 'high' });
        const paragraphs = await loadChapterContent(
          book.filename,
          activeChapter.lineStart,
          activeChapter.lineEnd,
        );

        if (cancelled) return;

        // Flatten paragraphs → sentences, recording where each paragraph starts
        const boundaries: number[] = [];
        const allSentences: string[] = [];
        for (const para of paragraphs) {
          boundaries.push(allSentences.length);
          allSentences.push(...splitSentences(para));
        }

        setSentences(allSentences);
        setParagraphBoundaries(boundaries);
        setLoadState('ready');

        const token = playbackTokenRef.current;

        await speak(
          voiceDictionary.reader.chapterStart(book.title, activeChapter.title),
          { priority: 'high' },
        );

        if (cancelled || token !== playbackTokenRef.current) return;

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

  // ─── Auto-advance sentence playback ──────────────────────────────────────
  useEffect(() => {
    if (!book || !activeChapter || !isReadyToRead || sentences.length === 0) return;
    if (readerState !== 'reading') return;

    const token = playbackTokenRef.current;
    let cancelled = false;

    sentenceStartTimeRef.current = Date.now();

    void (async () => {
      await speak(sentences[sentenceIndex] ?? '', { priority: 'high' });

      if (cancelled || token !== playbackTokenRef.current) return;

      if (sentenceIndex >= sentences.length - 1) {
        void speak(voiceDictionary.reader.endOfChapter, { priority: 'normal' });
        setReaderState('idle');
        return;
      }

      delayRef.current = window.setTimeout(() => {
        if (token !== playbackTokenRef.current) return;
        setSentenceIndex((prev) => Math.min(prev + 1, sentences.length - 1));
      }, SENTENCE_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      clearDelay();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter, book, isReadyToRead, sentenceIndex, sentences, readerState, restartTrigger]);

  // ─── Keyboard controls ────────────────────────────────────────────────────
  useEffect(() => {
    if (!book) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      switch (event.key) {
        // ── Space: pause / resume
        case ' ': {
          event.preventDefault();
          if (readerState === 'paused') {
            setReaderState('reading');
            setRestartTrigger((t) => t + 1);
            void speak(voiceDictionary.reader.resumed, { priority: 'high' });
          } else if (readerState === 'reading') {
            invalidatePlaybackRef.current();
            setReaderState('paused');
            void speak(voiceDictionary.reader.paused, { priority: 'high' });
          }
          break;
        }

        // ── Down: next sentence
        case 'ArrowDown': {
          if (totalSentences === 0) break;
          event.preventDefault();
          invalidatePlaybackRef.current();
          void speak(voiceDictionary.reader.nextSentence, { priority: 'high' });
          setSentenceIndex((prev) => Math.min(prev + 1, totalSentences - 1));
          setReaderState('reading');
          setIsReadyToRead(true);
          break;
        }

        // ── Up: restart current sentence OR go to previous sentence (if near start)
        case 'ArrowUp': {
          if (totalSentences === 0) break;
          event.preventDefault();
          const elapsed = Date.now() - sentenceStartTimeRef.current;
          invalidatePlaybackRef.current();
          setReaderState('reading');
          setIsReadyToRead(true);
          if (elapsed < NEAR_START_MS && sentenceIndex > 0) {
            void speak(voiceDictionary.reader.prevSentence, { priority: 'high' });
            setSentenceIndex((prev) => Math.max(prev - 1, 0));
          } else {
            setRestartTrigger((t) => t + 1);
          }
          break;
        }

        // ── Right: next paragraph
        case 'ArrowRight': {
          if (totalSentences === 0 || paragraphBoundaries.length === 0) break;
          event.preventDefault();
          invalidatePlaybackRef.current();
          setSentenceIndex((prev) => {
            const curPara = paragraphBoundaries.reduce(
              (acc, start, i) => (start <= prev ? i : acc), 0,
            );
            const nextStart =
              paragraphBoundaries[Math.min(curPara + 1, paragraphBoundaries.length - 1)] ?? prev;
            return nextStart;
          });
          setReaderState('reading');
          setIsReadyToRead(true);
          break;
        }

        // ── Left: previous paragraph
        case 'ArrowLeft': {
          if (totalSentences === 0 || paragraphBoundaries.length === 0) break;
          event.preventDefault();
          invalidatePlaybackRef.current();
          setSentenceIndex((prev) => {
            const curPara = paragraphBoundaries.reduce(
              (acc, start, i) => (start <= prev ? i : acc), 0,
            );
            const prevStart =
              paragraphBoundaries[Math.max(curPara - 1, 0)] ?? 0;
            return prevStart;
          });
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
  }, [book, paragraphBoundaries, sentenceIndex, readerState, totalSentences, speak]);

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
          {totalSentences > 0 ? `${sentenceIndex + 1} / ${totalSentences}` : ''}
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

      {/* Sentence display */}
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
            className={[
              'max-w-3xl text-2xl leading-relaxed transition-colors duration-200',
              readerState === 'reading' ? 'text-access-accent' : 'text-access-text',
            ].join(' ')}
            aria-live="polite"
            aria-atomic="true"
          >
            {currentSentence}
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
            ↑ ↓ — Sentences
          </span>
          <span className="rounded-full border border-access-text/10 bg-access-zone px-4 py-2">
            ← → — Paragraphs
          </span>
          <span className="rounded-full border border-access-text/10 bg-access-zone px-4 py-2">
            Esc — Library
          </span>
        </div>
      </div>
    </section>
  );
}
