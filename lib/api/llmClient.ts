import type { AIResponse, LLMResult } from "@/types/chat";

export async function callLLM(
  system: string,
  messages: { role: string; content: string }[]
): Promise<LLMResult> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const raw: string = data.content?.[0]?.text || "";
    const usage = data.usage ?? null;

    let response: AIResponse;
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      let jsonStr = m ? m[0] : raw;

      try {
        response = JSON.parse(jsonStr);
      } catch {
        let braces = 0, brackets = 0;
        let inString = false, escape = false;
        for (const ch of jsonStr) {
          if (escape) { escape = false; continue; }
          if (ch === '\\') { escape = true; continue; }
          if (ch === '"') { inString = !inString; continue; }
          if (inString) continue;
          if (ch === '{') braces++;
          else if (ch === '}') braces--;
          else if (ch === '[') brackets++;
          else if (ch === ']') brackets--;
        }
        if (inString) jsonStr += '"';
        while (brackets > 0) { jsonStr += ']'; brackets--; }
        while (braces > 0) { jsonStr += '}'; braces--; }
        response = JSON.parse(jsonStr);
      }
    } catch {
      response = {
        speaker: "제갈량",
        dialogue: raw,
        emotion: "calm",
        choices: null,
        state_changes: null,
      };
    }

    return { response, usage };
  } catch (err) {
    console.error("API error:", err);
    return {
      response: {
        speaker: "제갈량",
        dialogue: "소신이 잠시 생각을 정리하고 있사옵니다... (연결 오류가 발생했습니다)",
        emotion: "thoughtful",
        choices: null,
        state_changes: null,
      },
      usage: null,
    };
  }
}
