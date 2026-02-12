"use client";

import { useState, useCallback, useRef } from "react";
import type { Emotion } from "@/types/chat";
import { DEFAULT_VOICE_SETTINGS, type VoiceSettings } from "@/lib/voice/types";
import { getTTSEngine } from "@/lib/voice/ttsEngine";
import { getSTTEngine } from "@/lib/voice/sttEngine";

const STORAGE_KEY = "three_kingdoms_voice_settings";

function loadSettings(): VoiceSettings {
  if (typeof window === "undefined") return DEFAULT_VOICE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_VOICE_SETTINGS;
}

function persistSettings(settings: VoiceSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function useVoice() {
  const [settings, setSettings] = useState<VoiceSettings>(loadSettings);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const updateSettings = useCallback((patch: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      persistSettings(next);
      return next;
    });
  }, []);

  const speak = useCallback((text: string, emotion: Emotion) => {
    const s = settingsRef.current;
    if (!s.ttsEnabled) return;

    const tts = getTTSEngine();
    setIsSpeaking(true);
    tts.speak(text, emotion, s.volume, s.speed).finally(() => {
      setIsSpeaking(false);
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    getTTSEngine().stop();
    setIsSpeaking(false);
  }, []);

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
    // isListening will be set to false when the result callback fires
  }, []);

  return {
    settings,
    updateSettings,
    speak,
    stopSpeaking,
    isSpeaking,
    startListening,
    stopListening,
    isListening,
    partialTranscript,
  };
}
