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

  const typeLabel = result.battleType === "야전" ? "⚔️ 야전" : result.battleType === "공성" ? "🏯 공성전" : "🛡️ 수성전";

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
            <div style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "4px" }}>공격측 전사</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--danger)" }}>
              -{result.attackerLosses.toLocaleString()}
            </div>
            {result.attackerWounded > 0 && (
              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>
                부상 {result.attackerWounded.toLocaleString()}
              </div>
            )}
          </div>
          <div style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: "8px",
            padding: "10px",
          }}>
            <div style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "4px" }}>수비측 전사</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--danger)" }}>
              -{result.defenderLosses.toLocaleString()}
            </div>
            {result.defenderWounded > 0 && (
              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>
                부상 {result.defenderWounded.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {result.castleConquered && (
          <div style={{
            background: isPlayerWinner ? "rgba(74,140,92,0.15)" : "rgba(212,68,62,0.15)",
            borderRadius: "8px",
            padding: "8px",
            marginBottom: "12px",
            fontSize: "13px",
            fontWeight: 700,
            color: isPlayerWinner ? "var(--success)" : "var(--danger)",
          }}>
            🏯 {result.castleConquered} {isPlayerWinner ? "함락!" : "을(를) 빼앗겼습니다!"}
          </div>
        )}

        {result.facilityDamage && (result.facilityDamage.farm_damage > 0 || result.facilityDamage.market_damage > 0) && (
          <div style={{
            background: "rgba(212,168,62,0.1)",
            borderRadius: "8px",
            padding: "8px",
            marginBottom: "12px",
            fontSize: "12px",
            color: "var(--gold)",
          }}>
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>🔥 시설 피해</div>
            {result.facilityDamage.farm_damage > 0 && (
              <div>논 -{result.facilityDamage.farm_damage} 레벨</div>
            )}
            {result.facilityDamage.market_damage > 0 && (
              <div>시장 -{result.facilityDamage.market_damage} 레벨</div>
            )}
          </div>
        )}

        {result.retreatInfo && (
          <div style={{
            background: "rgba(100,140,200,0.1)",
            borderRadius: "8px",
            padding: "8px",
            marginBottom: "12px",
            fontSize: "12px",
            color: "#88aadd",
          }}>
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>🏃 도주</div>
            <div>{result.retreatInfo.fromCastle} → {result.retreatInfo.toCastle}</div>
            <div>추가 손실: -{result.retreatInfo.troopsLost.toLocaleString()}명</div>
            <div>사기 하락: {result.retreatInfo.moralePenalty}</div>
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
