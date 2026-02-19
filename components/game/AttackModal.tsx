"use client";
import { useState, useMemo } from "react";
import type { Faction, Castle, WorldState } from "@/types/game";

interface AttackModalProps {
  worldState: WorldState;
  playerFaction: Faction;
  onConfirm: (targetCastle: string, troops: number) => void;
  onClose: () => void;
}

export default function AttackModal({ worldState, playerFaction, onConfirm, onClose }: AttackModalProps) {
  // 인접 공격 가능 성채 목록
  const attackableCastles = useMemo(() => {
    const myCastles = worldState.castles.filter(c => c.owner === playerFaction.id);
    const targets: Castle[] = [];
    for (const my of myCastles) {
      for (const adjName of my.adjacentCastles) {
        const adj = worldState.castles.find(c => c.name === adjName && c.owner !== playerFaction.id);
        if (adj && !targets.find(t => t.name === adj.name)) {
          targets.push(adj);
        }
      }
    }
    return targets.sort((a, b) => {
      const gradeOrder = { "본성": 0, "요새": 1, "일반": 2 };
      return (gradeOrder[a.grade] ?? 3) - (gradeOrder[b.grade] ?? 3);
    });
  }, [worldState, playerFaction]);

  const [selectedCastle, setSelectedCastle] = useState<Castle | null>(
    attackableCastles[0] ?? null,
  );
  const maxTroops = Math.min(playerFaction.points.mp_troops, playerFaction.rulerLevel.deploymentCap);
  const [troops, setTroops] = useState(Math.floor(maxTroops * 0.6));

  if (attackableCastles.length === 0) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
      }}>
        <div style={{
          background: "var(--bg-secondary)", border: "1px solid var(--border)",
          borderRadius: "12px", padding: "24px", maxWidth: "400px", width: "90%",
          color: "var(--text-primary)",
        }}>
          <h3 style={{ margin: "0 0 16px", color: "var(--gold)" }}>공격 불가</h3>
          <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", fontSize: "14px" }}>
            현재 인접한 공격 가능한 적 성채가 없습니다.
          </p>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.05)", color: "var(--text-primary)",
            border: "1px solid var(--border)", borderRadius: "8px",
            padding: "8px 16px", cursor: "pointer", fontSize: "13px",
          }}>닫기</button>
        </div>
      </div>
    );
  }

  const targetFaction = selectedCastle
    ? worldState.factions.find(f => f.id === selectedCastle.owner)
    : null;

  // 예상 승산 계산
  const estimatedWinProb = selectedCastle && targetFaction
    ? (troops * playerFaction.points.mp_training * playerFaction.points.mp_morale) /
      Math.max(1, (targetFaction.points.mp_troops * targetFaction.points.mp_training * targetFaction.points.mp_morale * selectedCastle.defenseMultiplier))
    : 0;

  const winProbText = estimatedWinProb > 1.5 ? "압도적 우세" :
    estimatedWinProb > 1.2 ? "우세" :
    estimatedWinProb > 0.8 ? "백중세" :
    estimatedWinProb > 0.5 ? "열세" : "압도적 열세";
  const winProbColor = estimatedWinProb > 1.2 ? "#4a8" :
    estimatedWinProb > 0.8 ? "#ca8" : "#c44";

  const gradeLabel = { "본성": "본성 🏯", "요새": "요새 🏰", "일반": "일반 🏯" };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div style={{
        background: "var(--bg-secondary)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "24px", maxWidth: "480px", width: "90%",
        color: "var(--text-primary)",
      }}>
        <h3 style={{ margin: "0 0 16px", color: "#c44", fontSize: "16px" }}>⚔️ 공격 개시</h3>

        {/* 목표 성채 선택 */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "8px" }}>목표 성채 선택</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
            {attackableCastles.map(castle => {
              const fac = worldState.factions.find(f => f.id === castle.owner);
              const isSelected = selectedCastle?.name === castle.name;
              return (
                <button
                  key={castle.name}
                  onClick={() => setSelectedCastle(castle)}
                  style={{
                    background: isSelected ? "rgba(196,68,68,0.2)" : "rgba(255,255,255,0.03)",
                    border: isSelected ? "1px solid #c44" : "1px solid var(--border)",
                    borderRadius: "8px", padding: "8px 12px",
                    color: "var(--text-primary)", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontSize: "13px", textAlign: "left",
                  }}
                >
                  <span>
                    <span style={{ color: "var(--gold)", fontWeight: 700 }}>{castle.name}</span>
                    <span style={{ color: "var(--text-dim)", fontSize: "11px", marginLeft: "8px" }}>
                      {gradeLabel[castle.grade]}
                    </span>
                  </span>
                  <span style={{ color: fac?.color ?? "var(--text-dim)", fontSize: "12px" }}>
                    {fac?.icon} {fac?.rulerName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 투입 병력 슬라이더 */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "8px" }}>
            투입 병력: <span style={{ color: "var(--gold)", fontWeight: 700 }}>{troops.toLocaleString()}명</span>
            <span style={{ color: "var(--text-dim)", fontSize: "11px" }}> / 최대 {maxTroops.toLocaleString()}명</span>
          </div>
          <input
            type="range"
            min={Math.floor(maxTroops * 0.1)}
            max={maxTroops}
            step={1000}
            value={troops}
            onChange={e => setTroops(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c44" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
            {[0.25, 0.5, 0.75, 1.0].map(ratio => (
              <button
                key={ratio}
                onClick={() => setTroops(Math.floor(maxTroops * ratio))}
                style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
                  borderRadius: "4px", padding: "2px 8px", color: "var(--text-dim)",
                  fontSize: "11px", cursor: "pointer",
                }}
              >{Math.round(ratio * 100)}%</button>
            ))}
          </div>
        </div>

        {/* 예상 승산 */}
        {selectedCastle && targetFaction && (
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
            borderRadius: "8px", padding: "10px 12px", marginBottom: "16px",
            fontSize: "12px",
          }}>
            <div style={{ marginBottom: "4px", color: "var(--text-dim)" }}>예상 전투 결과</div>
            <div style={{ color: winProbColor, fontWeight: 700 }}>
              {winProbText} ({Math.round(estimatedWinProb * 100)}%)
            </div>
            <div style={{ color: "var(--text-dim)", marginTop: "4px" }}>
              {selectedCastle.name} 방어력: ×{selectedCastle.defenseMultiplier}
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => selectedCastle && onConfirm(selectedCastle.name, troops)}
            disabled={!selectedCastle || troops <= 0}
            style={{
              flex: 1,
              background: !selectedCastle || troops <= 0 ? "rgba(196,68,68,0.2)" : "#c44",
              color: "#fff", border: "none", borderRadius: "8px",
              padding: "10px", fontSize: "13px", fontWeight: 700,
              cursor: !selectedCastle || troops <= 0 ? "not-allowed" : "pointer",
            }}
          >⚔️ 공격 개시</button>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.05)", color: "var(--text-dim)",
            border: "1px solid var(--border)", borderRadius: "8px",
            padding: "10px 16px", fontSize: "13px", cursor: "pointer",
          }}>취소</button>
        </div>
      </div>
    </div>
  );
}
