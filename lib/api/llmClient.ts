import type { AIResponse, LLMResult, LLMProvider } from "@/types/chat";

export interface CallLLMOptions {
  skipCache?: boolean;
}

export async function callLLM(
  system: string,
  messages: { role: string; content: string }[],
  provider: LLMProvider = "openai",
  options?: CallLLMOptions,
): Promise<LLMResult> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages, provider, skipCache: options?.skipCache }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // 서버에서 정규화된 응답: { text, usage, provider, cached }
    const raw: string = data.text || "";
    const usage = data.cached ? null : (data.usage ?? null);

    let response: AIResponse;
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      let jsonStr = m ? m[0] : raw;

      try {
        response = JSON.parse(jsonStr);
      } catch {
        // 1단계: 괄호 균형 복구 (부족 + 초과 모두 처리)
        let repaired = "";
        let braces = 0, brackets = 0;
        let inString = false, escape = false;
        for (const ch of jsonStr) {
          if (escape) { escape = false; repaired += ch; continue; }
          if (ch === '\\') { escape = true; repaired += ch; continue; }
          if (ch === '"') { inString = !inString; repaired += ch; continue; }
          if (inString) { repaired += ch; continue; }
          if (ch === '{') { braces++; repaired += ch; }
          else if (ch === '}') { if (braces > 0) { braces--; repaired += ch; } }
          else if (ch === '[') { brackets++; repaired += ch; }
          else if (ch === ']') { if (brackets > 0) { brackets--; repaired += ch; } }
          else { repaired += ch; }
        }
        if (inString) repaired += '"';
        while (brackets > 0) { repaired += ']'; brackets--; }
        while (braces > 0) { repaired += '}'; braces--; }

        // 2단계: 후행 쉼표 제거
        repaired = repaired.replace(/,\s*([}\]])/g, '$1');

        response = JSON.parse(repaired);
      }
    } catch {
      // 3단계: regex로 필드 직접 추출
      const dMatch = raw.match(/"dialogue"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const eMatch = raw.match(/"emotion"\s*:\s*"(\w+)"/);
      const cMatch = raw.match(/"choices"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);

      let choices: AIResponse["choices"] = null;
      if (cMatch) {
        try { choices = JSON.parse(cMatch[1]); } catch { /* 무시 */ }
      }

      response = {
        speaker: "제갈량",
        dialogue: dMatch ? dMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : raw,
        emotion: (eMatch?.[1] as AIResponse["emotion"]) || "calm",
        choices,
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
