'use client';

import { useEffect, useState } from 'react';

import {
  isSpeaking as getIsSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  speak,
  stopSpeaking,
  TTS_STATE_EVENT,
} from '@/lib/speechUtils';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sync = () => setIsSpeaking(getIsSpeaking());
    window.addEventListener(TTS_STATE_EVENT, sync);
    return () => window.removeEventListener(TTS_STATE_EVENT, sync);
  }, []);

  return {
    speak,
    stop: stopSpeaking,
    pause: pauseSpeaking,
    resume: resumeSpeaking,
    isSpeaking,
    isSupported: true,
  };
}
