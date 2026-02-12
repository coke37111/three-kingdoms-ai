"use client";

import type { Choice } from "@/types/chat";
import { renderPreviewTags } from "@/lib/utils/textFormatter";

interface ChoicePanelProps {
  choices: Choice[];
  onSelect: (choice: Choice) => void;
  disabled: boolean;
}

const RISK_STYLE = {
  low: { bg: "rgba(74,140,92,0.15)", border: "var(--success)", color: "var(--success)", label: "안전" },
  medium: { bg: "var(--gold-dim)", border: "var(--gold)", color: "var(--gold)", label: "보통" },
  high: { bg: "rgba(212,68,62,0.15)", border: "var(--danger)", color: "var(--danger)", label: "위험" },
} as const;

export default function ChoicePanel({ choices, onSelect, disabled }: ChoicePanelProps) {
  if (!choices || choices.length === 0) return null;

  return (
    <div style={{
      padding: "12px 14px",
      background: "linear-gradient(180deg, var(--bg-card) 0%, var(--bg-secondary) 100%)",
      borderTop: "1px solid var(--border)",
      animation: "fadeInUp 0.4s ease",
    }}>
      <div style={{
        fontSize: "11px",
        color: "var(--gold)",
        marginBottom: "8px",
        fontWeight: 700,
        letterSpacing: "1px",
      }}>
        ⚔ 진언 — 하나를 택하소서
      </div>
      {choices.map((choice, idx) => {
        const rs = RISK_STYLE[choice.risk] || RISK_STYLE.medium;
        return (
          <button
            key={choice.id}
            onClick={() => !disabled && onSelect(choice)}
            disabled={disabled}
            style={{
              width: "100%",
              textAlign: "left",
              background: disabled ? "rgba(255,255,255,0.02)" : rs.bg,
              border: `1px solid ${disabled ? "var(--border)" : rs.border}`,
              borderRadius: "10px",
              padding: "10px 12px",
              marginBottom: "6px",
              color: "var(--text-primary)",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.4 : 1,
              transition: "all 0.2s",
              animation: `slideIn 0.3s ease ${idx * 0.1}s both`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "13px" }}>
                <span style={{ color: rs.color, marginRight: "6px" }}>[{choice.id}]</span>
                {choice.text}
              </span>
              <span style={{
                fontSize: "10px",
                background: rs.bg,
                color: rs.color,
                padding: "2px 8px",
                borderRadius: "10px",
                fontWeight: 700,
                border: `1px solid ${rs.border}`,
                flexShrink: 0,
                marginLeft: "8px",
              }}>
                {rs.label}
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
              {renderPreviewTags(choice.preview)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
