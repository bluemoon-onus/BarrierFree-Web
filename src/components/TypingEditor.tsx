'use client';

import { useEffect, useRef, useState } from 'react';

import {
  type KeyboardReaderSubmitResult,
  useKeyboardReader,
} from '@/hooks/useKeyboardReader';
import { useTTS } from '@/hooks/useTTS';
import voiceDictionary from '@/lib/voiceDictionary';

export interface TypingEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

function formatLastKey(key: string) {
  if (key === ' ') {
    return 'Space';
  }

  if (key === 'Backspace') {
    return 'Backspace';
  }

  if (key === 'Enter') {
    return 'Enter';
  }

  if (key === 'Escape') {
    return 'Escape';
  }

  return key;
}

export default function TypingEditor({
  isOpen,
  onClose,
  onSearch,
}: TypingEditorProps) {
  const { speak, stop } = useTTS();
  const [pendingResult, setPendingResult] =
    useState<KeyboardReaderSubmitResult | null>(null);
  const [completionCandidate, setCompletionCandidate] =
    useState<KeyboardReaderSubmitResult | null>(null);
  const [completedQuery, setCompletedQuery] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);

  const closeRequestedRef = useRef(false);
  const closingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const stopListeningRef = useRef<() => void>(() => {});
  const clearTextRef = useRef<() => void>(() => {});
  const stopSpeechRef = useRef<() => void>(() => {});
  const onCloseRef = useRef(onClose);
  const onSearchRef = useRef(onSearch);
  const handleCloseRef = useRef<() => void>(() => {});

  async function handleSubmit(text: string) {
    const trimmedText = text.trim();

    setPendingResult(null);
    setCompletionCandidate(null);

    if (!trimmedText) {
      const emptyResult: KeyboardReaderSubmitResult = {
        hasTypo: false,
        original: '',
        corrected: '',
        explanation: 'Please type something first.',
      };

      setCompletionCandidate(emptyResult);
      return emptyResult;
    }

    const response = await fetch('/api/typo-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: trimmedText }),
    });

    const payload = (await response.json()) as Partial<KeyboardReaderSubmitResult> & {
      error?: string;
    };

    if (!response.ok) {
      if (response.status === 400 && payload.error === 'Text is required') {
        const emptyResult: KeyboardReaderSubmitResult = {
          hasTypo: false,
          original: '',
          corrected: '',
          explanation: 'Please type something first.',
        };

        setCompletionCandidate(emptyResult);
        return emptyResult;
      }

      throw new Error(payload.error ?? 'Failed to check text');
    }

    const result: KeyboardReaderSubmitResult = {
      hasTypo: Boolean(payload.hasTypo),
      original: payload.original ?? trimmedText,
      corrected: payload.corrected ?? trimmedText,
      explanation: payload.explanation,
    };

    if (result.hasTypo) {
      setPendingResult(result);
      return result;
    }

    setCompletionCandidate(result);
    return result;
  }

  const {
    currentText,
    isListening,
    isProcessing,
    startListening,
    stopListening,
    clearText,
  } = useKeyboardReader(handleSubmit, speak);

  startListeningRef.current = startListening;
  stopListeningRef.current = stopListening;
  clearTextRef.current = clearText;
  stopSpeechRef.current = stop;
  onCloseRef.current = onClose;
  onSearchRef.current = onSearch;

  const handleClose = () => {
    if (closingRef.current) {
      return;
    }

    closingRef.current = true;
    clearTextRef.current();
    stopListeningRef.current();
    stopSpeechRef.current();
    onCloseRef.current();
  };

  handleCloseRef.current = handleClose;

  useEffect(() => {
    if (!isOpen) {
      closingRef.current = false;
      closeRequestedRef.current = false;
      setPendingResult(null);
      setCompletionCandidate(null);
      setCompletedQuery(null);
      setLastKey(null);
      clearTextRef.current();
      stopListeningRef.current();
      stopSpeechRef.current();
      return;
    }

    closingRef.current = false;
    closeRequestedRef.current = false;
    setPendingResult(null);
    setCompletionCandidate(null);
    setCompletedQuery(null);
    setLastKey(null);
    clearTextRef.current();
    startListeningRef.current();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePreviewKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (
        event.key.length === 1 ||
        event.key === ' ' ||
        event.key === 'Backspace' ||
        event.key === 'Enter' ||
        event.key === 'Escape'
      ) {
        setLastKey(formatLastKey(event.key));
      }

      if (event.key === 'Escape') {
        closeRequestedRef.current = true;
      }
    };

    document.addEventListener('keydown', handlePreviewKey);

    return () => {
      document.removeEventListener('keydown', handlePreviewKey);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!lastKey) {
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      setLastKey(null);
    }, 700);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [lastKey]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (pendingResult) {
      if (!isProcessing && !isListening && currentText === pendingResult.corrected) {
        setCompletedQuery(pendingResult.corrected);
        setPendingResult(null);
        return;
      }

      if (!isProcessing && isListening && currentText === '') {
        setPendingResult(null);
      }

      return;
    }

    if (!completionCandidate || isProcessing || isListening) {
      return;
    }

    if (!completionCandidate.corrected.trim()) {
      setCompletionCandidate(null);
      startListeningRef.current();
      return;
    }

    setCompletedQuery(completionCandidate.corrected);
    setCompletionCandidate(null);
  }, [
    completionCandidate,
    currentText,
    isListening,
    isOpen,
    isProcessing,
    pendingResult,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      closingRef.current ||
      !closeRequestedRef.current ||
      isListening ||
      isProcessing ||
      currentText !== '' ||
      pendingResult
    ) {
      return;
    }

    handleCloseRef.current();
  }, [currentText, isListening, isOpen, isProcessing, pendingResult]);

  useEffect(() => {
    if (!isOpen || !completedQuery || closingRef.current) {
      return;
    }

    closingRef.current = true;

    const closeTimer = window.setTimeout(() => {
      clearTextRef.current();
      stopListeningRef.current();
      stopSpeechRef.current();
      onSearchRef.current(completedQuery);
      onCloseRef.current();
    }, 180);

    return () => {
      window.clearTimeout(closeTimer);
    };
  }, [completedQuery, isOpen]);

  if (!isOpen) {
    return null;
  }

  const viewState = completedQuery
    ? 'COMPLETE'
    : isProcessing
      ? 'CHECKING'
      : pendingResult
        ? 'CONFIRMING'
        : currentText
          ? 'TYPING'
          : 'IDLE';

  const statusText =
    viewState === 'IDLE'
      ? voiceDictionary.typingEditor.idle
      : viewState === 'CHECKING'
      ? voiceDictionary.typingEditor.checking
      : viewState === 'CONFIRMING'
        ? voiceDictionary.typingEditor.confirming
        : viewState === 'COMPLETE'
          ? voiceDictionary.typingEditor.complete
          : voiceDictionary.typingEditor.listening;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-access-bg/95 px-6 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={voiceDictionary.typingEditor.title}
      aria-describedby="typing-editor-status"
    >
      <div className="w-full max-w-4xl rounded-[2rem] border border-access-accent/50 bg-access-zone px-8 py-10 text-center shadow-[0_0_0_1px_rgba(255,215,0,0.14)]">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="text-left">
            <p className="text-lg uppercase tracking-[0.22em] text-access-highlight">
              {voiceDictionary.zones.search.enter}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-access-text sm:text-4xl">
              {voiceDictionary.typingEditor.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label={voiceDictionary.typingEditor.close}
            className="min-h-[44px] min-w-[44px] shrink-0 rounded-full border border-access-accent/40 px-5 text-lg font-medium text-access-text transition hover:border-access-accent hover:text-access-accent focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-access-highlight motion-reduce:transition-none"
            onClick={() => handleCloseRef.current()}
          >
            Esc
          </button>
        </div>

        <div className="mx-auto max-w-3xl rounded-[1.75rem] border border-access-text/10 bg-access-bg px-6 py-12">
          <p
            id="typing-editor-status"
            className="mb-5 text-lg uppercase tracking-[0.18em] text-access-accent"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {statusText}
          </p>

          {viewState === 'CONFIRMING' && pendingResult ? (
            <div className="space-y-6">
              <p className="text-lg leading-8 text-access-text/80">
                {pendingResult.explanation ||
                  voiceDictionary.typoCorrection.hasTypo(
                    pendingResult.original,
                    pendingResult.corrected,
                  )}
              </p>
              <div className="rounded-[1.5rem] border border-access-highlight/35 bg-access-zone px-6 py-6">
                <p className="text-lg uppercase tracking-[0.18em] text-access-highlight">
                  {voiceDictionary.typingEditor.correctedLabel}
                </p>
                <p className="mt-4 break-words text-4xl font-semibold text-access-text sm:text-5xl">
                  {pendingResult.corrected}
                </p>
              </div>
              <p className="text-lg text-access-text/70">
                {voiceDictionary.typingEditor.originalLabel}: {pendingResult.original}
              </p>
              <p className="text-lg text-access-text/80">
                {voiceDictionary.typingEditor.acceptHint} {voiceDictionary.typingEditor.retryHint}
              </p>
            </div>
          ) : (
            <div className="min-h-[10rem]">
              <p className="break-words text-4xl font-semibold leading-tight text-access-text sm:text-5xl">
                {currentText || (
                  <span className="text-access-text/35">
                    {voiceDictionary.typingEditor.idle}
                    <span className="ml-2 inline-block h-[1.1em] w-1 animate-pulse motion-reduce:animate-none rounded-full bg-access-accent align-middle" aria-hidden="true" />
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <div className="rounded-full border border-access-text/10 bg-access-bg px-5 py-3 text-lg text-access-text/80">
            {viewState}
          </div>
          {lastKey ? (
            <div
              className="rounded-full border border-access-highlight/40 bg-access-highlight/10 px-5 py-3 text-lg text-access-highlight"
              aria-live="polite"
              aria-atomic="true"
            >
              {voiceDictionary.typingEditor.lastKeyLabel}: {lastKey}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
