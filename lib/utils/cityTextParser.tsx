import React from "react";
import type { CityReference } from "@/types/map";
import { ALL_CITY_NAMES } from "@/constants/mapPositions";

// 1글자 도시("완")는 조사 결합시에만 매칭
const SINGLE_CHAR_PARTICLES = "에서|을|를|으로|로|은|는|이|의|과|와|도|만|까지|부터|에|서";

// 긴 이름 우선 매칭을 위해 길이 내림차순 정렬
const SORTED_NAMES = [...ALL_CITY_NAMES].sort((a, b) => b.length - a.length);

/** 텍스트에서 도시명 위치를 감지 */
export function parseCityReferences(text: string): CityReference[] {
  const refs: CityReference[] = [];
  const used = new Set<number>(); // 겹침 방지

  for (const name of SORTED_NAMES) {
    const isSingleChar = name.length === 1;

    if (isSingleChar) {
      // 1글자 도시는 조사가 붙어야 매칭
      const pattern = new RegExp(`${name}(?:성)?(?=${SINGLE_CHAR_PARTICLES})`, "g");
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const start = match.index;
        const end = start + name.length;
        let overlaps = false;
        for (let k = start; k < end; k++) {
          if (used.has(k)) { overlaps = true; break; }
        }
        if (overlaps) continue;
        for (let k = start; k < end; k++) used.add(k);
        refs.push({ cityName: name, startIndex: start, endIndex: end });
      }
    } else {
      // 2글자 이상: 도시명 또는 도시명+성
      const pattern = new RegExp(`${name}(?:성)?`, "g");
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const start = match.index;
        const end = start + name.length;
        let overlaps = false;
        for (let k = start; k < end; k++) {
          if (used.has(k)) { overlaps = true; break; }
        }
        if (overlaps) continue;
        for (let k = start; k < end; k++) used.add(k);
        refs.push({ cityName: name, startIndex: start, endIndex: end });
      }
    }
  }

  // startIndex 순 정렬
  refs.sort((a, b) => a.startIndex - b.startIndex);
  return refs;
}

const LINK_STYLE: React.CSSProperties = {
  color: "var(--gold)",
  textDecoration: "none",
  borderBottom: "1px dotted var(--gold)",
  cursor: "pointer",
  transition: "opacity 0.15s",
};

/** plain text -> ReactNode[] (도시명을 클릭 가능한 링크로 변환) */
export function renderCityLinks(
  text: string,
  onCityClick?: (cityName: string) => void,
): React.ReactNode {
  if (!onCityClick) return text;

  const refs = parseCityReferences(text);
  if (refs.length === 0) return text;

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const ref of refs) {
    // 링크 앞 일반 텍스트
    if (ref.startIndex > cursor) {
      parts.push(text.slice(cursor, ref.startIndex));
    }

    // "성"이 붙은 경우도 원문 그대로 표시하되, 클릭 시 도시명만 전달
    const displayEnd = text[ref.endIndex] === "성" ? ref.endIndex + 1 : ref.endIndex;
    const displayText = text.slice(ref.startIndex, displayEnd);

    parts.push(
      <span
        key={`${ref.cityName}-${ref.startIndex}`}
        style={LINK_STYLE}
        onClick={(e) => {
          e.stopPropagation();
          onCityClick(ref.cityName);
        }}
        onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "0.8"; }}
        onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
      >
        {displayText}
      </span>,
    );

    cursor = displayEnd;
  }

  // 남은 텍스트
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return <>{parts}</>;
}

/** 텍스트에서 중복 제거된 도시명 목록 추출 */
export function extractCityNames(text: string): string[] {
  const refs = parseCityReferences(text);
  return [...new Set(refs.map((r) => r.cityName))];
}
