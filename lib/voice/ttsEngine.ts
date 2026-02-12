import type { Emotion } from "@/types/chat";
import { getEmotionParams } from "./emotionVoiceMap";

const MAX_CACHE_SIZE = 20;

function stripKeywordMarkers(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, "$1");
}

function makeCacheKey(text: string, emotion: Emotion, speed: number): string {
  return `${emotion}:${speed}:${text}`;
}

class TTSEngine {
  private audio: HTMLAudioElement | null = null;
  private cache = new Map<string, string>();
  private speaking = false;

  async speak(text: string, emotion: Emotion, volume: number, speed: number): Promise<void> {
    this.stop();

    const cleanText = stripKeywordMarkers(text);
    if (!cleanText.trim()) return;

    const emotionParams = getEmotionParams(emotion);
    const finalSpeed = speed * emotionParams.speedMultiplier;
    const cacheKey = makeCacheKey(cleanText, emotion, finalSpeed);

    let blobUrl = this.cache.get(cacheKey);

    if (!blobUrl) {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText, speed: finalSpeed }),
      });

      if (!res.ok) {
        console.error("TTS API error:", res.status);
        return;
      }

      const blob = await res.blob();
      blobUrl = URL.createObjectURL(blob);

      // Evict oldest cache entry if at capacity
      if (this.cache.size >= MAX_CACHE_SIZE) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          const oldUrl = this.cache.get(firstKey);
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          this.cache.delete(firstKey);
        }
      }
      this.cache.set(cacheKey, blobUrl);
    }

    return new Promise<void>((resolve) => {
      this.audio = new Audio(blobUrl);
      this.audio.volume = volume;
      this.speaking = true;

      this.audio.onended = () => {
        this.speaking = false;
        this.audio = null;
        resolve();
      };

      this.audio.onerror = () => {
        this.speaking = false;
        this.audio = null;
        resolve();
      };

      this.audio.play().catch(() => {
        this.speaking = false;
        this.audio = null;
        resolve();
      });
    });
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    this.speaking = false;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }
}

// Singleton
let engine: TTSEngine | null = null;

export function getTTSEngine(): TTSEngine {
  if (!engine) {
    engine = new TTSEngine();
  }
  return engine;
}
