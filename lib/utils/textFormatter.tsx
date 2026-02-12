import React, { type ReactNode } from "react";

/**
 * **keyword** 마커를 감지하여 gold 색상 span으로 변환.
 * 불완전한 마커(타이핑 중)는 일반 텍스트로 표시.
 */
export function renderHighlightedText(text: string): ReactNode {
  const regex = /\*\*([^*]+)\*\*/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span
        key={match.index}
        style={{ color: "var(--gold)", fontWeight: 600 }}
      >
        {match[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 0 ? text : <>{parts}</>;
}

const TAG_STYLE_COMMON: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: "8px",
  fontSize: "10.5px",
  fontWeight: 500,
  whiteSpace: "nowrap",
};

/**
 * 쉼표 구분 preview 텍스트를 색상 태그로 변환.
 * +가 포함되면 초록, -가 포함되면 빨강, 나머지는 중립.
 */
export function renderPreviewTags(text: string): ReactNode {
  if (!text) return null;

  const items = text.split(",").map((s) => s.trim()).filter(Boolean);

  return items.map((item, i) => {
    let style: React.CSSProperties;

    if (/\+/.test(item)) {
      style = {
        ...TAG_STYLE_COMMON,
        background: "rgba(74,140,92,0.2)",
        color: "var(--success)",
        border: "1px solid rgba(74,140,92,0.4)",
      };
    } else if (/-/.test(item)) {
      style = {
        ...TAG_STYLE_COMMON,
        background: "rgba(212,68,62,0.2)",
        color: "var(--danger)",
        border: "1px solid rgba(212,68,62,0.4)",
      };
    } else {
      style = {
        ...TAG_STYLE_COMMON,
        background: "rgba(255,255,255,0.05)",
        color: "var(--text-secondary)",
        border: "1px solid var(--border)",
      };
    }

    return (
      <span key={i} style={style}>
        {item}
      </span>
    );
  });
}
