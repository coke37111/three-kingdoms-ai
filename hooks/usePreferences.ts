"use client";

import { useState, useEffect, useCallback } from "react";
import type { LLMProvider } from "@/types/chat";
import { loadUserPreferences, saveUserPreferences } from "@/lib/firebase/firestore";

const DEFAULT_PROVIDER: LLMProvider = "openai";

export function usePreferences(uid: string | null) {
  const [llmProvider, setLlmProviderRaw] = useState<LLMProvider>(DEFAULT_PROVIDER);
  const [prefsLoading, setPrefsLoading] = useState(false);

  // uid 변경 시 Firebase에서 로드
  useEffect(() => {
    if (!uid) {
      setLlmProviderRaw(DEFAULT_PROVIDER);
      return;
    }

    setPrefsLoading(true);
    loadUserPreferences(uid)
      .then((prefs) => {
        if (prefs?.llmProvider) {
          setLlmProviderRaw(prefs.llmProvider);
        }
      })
      .finally(() => setPrefsLoading(false));
  }, [uid]);

  const setLlmProvider = useCallback(
    (provider: LLMProvider) => {
      setLlmProviderRaw(provider);
      if (uid) {
        saveUserPreferences(uid, { llmProvider: provider });
      }
    },
    [uid],
  );

  return { llmProvider, setLlmProvider, prefsLoading };
}
