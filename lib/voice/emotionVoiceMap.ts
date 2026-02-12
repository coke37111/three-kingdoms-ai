import type { Emotion } from "@/types/chat";
import type { EmotionVoiceParams } from "./types";

const emotionVoiceMap: Record<Emotion, EmotionVoiceParams> = {
  calm:       { speedMultiplier: 0.95 },
  worried:    { speedMultiplier: 1.05 },
  excited:    { speedMultiplier: 1.15 },
  angry:      { speedMultiplier: 1.1 },
  thoughtful: { speedMultiplier: 0.85 },
};

export function getEmotionParams(emotion: Emotion): EmotionVoiceParams {
  return emotionVoiceMap[emotion] || emotionVoiceMap.calm;
}
