/**
 * 케이스 검색 유틸리티
 */

import type { ParsedCase, CaseSearchResult, SearchFilter } from "../types.js";

/**
 * 케이스 검색 (키워드, 참모, priority 범위)
 */
export function searchCases(
  cases: ParsedCase[],
  filter: SearchFilter
): CaseSearchResult[] {
  let filtered = cases;

  // 참모 필터
  if (filter.advisor) {
    filtered = filtered.filter((c) => c.advisor === filter.advisor);
  }

  // Priority 범위 필터
  if (filter.minPriority !== undefined) {
    filtered = filtered.filter((c) => c.priority >= filter.minPriority!);
  }
  if (filter.maxPriority !== undefined) {
    filtered = filtered.filter((c) => c.priority <= filter.maxPriority!);
  }

  // 키워드 검색 (id, dialogue, condition에서)
  if (filter.keyword) {
    const keyword = filter.keyword.toLowerCase();
    filtered = filtered.filter((c) => {
      // id 검색
      if (c.id.toLowerCase().includes(keyword)) return true;

      // dialogue 검색
      const dialogueText = c.variations
        .map((v) => v.dialogue)
        .join(" ")
        .toLowerCase();
      if (dialogueText.includes(keyword)) return true;

      // condition 검색
      if (c.conditionSource?.toLowerCase().includes(keyword)) return true;

      return false;
    });
  }

  // 결과 매핑
  return filtered.map((c) => ({
    id: c.id,
    advisor: c.advisor,
    priority: c.priority,
    dialoguePreview:
      c.variations[0]?.dialogue.substring(0, 60) + "..." || "[대사 없음]",
    location: {
      file: "", // 호출자가 채움
      line: c.line,
    },
  }));
}

/**
 * Priority 추천 (같은 참모의 기존 케이스 분석)
 */
export function suggestPriority(
  cases: ParsedCase[],
  advisor: string,
  situation: string
): number {
  const advisorCases = cases.filter((c) => c.advisor === advisor);

  if (advisorCases.length === 0) {
    return 50; // 기본값
  }

  // 키워드 기반 유사도 계산 (간단한 구현)
  const situationKeywords = situation.toLowerCase().split(/\s+/);
  const scores = advisorCases.map((c) => {
    const conditionText = c.conditionSource?.toLowerCase() || "";
    const dialogueText = c.variations
      .map((v) => v.dialogue)
      .join(" ")
      .toLowerCase();
    const combinedText = conditionText + " " + dialogueText;

    let matchCount = 0;
    for (const keyword of situationKeywords) {
      if (combinedText.includes(keyword)) matchCount++;
    }

    return { case: c, score: matchCount };
  });

  // 유사도 높은 순으로 정렬
  scores.sort((a, b) => b.score - a.score);

  // 상위 3개 케이스의 평균 priority
  const topCases = scores.slice(0, 3).map((s) => s.case);
  if (topCases.length === 0) return 50;

  const avgPriority =
    topCases.reduce((sum, c) => sum + c.priority, 0) / topCases.length;

  return Math.round(avgPriority);
}
