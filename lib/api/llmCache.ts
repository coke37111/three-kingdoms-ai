import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { NormalizedLLMResponse } from "@/types/chat";

const MAX_ENTRIES = 2000; // 200 → 2000 (10배 증가)
const TTL_MS = 60 * 60 * 1000; // 10분 → 60분 (토큰 절약)
const CACHE_FILE = join(process.cwd(), ".cache", "llm-cache.json");
const SAVE_DEBOUNCE_MS = 5000; // 5초마다 저장

interface CacheEntry {
  data: NormalizedLLMResponse;
  timestamp: number;
}

// Node.js 글로벌에 캐시 유지 (서버리스 인스턴스 내 지속)
const globalCache = (globalThis as any).__llmCache as Map<string, CacheEntry> | undefined;
const cache: Map<string, CacheEntry> = globalCache ?? loadFromDisk();
(globalThis as any).__llmCache = cache;

let saveTimer: NodeJS.Timeout | null = null;

/** 디스크에서 캐시 로드 (서버 시작 시) */
function loadFromDisk(): Map<string, CacheEntry> {
  try {
    if (!existsSync(CACHE_FILE)) return new Map();

    const raw = readFileSync(CACHE_FILE, "utf-8");
    const data = JSON.parse(raw) as [string, CacheEntry][];
    const now = Date.now();

    // TTL 만료된 항목 제외하고 로드
    const valid = data.filter(([_, entry]) => now - entry.timestamp <= TTL_MS);
    console.log(`[LLM Cache] Loaded ${valid.length}/${data.length} entries from disk`);

    return new Map(valid);
  } catch (err) {
    console.error("[LLM Cache] Failed to load from disk:", err);
    return new Map();
  }
}

/** 디스크에 캐시 저장 (debounce 적용) */
function scheduleSaveToDisk(): void {
  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    try {
      const cacheDir = join(process.cwd(), ".cache");
      if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

      const data = Array.from(cache.entries());
      writeFileSync(CACHE_FILE, JSON.stringify(data), "utf-8");
      console.log(`[LLM Cache] Saved ${data.length} entries to disk`);
    } catch (err) {
      console.error("[LLM Cache] Failed to save to disk:", err);
    }
  }, SAVE_DEBOUNCE_MS);
}

/** system + messages + provider → SHA-256 해시 (16자) */
export function generateCacheKey(
  system: string,
  messages: { role: string; content: string }[],
  provider: string,
): string {
  const payload = JSON.stringify({ system, messages, provider });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

/** 캐시 조회 — TTL 만료 시 삭제 후 null 반환 */
export function getCached(key: string): NormalizedLLMResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(key);
    return null;
  }

  // LRU: 접근된 항목을 맨 뒤로 이동 + timestamp 갱신
  cache.delete(key);
  cache.set(key, { ...entry, timestamp: Date.now() });
  return entry.data;
}

/** 캐시 저장 — MAX_ENTRIES 초과 시 가장 오래된 항목 퇴거 */
export function setCached(key: string, data: NormalizedLLMResponse): void {
  // 이미 존재하면 삭제 후 재삽입 (LRU 갱신)
  if (cache.has(key)) cache.delete(key);

  // LRU 퇴거
  while (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }

  cache.set(key, { data, timestamp: Date.now() });

  // 디스크에 저장 (debounce)
  scheduleSaveToDisk();
}
