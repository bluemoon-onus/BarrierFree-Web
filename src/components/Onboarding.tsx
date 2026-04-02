'use client';

import { useEffect, useRef, useState } from 'react';

import { useTTS } from '@/hooks/useTTS';
import voiceDictionary from '@/lib/voiceDictionary';

const STORAGE_KEY = 'BarrierFree-Web_onboarded';
const EXIT_TRANSITION_MS = 260;

type DisplayState = 'hidden' | 'visible' | 'exiting';

export interface OnboardingProps {
  replayTrigger?: number;
  onDismiss?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

function getTransitionDuration() {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return 0;
  }

  return EXIT_TRANSITION_MS;
}

export default function Onboarding({
  replayTrigger = 0,
  onDismiss,
  onVisibilityChange,
}: OnboardingProps) {
  const { isSupported, speak, stop } = useTTS();
  const [displayState, setDisplayState] = useState<DisplayState>('hidden');
  const [isReady, setIsReady] = useState(false);

  const dialogRef = useRef<HTMLElement | null>(null);
  const dismissTimeoutRef = useRef<number | null>(null);
  const replayTriggerRef = useRef(replayTrigger);
  const playbackTokenRef = useRef(0);
  const onDismissRef = useRef(onDismiss);
  const onVisibilityChangeRef = useRef(onVisibilityChange);
  const openGuideRef = useRef<() => void>(() => {});
  const dismissGuideRef = useRef<(stopSpeech: boolean) => void>(() => {});

  onDismissRef.current = onDismiss;
  onVisibilityChangeRef.current = onVisibilityChange;

  const isVisible = displayState !== 'hidden';
  const isExiting = displayState === 'exiting';

  function clearDismissTimeout() {
    if (dismissTimeoutRef.current !== null) {
      window.clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }

  function finalizeDismiss() {
    setDisplayState('hidden');
    onDismissRef.current?.();
  }

  function dismissGuide(stopSpeech: boolean) {
    if (!isVisible || isExiting) {
      return;
    }

    playbackTokenRef.current += 1;

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    }

    if (stopSpeech) {
      stop();
    }

    clearDismissTimeout();
    setDisplayState('exiting');

    dismissTimeoutRef.current = window.setTimeout(() => {
      finalizeDismiss();
    }, getTransitionDuration());
  }

  function openGuide() {
    playbackTokenRef.current += 1;
    clearDismissTimeout();
    setDisplayState('visible');

    window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);
  }

  openGuideRef.current = openGuide;
  dismissGuideRef.current = dismissGuide;

  useEffect(() => {
    onVisibilityChangeRef.current?.(isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setIsReady(true);

    if (window.localStorage.getItem(STORAGE_KEY) === 'true') {
      return () => {
        clearDismissTimeout();
        playbackTokenRef.current += 1;
        stop();
      };
    }

    openGuideRef.current();

    return () => {
      clearDismissTimeout();
      playbackTokenRef.current += 1;
      stop();
    };
  }, [stop]);

  useEffect(() => {
    if (!isReady || replayTrigger === replayTriggerRef.current) {
      return;
    }

    replayTriggerRef.current = replayTrigger;
    openGuideRef.current();
  }, [isReady, replayTrigger]);

  useEffect(() => {
    if (!isVisible || !isSupported || isExiting) {
      return;
    }

    const playbackToken = playbackTokenRef.current;

    void (async () => {
      await speak(voiceDictionary.onboarding.welcome, {
        priority: 'high',
      });

      if (playbackToken !== playbackTokenRef.current) {
        return;
      }

      await speak(voiceDictionary.onboarding.instructions);

      if (playbackToken !== playbackTokenRef.current) {
        return;
      }

      await speak(voiceDictionary.onboarding.startPrompt);

      if (playbackToken !== playbackTokenRef.current) {
        return;
      }

      dismissGuideRef.current(false);
    })();
  }, [isExiting, isSupported, isVisible, speak]);

  useEffect(() => {
    if (!isVisible || isExiting) {
      return;
    }

    const handleDismissIntent = () => {
      dismissGuideRef.current(true);
    };

    document.addEventListener('keydown', handleDismissIntent);
    document.addEventListener('pointerdown', handleDismissIntent);

    return () => {
      document.removeEventListener('keydown', handleDismissIntent);
      document.removeEventListener('pointerdown', handleDismissIntent);
    };
  }, [isExiting, isVisible]);

  if (!isReady || !isVisible) {
    return null;
  }

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex items-center justify-center bg-access-bg/76 px-6 py-8 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none',
        isExiting ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        tabIndex={-1}
        className={[
          'w-full max-w-3xl rounded-[2rem] border border-access-accent/65 bg-access-zone/95 px-8 py-10 text-center shadow-[0_0_0_1px_rgba(255,215,0,0.16),0_24px_60px_rgba(0,0,0,0.35)] transition duration-300 motion-reduce:transition-none sm:px-10',
          isExiting ? 'scale-[0.98] opacity-0' : 'scale-100 opacity-100',
        ].join(' ')}
      >
        <p className="text-sm uppercase tracking-[0.34em] text-access-highlight">
          Welcome Guide
        </p>
        <h2
          id="onboarding-title"
          className="mt-4 text-3xl font-semibold text-access-text sm:text-4xl"
        >
          BarrierFree-Web
        </h2>

        <div
          id="onboarding-description"
          className="mt-8 space-y-5 text-lg leading-8 text-access-text/86"
        >
          <p>{voiceDictionary.onboarding.welcome}</p>
          <p>{voiceDictionary.onboarding.instructions}</p>
          <p className="text-access-accent">{voiceDictionary.onboarding.startPrompt}</p>
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-access-highlight/35 bg-access-bg/65 px-5 py-4 text-base leading-7 text-access-text/80">
          Click anywhere or press any key to continue. The guide will also close
          automatically after the spoken intro finishes.
        </div>
      </section>
    </div>
  );
}
