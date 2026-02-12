"use client";

import type { BattleResult } from "@/types/game";
import { FACTION_NAMES } from "@/constants/factions";

interface BattleReportProps {
  result: BattleResult;
  onClose: () => void;
}

export default function BattleReport({ result, onClose }: BattleReportProps) {
  const winnerName = FACTION_NAMES[result.winner] || result.winner;
  const loserName = FACTION_NAMES[result.loser] || result.loser;
  const isPlayerWinner = result.winner === "liu_bei";

  const typeLabel = result.battleType === "야전" ? "⚔️ 야전" : result.battleType === "공성전" ? "🏯 공성전" : "🌙 매복전";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.9)",
      zIndex: 200,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "fadeInUp 0.4s ease",
    }}>
      <div style={{
        background: "linear-gradient(180deg, #1a1a35, #0d0d1a)",
        border: `2px solid ${isPlayerWinner ? "var(--success)" : "var(--danger)"}`,
        borderRadius: "16px",
        padding: "24px",
        width: "85%",
        maxWidth: "400px",
        textAlign: "center",
      }}>
        <div style={{
          fontSize: "24px",
          marginBottom: "8px",
        }}>
          {typeLabel}
        </div>

        <h2 style={{
          fontFamily: "'Noto Serif KR', serif",
          fontSize: "20px",
          fontWeight: 900,
          color: isPlayerWinner ? "var(--success)" : "var(--danger)",
          marginBottom: "16px",
          letterSpacing: "2px",
        }}>
          {isPlayerWinner ? "승리!" : "패배..."}
        </h2>

        <div style={{ fontSize: "14px", color: "var(--text-primary)", marginBottom: "16px" }}>
          {winnerName} vs {loserName}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "16px",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: "8px",
            padding: "10px",
          }}>
            <div style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "4px" }}>공격측 피해</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--danger)" }}>
              -{result.attackerLosses.toLocaleString()}
            </div>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: "8px",
            padding: "10px",
          }}>
            <div style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "4px" }}>수비측 피해</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--danger)" }}>
              -{result.defenderLosses.toLocaleString()}
            </div>
          </div>
        </div>

        {result.capturedGenerals.length > 0 && (
          <div style={{
            background: "rgba(201,168,76,0.1)",
            borderRadius: "8px",
            padding: "8px",
            marginBottom: "12px",
            fontSize: "12px",
            color: "var(--gold)",
          }}>
            🔗 포로: {result.capturedGenerals.join(", ")}
          </div>
        )}

        {result.cityConquered && (
          <div style={{
            background: isPlayerWinner ? "rgba(74,140,92,0.15)" : "rgba(212,68,62,0.15)",
            borderRadius: "8px",
            padding: "8px",
            marginBottom: "12px",
            fontSize: "13px",
            fontWeight: 700,
            color: isPlayerWinner ? "var(--success)" : "var(--danger)",
          }}>
            🏯 {result.cityConquered} {isPlayerWinner ? "함락!" : "을(를) 빼앗겼습니다!"}
          </div>
        )}

        {result.narrative && (
          <div style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: "16px",
            textAlign: "left",
          }}>
            {result.narrative}
          </div>
        )}

        <button onClick={onClose} style={{
          background: "var(--gold)",
          color: "var(--bg-primary)",
          border: "none",
          borderRadius: "8px",
          padding: "10px 32px",
          fontSize: "13px",
          fontWeight: 700,
          cursor: "pointer",
        }}>
          확인
        </button>
      </div>
    </div>
  );
}
