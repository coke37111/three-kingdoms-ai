import type { LLMProvider } from "@/types/chat";
import type { CouncilResponse, CouncilReactionResponse, CouncilMessage, AdvisorStatsDelta } from "@/types/council";

export interface CouncilLLMResult {
  council: CouncilResponse;
  advisorUpdates: AdvisorStatsDelta[];
  usage: { input_tokens: number; output_tokens: number } | null;
}

export interface MentionResponseLLMResult {
  mentionResponses: CouncilMessage[];
  usage: { input_tokens: number; output_tokens: number } | null;
}

export interface ReactionLLMResult {
  reaction: CouncilReactionResponse;
  advisorUpdates: AdvisorStatsDelta[];
  usage: { input_tokens: number; output_tokens: number } | null;
}

export interface CallLLMOptions {
  skipCache?: boolean;
  replyTo?: string;
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

function parseJSON<T>(raw: string): T {
  const m = raw.match(/\{[\s\S]*\}/);
  const jsonStr = m ? m[0] : raw;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return JSON.parse(repairJSON(jsonStr));
  }
}

// 4인 참모 키워드 매핑
const ADVISOR_KEYWORDS: Record<string, string[]> = {
  "제갈량": ["전략", "SP", "스킬", "계략", "계획", "전체", "종합", "큰 그림", "대세", "천하"],
  "관우": ["군사", "공격", "출격", "전투", "병력", "선봉", "무력", "방어", "훈련", "모병"],
  "미축": ["내정", "IP", "시설", "경제", "상업", "시장", "논", "은행", "재정", "비용"],
  "방통": ["외교", "DP", "동맹", "관계", "교섭", "이간", "손권", "조조", "사신"],
};

function ensureSpeakerDiversity(msgs: CouncilMessage[], replyTo?: string): CouncilMessage[] {
  if (msgs.length <= 1) return msgs;
  const speakers = new Set(msgs.map(m => m.speaker));
  if (speakers.size >= 2) return msgs;

  const result: CouncilMessage[] = [];
  const usedAdvisors = new Set<string>();

  for (let i = 0; i < msgs.length; i++) {
    const msg = msgs[i];
    if (i === 0 || i === msgs.length - 1) {
      const speaker = (i === 0 && replyTo) ? replyTo : "제갈량";
      result.push({ ...msg, speaker });
      continue;
    }

    let bestAdvisor = "";
    let bestScore = 0;
    for (const [advisor, keywords] of Object.entries(ADVISOR_KEYWORDS)) {
      const score = keywords.filter(kw => msg.dialogue.includes(kw)).length;
      if (score > bestScore && !usedAdvisors.has(advisor)) {
        bestScore = score;
        bestAdvisor = advisor;
      }
    }

    if (!bestAdvisor) {
      const advisorList = ["제갈량", "관우", "미축", "방통"];
      bestAdvisor = advisorList.find(a => !usedAdvisors.has(a)) || advisorList[i % advisorList.length];
    }

    usedAdvisors.add(bestAdvisor);
    result.push({ ...msg, speaker: bestAdvisor });
  }

  return result;
}

/** replyTo 참모가 첫 발언자가 되도록 정렬 */
function ensureReplyToFirst(msgs: CouncilMessage[], replyTo?: string): CouncilMessage[] {
  if (!replyTo || msgs.length <= 1) return msgs;
  if (msgs[0].speaker === replyTo) return msgs;
  const idx = msgs.findIndex(m => m.speaker === replyTo);
  if (idx <= 0) return msgs;
  const [target] = msgs.splice(idx, 1);
  msgs.unshift(target);
  return msgs;
}

