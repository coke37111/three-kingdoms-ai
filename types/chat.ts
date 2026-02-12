export type Emotion = "calm" | "worried" | "excited" | "angry" | "thoughtful";

export type LLMProvider = "claude" | "openai";

export interface Choice {
  id: string;
  text: string;
  risk: "low" | "medium" | "high";
  preview: string;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface NormalizedLLMResponse {
  text: string;
  usage: { input_tokens: number; output_tokens: number } | null;
  provider: LLMProvider;
  cached?: boolean;
}

export interface AIResponse {
  speaker: string;
  dialogue: string;
  emotion: Emotion;
  choices: Choice[] | null;
  state_changes: import("./game").StateChanges | null;
}

export interface LLMResult {
  response: AIResponse;
  usage: TokenUsage | null;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  emotion?: Emotion;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// NPC 세력 AI 응답 (Phase C)
export interface FactionAIAction {
  action: "개발" | "모병" | "공격" | "외교" | "방어" | "대기";
  target?: string;
  details?: string;
  reasoning?: string;
}

export interface FactionAIResponse {
  factionId: import("./game").FactionId;
  actions: FactionAIAction[];
  summary: string;
}
