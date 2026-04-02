"use client";

import { useEffect, useState } from "react";

import {
  initTTS,
  isSpeaking as getIsSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  speak,
  stopSpeaking,
} from "@/lib/speechUtils";

const TTS_STATE_EVENT = "barrierfree-web:tts-state-change";

export function useTTS() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const supported = "speechSynthesis" in window;

    setIsSupported(supported);
    setIsSpeaking(supported ? getIsSpeaking() : false);

    if (!supported) {
      return;
    }

    const syncSpeakingState = () => {
      setIsSpeaking(getIsSpeaking());
    };

    void initTTS().finally(syncSpeakingState);
    window.addEventListener(TTS_STATE_EVENT, syncSpeakingState);

    return () => {
      window.removeEventListener(TTS_STATE_EVENT, syncSpeakingState);
    };
  }, []);

  return {
    speak,
    stop: stopSpeaking,
    pause: pauseSpeaking,
    resume: resumeSpeaking,
    isSpeaking,
    isSupported,
  };
}
