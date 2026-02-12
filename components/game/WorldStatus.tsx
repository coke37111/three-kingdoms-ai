"use client";

import type { WorldState, DiplomaticRelation, FactionId } from "@/types/game";

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
            🗺️ 천하 정세
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
                </span>
                {rel && (
                  <span style={{
                    fontSize: "10px",
                    padding: "2px 8px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    background: rel.type === "동맹" ? "rgba(74,140,92,0.2)" :
                      rel.type === "우호" ? "rgba(74,140,92,0.1)" :
                      rel.type === "중립" ? "rgba(255,255,255,0.05)" :
                      rel.type === "적대" ? "rgba(212,68,62,0.15)" :
                      "rgba(212,68,62,0.3)",
                    color: rel.type === "동맹" || rel.type === "우호" ? "var(--success)" :
                      rel.type === "중립" ? "var(--text-secondary)" :
                      "var(--danger)",
                    border: "1px solid currentColor",
                  }}>
                    {rel.type} ({rel.score > 0 ? "+" : ""}{rel.score})
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>💰 {faction.gold.toLocaleString()}</span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>🌾 {faction.food.toLocaleString()}</span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>⚔️ {faction.totalTroops.toLocaleString()}</span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>🏯 {faction.cities.length}도시</span>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>👥 {faction.generals.length}장수</span>
              </div>

              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "4px" }}>
                영토: {faction.cities.map((c) => c.cityName).join(", ")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
