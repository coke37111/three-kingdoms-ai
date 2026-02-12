import type { Emotion } from "@/types/chat";

export interface VoiceSettings {
  ttsEnabled: boolean;
  volume: number;      // 0.0 ~ 1.0
  speed: number;       // 0.5 ~ 2.0
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  ttsEnabled: false,
  volume: 0.8,
  speed: 1.0,
};

export interface EmotionVoiceParams {
  speedMultiplier: number;
}
