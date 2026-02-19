"use client";

import type { WorldState, DiplomaticRelation, FactionId, Castle } from "@/types/game";
import { scoreToLabel } from "@/lib/game/diplomacySystem";

/** lineId 라인의 성채를 시작 성채에서 BFS로 순서대로 반환 */
function getLineOrder(castles: Castle[], lineId: string, startCastle: string): Castle[] {
  const lineCastles = castles.filter(c => c.lineId === lineId);
  const castleMap = new Map(lineCastles.map(c => [c.name, c]));
  const visited = new Set<string>();
  const result: Castle[] = [];
  const queue = [startCastle];
  visited.add(startCastle);
  while (queue.length > 0) {
    const name = queue.shift()!;
    const castle = castleMap.get(name);
    if (castle) {
      result.push(castle);
      for (const adj of castle.adjacentCastles) {
        if (!visited.has(adj) && castleMap.has(adj)) {
          visited.add(adj);
          queue.push(adj);
        }
      }
    }
  }
  return result;
}

interface WorldStatusProps {
  worldState: WorldState;
  show: boolean;
  onClose: () => void;
}

function getRelation(relations: DiplomaticRelation[], a: FactionId, b: FactionId) {
  return relations.find(
    (r) => (r.factionA === a && r.factionB === b) || (r.factionA === b && r.factionB === a),
  );
}

function relColor(score: number): string {
  if (score >= 7) return "#4adc78";          // 동맹 (밝은 녹색)
  if (score >= 3) return "var(--success)";   // 우호
  if (score >= -3) return "var(--text-secondary)"; // 중립
  if (score >= -7) return "#e07050";         // 적대 (주황빨강)
  return "var(--danger)";                    // 전쟁 (진한 빨강)
}

function relBg(score: number): string {
  if (score >= 7) return "rgba(74,220,120,0.2)";   // 동맹
  if (score >= 3) return "rgba(74,140,92,0.1)";    // 우호
  if (score >= -3) return "rgba(255,255,255,0.05)"; // 중립
  if (score >= -7) return "rgba(224,112,80,0.15)";  // 적대
  return "rgba(212,68,62,0.3)";                     // 전쟁
}

export default function WorldStatus({ worldState, show, onClose }: WorldStatusProps) {
  if (!show) return null;

  const player = worldState.factions.find((f) => f.isPlayer);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.85)",
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "fadeInUp 0.3s ease",
    }}>
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "20px",
        width: "90%",
        maxWidth: "500px",
        maxHeight: "80vh",
        overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "14px", letterSpacing: "2px" }}>
            🏯 천하 정세
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "16px" }}>✕</button>
        </div>

        {worldState.factions.map((faction) => {
          const rel = player && !faction.isPlayer
            ? getRelation(worldState.relations, player.id, faction.id)
            : null;

          return (
            <div key={faction.id} style={{
              background: faction.isPlayer ? "rgba(74,140,92,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${faction.isPlayer ? "var(--success)" : "var(--border)"}`,
              borderRadius: "10px",
              padding: "12px",
              marginBottom: "8px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "13px" }}>
                  <span style={{ color: faction.color, marginRight: "6px" }}>{faction.icon}</span>
                  {faction.rulerName}
                  {faction.isPlayer && <span style={{ color: "var(--gold)", fontSize: "10px", marginLeft: "6px" }}>(나)</span>}
                  <span style={{ fontSize: "10px", color: "var(--text-dim)", marginLeft: "6px" }}>
                    Lv.{faction.rulerLevel.level} (배치 {faction.rulerLevel.deploymentCap.toLocaleString()})
                  </span>
                </span>
                {rel && (
                  <span style={{
                    fontSize: "10px",
                    padding: "2px 8px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    background: relBg(rel.score),
                    color: relColor(rel.score),
                    border: "1px solid currentColor",
                  }}>
                    {scoreToLabel(rel.score)} ({rel.score > 0 ? "+" : ""}{rel.score})
                  </span>
                )}
              </div>

              {/* 포인트 */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  ⚡ 행동 {faction.points.ap.toFixed(1)}/{faction.points.ap_max}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  🎯 전략 {faction.points.sp}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  ⚔️ 군사 {faction.points.mp.toLocaleString()}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  🏛️ 내정 {faction.points.ip}/{faction.points.ip_cap}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  🤝 외교 {faction.points.dp}
                </span>
              </div>

              {/* 병력 상세 */}
              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "4px" }}>
                병력 {faction.points.mp_troops.toLocaleString()}명 | 훈련 {(faction.points.mp_training * 100).toFixed(0)}% | 사기 {(faction.points.mp_morale * 100).toFixed(0)}%
              </div>

              {/* 시설 */}
              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "4px" }}>
                시장 Lv{faction.facilities.market} · 논 Lv{faction.facilities.farm} · 은행 Lv{faction.facilities.bank}
              </div>

              {/* 성채 */}
              <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                🏯 성채 {faction.castles.length}개: {faction.castles.join(", ")}
              </div>
            </div>
          );
        })}

        {/* 성채 라인 요약 */}
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "12px",
          marginTop: "8px",
        }}>
          <div style={{ fontSize: "11px", color: "var(--gold)", fontWeight: 700, marginBottom: "8px" }}>
            ⚔️ 전선 현황
          </div>
          {([
            { lineId: "liu_cao", label: "유비↔조조", start: "신야" },
            { lineId: "liu_sun", label: "유비↔손권", start: "하비" },
            { lineId: "sun_cao", label: "손권↔조조", start: "건업" },
          ] as const).map(({ lineId, label, start }) => {
            const ordered = getLineOrder(worldState.castles, lineId, start);
            return (
              <div key={lineId} style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-dim)", fontWeight: 700, marginBottom: "3px" }}>
                  {label} ({ordered.length}개)
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "2px", alignItems: "center" }}>
                  {ordered.map((castle, i) => {
                    const f = worldState.factions.find(f => f.id === castle.owner);
                    const gradeSymbol = castle.grade === "본성" ? "★" : castle.grade === "요새" ? "▲" : "·";
                    return (
                      <span key={castle.name} style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                        <span style={{
                          fontSize: "9px",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          background: `${f?.color || "#888"}22`,
                          border: `1px solid ${f?.color || "#888"}66`,
                          color: f?.color || "var(--text-secondary)",
                          fontWeight: castle.grade !== "일반" ? 700 : 400,
                          whiteSpace: "nowrap",
                        }}>
                          {gradeSymbol}{castle.name}
                        </span>
                        {i < ordered.length - 1 && (
                          <span style={{ fontSize: "8px", color: "var(--text-dim)" }}>→</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
