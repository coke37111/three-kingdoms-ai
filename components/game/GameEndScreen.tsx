"use client";

import type { GameEndResult } from "@/types/game";

interface GameEndScreenProps {
  result: GameEndResult;
  onRestart: () => void;
}

export default function GameEndScreen({ result, onRestart }: GameEndScreenProps) {
  const isVictory = result.type === "victory";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: isVictory
        ? "radial-gradient(ellipse at 50% 30%, rgba(201,168,76,0.15) 0%, rgba(10,10,18,0.98) 60%)"
        : "radial-gradient(ellipse at 50% 30%, rgba(212,68,62,0.15) 0%, rgba(10,10,18,0.98) 60%)",
      zIndex: 300,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      animation: "fadeInUp 0.6s ease",
    }}>
      <div style={{
        fontSize: "48px",
        marginBottom: "16px",
      }}>
        {isVictory ? "👑" : "💀"}
      </div>

      <h1 style={{
        fontFamily: "'Noto Serif KR', serif",
        fontSize: "clamp(28px, 8vw, 44px)",
        fontWeight: 900,
        color: isVictory ? "var(--gold)" : "var(--danger)",
        textShadow: isVictory
          ? "0 0 40px rgba(201,168,76,0.4)"
          : "0 0 40px rgba(212,68,62,0.4)",
        letterSpacing: "6px",
        marginBottom: "8px",
      }}>
        {isVictory ? "천하통일" : "패망"}
      </h1>

      <div style={{
        fontSize: "14px",
        color: "var(--text-secondary)",
        marginBottom: "24px",
        letterSpacing: "2px",
      }}>
        {result.reason === "천하통일" && "모든 영토를 정복하였습니다"}
        {result.reason === "천명" && "천명을 받아 천하를 통치합니다"}
        {result.reason === "멸망" && "모든 영토를 잃었습니다"}
        {result.reason === "파산" && "자원이 고갈되었습니다"}
      </div>

      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "20px",
        width: "80%",
        maxWidth: "300px",
        marginBottom: "32px",
      }}>
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "12px", color: "var(--gold)", fontWeight: 700, letterSpacing: "2px" }}>
            📊 통계
          </span>
        </div>

        {[
          { label: "총 턴수", value: `${result.stats.totalTurns}턴` },
          { label: "보유 도시", value: `${result.stats.citiesOwned}개` },
          { label: "보유 장수", value: `${result.stats.generalsRecruited}명` },
          { label: "전투 승리", value: `${result.stats.battlesWon}회` },
          { label: "전투 패배", value: `${result.stats.battlesLost}회` },
        ].map((s, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "4px 0",
            borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none",
          }}>
            <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>{s.label}</span>
            <span style={{ fontSize: "12px", fontWeight: 700 }}>{s.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onRestart}
        style={{
          background: "transparent",
          color: "var(--gold)",
          border: "1px solid var(--gold)",
          padding: "12px 40px",
          borderRadius: "4px",
          fontSize: "14px",
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: "3px",
          transition: "all 0.3s",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.background = "var(--gold)";
          (e.target as HTMLButtonElement).style.color = "var(--bg-primary)";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.background = "transparent";
          (e.target as HTMLButtonElement).style.color = "var(--gold)";
        }}
      >
        다시 시작
      </button>
    </div>
  );
}
