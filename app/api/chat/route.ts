import type { LLMProvider, NormalizedLLMResponse } from "@/types/chat";
import { generateCacheKey, getCached, setCached } from "@/lib/api/llmCache";

interface ChatRequest {
  system: string;
  messages: { role: string; content: string }[];
  provider?: LLMProvider;
  skipCache?: boolean;
}

async function callClaude(
  system: string,
  messages: { role: string; content: string }[],
): Promise<NormalizedLLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  const data = await response.json();
  return {
    text: data.content?.[0]?.text || "",
    usage: data.usage
      ? { input_tokens: data.usage.input_tokens, output_tokens: data.usage.output_tokens }
      : null,
    provider: "claude",
  };
}

async function callOpenAI(
  system: string,
  messages: { role: string; content: string }[],
): Promise<NormalizedLLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content || "",
    usage: data.usage
      ? { input_tokens: data.usage.prompt_tokens, output_tokens: data.usage.completion_tokens }
      : null,
    provider: "openai",
  };
}

export async function POST(request: Request) {
  const { system, messages, provider = "openai", skipCache = false }: ChatRequest = await request.json();

  try {
    // 캐시 조회 (skipCache가 아닌 경우)
    if (!skipCache) {
      const key = generateCacheKey(system, messages, provider);
      const cached = getCached(key);
      if (cached) {
        console.log(`[LLM Cache] HIT ${key}`);
        return Response.json({ ...cached, usage: null, cached: true });
      }

      // 캐시 미스 → AI 호출 → 저장
      const result = provider === "claude"
        ? await callClaude(system, messages)
        : await callOpenAI(system, messages);

      setCached(key, result);
      console.log(`[LLM Cache] MISS ${key} — stored`);
      return Response.json({ ...result, cached: false });
    }

    // skipCache → 캐시 무시, 직접 AI 호출
    const result = provider === "claude"
      ? await callClaude(system, messages)
      : await callOpenAI(system, messages);

    return Response.json({ ...result, cached: false });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