/** Phase 1+3 통합 호출 */
export async function callCouncilLLM(
  system: string,
  messages: { role: string; content: string }[],
  provider: LLMProvider = "openai",
  options?: CallLLMOptions,
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
      parsed = parseJSON(raw);
    } catch {
      parsed = {
        council_messages: [
          { speaker: "제갈량", dialogue: "주공, 잠시 생각을 정리하겠습니다...", emotion: "thoughtful" },
        ],
        status_reports: [],
        plan_reports: [],
        state_changes: null,
      };
    }

    if (!Array.isArray(parsed.council_messages) || parsed.council_messages.length === 0) {
      parsed.council_messages = [
        { speaker: "제갈량", dialogue: "주공, 현 정세를 살펴봅시다.", emotion: "calm" },
      ];
    }

    if (!Array.isArray(parsed.status_reports)) parsed.status_reports = [];
    if (!Array.isArray(parsed.plan_reports)) parsed.plan_reports = [];

    parsed.council_messages = ensureSpeakerDiversity(parsed.council_messages, options?.replyTo);
    parsed.council_messages = ensureReplyToFirst(parsed.council_messages, options?.replyTo);

    return {
      council: {
        council_messages: parsed.council_messages,
        status_reports: parsed.status_reports,
        plan_reports: parsed.plan_reports,
        state_changes: parsed.state_changes ?? null,
      },
      advisorUpdates: Array.isArray(parsed.advisor_updates) ? parsed.advisor_updates : [],
      usage,
    };
  } catch (err) {
    console.error("Council API error:", err);
    return {
      council: {
        council_messages: [
          { speaker: "제갈량", dialogue: "소신이 잠시 생각을 정리하고 있사옵니다... (연결 오류)", emotion: "thoughtful" },
        ],
        status_reports: [],
        plan_reports: [],
        state_changes: null,
      },
      advisorUpdates: [],
      usage: null,
    };
  }
}

/** Phase 1 멘션 응답 호출 */
export async function callMentionResponseLLM(
  system: string,
  messages: { role: string; content: string }[],
  provider: LLMProvider = "openai",
): Promise<MentionResponseLLMResult> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages, provider, skipCache: true }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const raw: string = data.text || "";
    const usage = data.cached ? null : (data.usage ?? null);

    let parsed: { mention_responses?: CouncilMessage[] };
    try {
      parsed = parseJSON(raw);
    } catch {
      return { mentionResponses: [], usage: null };
    }

    const responses = Array.isArray(parsed.mention_responses) ? parsed.mention_responses : [];
    return { mentionResponses: responses, usage };
  } catch (err) {
    console.error("Mention response API error:", err);
    return { mentionResponses: [], usage: null };
  }
}

/** Phase 2/4 반응 호출 */
export async function callReactionLLM(
  system: string,
  messages: { role: string; content: string }[],
  provider: LLMProvider = "openai",
  options?: CallLLMOptions,
): Promise<ReactionLLMResult> {
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

    let parsed: CouncilReactionResponse & { advisor_updates?: AdvisorStatsDelta[] };
    try {
      parsed = parseJSON(raw);
    } catch {
      parsed = {
        council_messages: [
          { speaker: "제갈량", dialogue: "주공의 말씀을 새기겠습니다.", emotion: "calm" },
        ],
        state_changes: null,
      };
    }

    if (!Array.isArray(parsed.council_messages) || parsed.council_messages.length === 0) {
      parsed.council_messages = [
        { speaker: "제갈량", dialogue: "알겠습니다, 주공.", emotion: "calm" },
      ];
    }

    parsed.council_messages = ensureSpeakerDiversity(parsed.council_messages, options?.replyTo);
    parsed.council_messages = ensureReplyToFirst(parsed.council_messages, options?.replyTo);

    return {
      reaction: {
        council_messages: parsed.council_messages,
        state_changes: parsed.state_changes ?? null,
        boosted_plans: parsed.boosted_plans,
      },
      advisorUpdates: Array.isArray(parsed.advisor_updates) ? parsed.advisor_updates : [],
      usage,
    };
  } catch (err) {
    console.error("Reaction API error:", err);
    return {
      reaction: {
        council_messages: [
          { speaker: "제갈량", dialogue: "소신이 잠시 생각을 정리하고 있사옵니다... (연결 오류)", emotion: "thoughtful" },
        ],
        state_changes: null,
      },
      advisorUpdates: [],
      usage: null,
    };
  }
}
