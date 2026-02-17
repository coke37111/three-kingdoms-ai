"use client";

import type { PendingInvasion, InvasionResponseType } from "@/types/game";
import type { ResponseOption } from "@/lib/game/invasionSystem";
import { FACTION_NAMES } from "@/constants/factions";

interface InvasionModalProps {
  invasion: PendingInvasion;
  castleGrade: string;
  castleGarrison: number;
  options: ResponseOption[];
  onSelect: (type: InvasionResponseType) => void;
}

export default function InvasionModal({
  invasion,
  castleGrade,
  castleGarrison,
  options,
  onSelect,
}: InvasionModalProps) {
  const attackerName = FACTION_NAMES[invasion.attackerFactionId] || invasion.attackerFactionId;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.92)",
      zIndex: 250,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "fadeInUp 0.4s ease",
    }}>
      <div style={{
        background: "linear-gradient(180deg, #1a1a35, #0d0d1a)",
        border: "2px solid var(--danger)",
        borderRadius: "16px",
        padding: "24px",
        width: "90%",
        maxWidth: "420px",
      }}>
        {/* 헤더 */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "28px", marginBottom: "4px" }}>⚠️</div>
          <h2 style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: "18px",
            fontWeight: 900,
            color: "var(--danger)",
            marginBottom: "8px",
            letterSpacing: "2px",
          }}>
            적 침공!
          </h2>
        </div>

        {/* 공격 정보 */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "16px",
        }}>
          <div style={{
            background: "rgba(212,68,62,0.1)",
            borderRadius: "8px",
            padding: "10px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "4px" }}>공격 세력</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--danger)" }}>
              {attackerName}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
              ~{invasion.attackerTroops.toLocaleString()}명
            </div>
          </div>
          <div style={{
            background: "rgba(100,180,100,0.1)",
            borderRadius: "8px",
            padding: "10px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "4px" }}>방어 성채</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--success)" }}>
              {invasion.targetCastle}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
              {castleGrade} · 주둔 {castleGarrison.toLocaleString()}명
            </div>
          </div>
        </div>

        {/* 대응 선택지 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {options.map((opt) => (
            <button
              key={opt.type}
              onClick={() => opt.available && onSelect(opt.type)}
              disabled={!opt.available}
              style={{
                background: opt.available ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.01)",
                border: `1px solid ${opt.available ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)"}`,
                borderRadius: "10px",
                padding: "12px",
                cursor: opt.available ? "pointer" : "not-allowed",
                opacity: opt.available ? 1 : 0.4,
                textAlign: "left",
                transition: "background 0.2s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: opt.available ? "var(--text-primary)" : "var(--text-dim)",
                }}>
                  {opt.label}
                </span>
                <span style={{
                  fontSize: "11px",
                  color: opt.available ? "var(--gold)" : "var(--text-dim)",
                  fontWeight: 600,
                }}>
                  {opt.cost}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "2px" }}>
                {opt.description}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                {opt.successRate === -1
                  ? "성공률: 전투 결과에 따름"
                  : opt.successRate >= 1
                    ? "성공률: 100%"
                    : `성공률: ${Math.round(opt.successRate * 100)}%`
                }
                {!opt.available && opt.unavailableReason && ` · ${opt.unavailableReason}`}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
