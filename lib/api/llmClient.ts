import type { AIResponse } from "@/types/chat";

export async function callLLM(
  system: string,
  messages: { role: string; content: string }[]
): Promise<AIResponse> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const raw: string = data.content?.[0]?.text || "";
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      return JSON.parse(m ? m[0] : raw);
    } catch {
      return {
        speaker: "제갈량",
        dialogue: raw,
        emotion: "calm",
        choices: null,
        state_changes: null,
      };
    }
  } catch (err) {
    console.error("API error:", err);
    return {
      speaker: "제갈량",
      dialogue: "소신이 잠시 생각을 정리하고 있사옵니다... (연결 오류가 발생했습니다)",
      emotion: "thoughtful",
      choices: null,
      state_changes: null,
    };
  }
}
