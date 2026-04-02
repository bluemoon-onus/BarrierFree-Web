"use client";

import { useEffect, useRef, useState } from "react";

import voiceDictionary from "@/lib/voiceDictionary";
import type { SpeakOptions } from "@/lib/speechUtils";

type KeyboardReaderMode = "idle" | "listening" | "processing" | "confirming";

export interface KeyboardReaderSubmitResult {
  hasTypo: boolean;
  original: string;
  corrected: string;
  explanation?: string;
}

type SubmitHandler = (
  text: string,
) => Promise<void | KeyboardReaderSubmitResult>;

type TtsSpeak = (
  text: string,
  options?: SpeakOptions,
) => Promise<void>;

function isKeyboardReaderSubmitResult(
  value: void | KeyboardReaderSubmitResult,
): value is KeyboardReaderSubmitResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "hasTypo" in value &&
    "original" in value &&
    "corrected" in value
  );
}

export function useKeyboardReader(
  onSubmit: SubmitHandler,
  ttsSpeak: TtsSpeak,
): {
  currentText: string;
  isListening: boolean;
  isProcessing: boolean;
  startListening: () => void;
  stopListening: () => void;
  clearText: () => void;
} {
  const [currentText, setCurrentText] = useState("");
  const [mode, setMode] = useState<KeyboardReaderMode>("idle");
  const [pendingCorrection, setPendingCorrection] =
    useState<KeyboardReaderSubmitResult | null>(null);

  const currentTextRef = useRef(currentText);
  const modeRef = useRef(mode);
  const pendingCorrectionRef = useRef(pendingCorrection);
  const onSubmitRef = useRef(onSubmit);
  const ttsSpeakRef = useRef(ttsSpeak);
  const acceptCorrectionRef = useRef<() => void>(() => {});
  const retryCorrectionRef = useRef<() => void>(() => {});
  const clearAndExitRef = useRef<() => void>(() => {});
  const submitCurrentTextRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    ttsSpeakRef.current = ttsSpeak;
  }, [ttsSpeak]);

  const updateCurrentText = (
    updater: string | ((previousValue: string) => string),
  ) => {
    setCurrentText((previousValue) => {
      const nextValue =
        typeof updater === "function" ? updater(previousValue) : updater;
      currentTextRef.current = nextValue;
      return nextValue;
    });
  };

  const updateMode = (nextMode: KeyboardReaderMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
  };

  const updatePendingCorrection = (
    nextValue: KeyboardReaderSubmitResult | null,
  ) => {
    pendingCorrectionRef.current = nextValue;
    setPendingCorrection(nextValue);
  };

  const speakImmediately = (text: string) => {
    void ttsSpeakRef.current(text, { priority: "high" });
  };

  const clearText = () => {
    updateCurrentText("");
    updatePendingCorrection(null);
  };

  const startListening = () => {
    updatePendingCorrection(null);
    updateMode("listening");
  };

  const stopListening = () => {
    updatePendingCorrection(null);
    updateMode("idle");
  };

  const acceptCorrection = () => {
    const correction = pendingCorrectionRef.current;

    if (!correction) {
      return;
    }

    updateCurrentText(correction.corrected);
    updatePendingCorrection(null);
    updateMode("idle");
    speakImmediately(
      voiceDictionary.typoCorrection.accepted(correction.corrected),
    );
  };

  const retryCorrection = () => {
    clearText();
    updateMode("listening");
    speakImmediately(voiceDictionary.typoCorrection.retry);
  };

  const clearAndExit = () => {
    clearText();
    updateMode("idle");
    speakImmediately(voiceDictionary.keyboard.escape);
  };

  const submitCurrentText = async () => {
    updateMode("processing");
    speakImmediately(voiceDictionary.keyboard.enter);

    try {
      const result = await onSubmitRef.current(currentTextRef.current);

      if (!isKeyboardReaderSubmitResult(result)) {
        updatePendingCorrection(null);
        updateMode("idle");
        return;
      }

      if (result.hasTypo) {
        updatePendingCorrection(result);
        updateMode("confirming");
        speakImmediately(
          result.explanation ||
            voiceDictionary.typoCorrection.hasTypo(
              result.original,
              result.corrected,
            ),
        );
        return;
      }

      const resolvedText = result.corrected || result.original;
      updateCurrentText(resolvedText);
      updatePendingCorrection(null);
      updateMode("idle");
      speakImmediately(
        result.explanation ||
          voiceDictionary.typoCorrection.noTypo(resolvedText),
      );
    } catch {
      updatePendingCorrection(null);
      updateMode("listening");
      speakImmediately(voiceDictionary.typoCorrection.error);
    }
  };

  acceptCorrectionRef.current = acceptCorrection;
  retryCorrectionRef.current = retryCorrection;
  clearAndExitRef.current = clearAndExit;
  submitCurrentTextRef.current = submitCurrentText;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const currentMode = modeRef.current;

      if (currentMode === "idle") {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        clearAndExitRef.current();
        return;
      }

      if (currentMode === "processing") {
        event.preventDefault();
        return;
      }

      if (currentMode === "confirming") {
        if (event.key === "Enter") {
          event.preventDefault();
          acceptCorrectionRef.current();
        } else if (event.key === " ") {
          event.preventDefault();
          retryCorrectionRef.current();
        }

        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void submitCurrentTextRef.current();
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        updateCurrentText((previousValue) => previousValue.slice(0, -1));
        speakImmediately(voiceDictionary.keyboard.backspace);
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        updateCurrentText((previousValue) => `${previousValue} `);
        speakImmediately(voiceDictionary.keyboard.space);
        return;
      }

      if (event.key.length === 1) {
        updateCurrentText((previousValue) => `${previousValue}${event.key}`);
        speakImmediately(voiceDictionary.keyboard.keyPress(event.key));
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return {
    currentText,
    isListening: mode !== "idle",
    isProcessing: mode === "processing",
    startListening,
    stopListening,
    clearText,
  };
}
