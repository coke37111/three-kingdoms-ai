import type { AIResponse, LLMResult, LLMProvider } from "@/types/chat";
import type { CouncilResponse, CouncilMessage, AdvisorStatsDelta } from "@/types/council";

export interface CouncilLLMResult {
  council: CouncilResponse;
  advisorUpdates: AdvisorStatsDelta[];
  usage: { input_tokens: number; output_tokens: number } | null;
}

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

    const raw: string = data.text || "";
    const usage = data.cached ? null : (data.usage ?? null);

    let response: AIResponse;
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      let jsonStr = m ? m[0] : raw;

      try {
        response = JSON.parse(jsonStr);
      } catch {
        response = JSON.parse(repairJSON(jsonStr));
      }
    } catch {
      const dMatch = raw.match(/"dialogue"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const eMatch = raw.match(/"emotion"\s*:\s*"(\w+)"/);

      response = {
        speaker: "제갈량",
        dialogue: dMatch ? dMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : raw,
        emotion: (eMatch?.[1] as AIResponse["emotion"]) || "calm",
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

function repairJSON(jsonStr: string): string {
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
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');
  return repaired;
}

// 참모 역할별 키워드 매핑 (speaker 재분배용)
const ADVISOR_KEYWORDS: Record<string, string[]> = {
  "관우": ["군사", "공격", "출격", "전투", "병력", "선봉", "무력", "싸움", "방어", "훈련"],
  "미축": ["내정", "금", "식량", "자원", "경제", "상업", "농업", "재정", "개발", "비용"],
  "간옹": ["외교", "동맹", "화친", "교섭", "관계", "교역", "손권", "조조", "협상", "사신"],
  "조운": ["정보", "첩보", "정찰", "동향", "탐색", "감시", "보고", "분석", "적진", "수색"],
};

/**
 * AI 응답의 council_messages에서 speaker 다양성을 보장.
 * 모든 speaker가 동일인이면 키워드 기반으로 재분배.
 */
function ensureSpeakerDiversity(msgs: CouncilMessage[], replyTo?: string): CouncilMessage[] {
  if (msgs.length <= 1) return msgs;

  const speakers = new Set(msgs.map((m) => m.speaker));
  if (speakers.size >= 2) return msgs;

  const result: CouncilMessage[] = [];
  const usedAdvisors = new Set<string>();

  for (let i = 0; i < msgs.length; i++) {
    const msg = msgs[i];

    if (i === 0 || i === msgs.length - 1) {
      // replyTo 지정 시 첫 메시지 speaker 보존
      const speaker = (i === 0 && replyTo) ? replyTo : "제갈량";
      result.push({ ...msg, speaker });
      continue;
    }

    let bestAdvisor = "";
    let bestScore = 0;
    for (const [advisor, keywords] of Object.entries(ADVISOR_KEYWORDS)) {
      const score = keywords.filter((kw) => msg.dialogue.includes(kw)).length;
      if (score > bestScore && !usedAdvisors.has(advisor)) {
        bestScore = score;
        bestAdvisor = advisor;
      }
    }

    if (!bestAdvisor) {
      const advisorList = ["관우", "미축", "간옹", "조운"];
      bestAdvisor = advisorList.find((a) => !usedAdvisors.has(a)) || advisorList[i % advisorList.length];
    }

    usedAdvisors.add(bestAdvisor);
    result.push({ ...msg, speaker: bestAdvisor });
  }

  return result;
}

export interface CouncilLLMOptions extends CallLLMOptions {
  replyTo?: string;
}

export async function callCouncilLLM(
  system: string,
  messages: { role: string; content: string }[],
  provider: LLMProvider = "openai",
  options?: CouncilLLMOptions,
): Promise<CouncilLLMResult> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages, provider, skipCache: options?.skipCache }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const raw: string = data.text || "";
    const usage = data.cached ? null : (data.usage ?? null);

    let parsed: CouncilResponse & { advisor_updates?: AdvisorStatsDelta[] };
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      const jsonStr = m ? m[0] : raw;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        parsed = JSON.parse(repairJSON(jsonStr));
      }
    } catch {
      // 폴백: 수치 변화 없는 안전한 응답
      parsed = {
        council_messages: [
          { speaker: "제갈량", dialogue: "주공, 잠시 생각을 정리하고 있사옵니다...", emotion: "thoughtful" },
        ],
        auto_actions: [],
        approval_requests: [],
        state_changes: null,
      };
    }

    // council_messages 유효성 보장
    if (!Array.isArray(parsed.council_messages) || parsed.council_messages.length === 0) {
      parsed.council_messages = [
        { speaker: "제갈량", dialogue: "주공, 현 정세를 살펴봅시다.", emotion: "calm" },
      ];
    }

    // auto_actions 유효성 보장
    if (!Array.isArray(parsed.auto_actions)) {
      parsed.auto_actions = [];
    }

    // approval_requests 유효성 보장
    if (!Array.isArray(parsed.approval_requests)) {
      parsed.approval_requests = [];
    }

    // auto_actions가 있을 때 speaker 다양성 보장
    if (parsed.auto_actions.length > 0) {
      parsed.council_messages = ensureSpeakerDiversity(parsed.council_messages, options?.replyTo);
    }

    const advisorUpdates: AdvisorStatsDelta[] = Array.isArray(parsed.advisor_updates)
      ? parsed.advisor_updates
      : [];

    return {
      council: {
        council_messages: parsed.council_messages,
        auto_actions: parsed.auto_actions,
        approval_requests: parsed.approval_requests,
        state_changes: parsed.state_changes ?? null,
      },
      advisorUpdates,
      usage,
    };
  } catch (err) {
    console.error("Council API error:", err);
    return {
      council: {
        council_messages: [
          { speaker: "제갈량", dialogue: "소신이 잠시 생각을 정리하고 있사옵니다... (연결 오류)", emotion: "thoughtful" },
        ],
        auto_actions: [],
        approval_requests: [],
        state_changes: null,
      },
      advisorUpdates: [],
      usage: null,
    };
  }
}
