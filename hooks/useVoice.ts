"use client";

import { useState, useCallback } from "react";
import { getSTTEngine } from "@/lib/voice/sttEngine";

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");

  const startListening = useCallback((onResult: (text: string) => void) => {
    const stt = getSTTEngine();
    setIsListening(true);
    setPartialTranscript("");

    stt.startListening(
      (text) => {
        setIsListening(false);
        setPartialTranscript("");
        onResult(text);
      },
      (error) => {
        setIsListening(false);
        setPartialTranscript("");
        console.error("STT error:", error);
      },
    );
  }, []);

  const stopListening = useCallback(() => {
    getSTTEngine().stopListening();
  }, []);

  return {
    startListening,
    stopListening,
    isListening,
    partialTranscript,
  };
}
