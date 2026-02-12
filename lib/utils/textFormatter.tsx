import React, { type ReactNode } from "react";

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
