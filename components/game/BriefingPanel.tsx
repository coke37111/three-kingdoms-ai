"use client";

import type { SituationBriefing, EmotionalDirective } from "@/types/council";

interface BriefingPanelProps {
  briefing: SituationBriefing;
  onSelectDirective: (directive: EmotionalDirective) => void;
  onSkip: () => void;
}

export default function BriefingPanel({ briefing, onSelectDirective, onSkip }: BriefingPanelProps) {
  return (
    <div style={{
      margin: "8px 14px",
      animation: "fadeInUp 0.4s ease",
    }}>
      {/* 제갈량 브리핑 */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        marginBottom: "8px",
      }}>
        <div style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #DAA52022, #DAA52044)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          flexShrink: 0,
          border: "1.5px solid #DAA52066",
        }}>
          🪶
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: "10px",
            marginBottom: "3px",
            fontWeight: 500,
            color: "#DAA520",
          }}>
            [총괄] 제갈량
          </div>
          <div style={{
            background: briefing.isUrgent ? "rgba(212,68,62,0.08)" : "var(--bg-card)",
            color: "var(--text-primary)",
            padding: "8px 12px",
            borderRadius: "12px 12px 12px 4px",
            fontSize: "13px",
            lineHeight: 1.6,
            border: briefing.isUrgent ? "1px solid rgba(212,68,62,0.3)" : "1px solid #DAA52033",
          }}>
            {briefing.briefingText}
          </div>
        </div>
      </div>

      {/* 감정 방향 선택지 (긴급 시) */}
      {briefing.isUrgent && briefing.directives && (
        <div style={{
          marginLeft: "42px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}>
          <div style={{
            fontSize: "10px",
            color: "var(--gold)",
            fontWeight: 700,
            letterSpacing: "1px",
            marginBottom: "2px",
          }}>
            👑 주공의 반응은?
          </div>
          {briefing.directives.map((d) => (
            <button
              key={d.id}
              onClick={() => onSelectDirective(d)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "8px 12px",
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(201,168,76,0.1)";
                e.currentTarget.style.borderColor = "var(--gold)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 600 }}>
                {d.icon} {d.text}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>
                {d.effect}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 평상시 — 바로 진행 버튼 */}
      {!briefing.isUrgent && (
        <div style={{ marginLeft: "42px", marginTop: "4px" }}>
          <button
            onClick={onSkip}
            style={{
              background: "rgba(201,168,76,0.15)",
              border: "1px solid var(--gold)",
              borderRadius: "8px",
              padding: "6px 16px",
              color: "var(--gold)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📋 참모 회의 시작
          </button>
        </div>
      )}
    </div>
  );
}
