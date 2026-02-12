"use client";

import type { WorldState, FactionId, Faction } from "@/types/game";
import type { DiplomaticAction } from "@/lib/game/diplomacySystem";
import { getRelationBetween } from "@/lib/game/diplomacySystem";

interface DiplomacyPanelProps {
  worldState: WorldState;
  show: boolean;
  onClose: () => void;
  onAction: (targetId: FactionId, action: DiplomaticAction) => void;
  disabled: boolean;
}

const DIPLOMATIC_ACTIONS: { action: DiplomaticAction; label: string; icon: string; minScore?: number; maxScore?: number }[] = [
  { action: "관계_개선", label: "사절 파견", icon: "🕊️" },
  { action: "교역_제안", label: "교역 제안", icon: "📦", minScore: -30 },
  { action: "불가침_조약", label: "불가침 조약", icon: "📜", minScore: -10 },
  { action: "동맹_제안", label: "동맹 제안", icon: "🤝", minScore: 30 },
  { action: "선전포고", label: "선전포고", icon: "⚔️" },
];

export default function DiplomacyPanel({ worldState, show, onClose, onAction, disabled }: DiplomacyPanelProps) {
  if (!show) return null;

  const player = worldState.factions.find((f) => f.isPlayer)!;
  const others = worldState.factions.filter((f) => !f.isPlayer);

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
            🏛️ 외교
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "16px" }}>✕</button>
        </div>

        {others.map((faction) => {
          const rel = getRelationBetween(worldState.relations, player.id, faction.id);

          return (
            <div key={faction.id} style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "12px",
              marginBottom: "10px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontWeight: 700, fontSize: "13px" }}>
                  <span style={{ color: faction.color, marginRight: "4px" }}>{faction.icon}</span>
                  {faction.rulerName}
                </span>
                <span style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  color: rel.score > 20 ? "var(--success)" : rel.score < -20 ? "var(--danger)" : "var(--text-secondary)",
                  background: rel.score > 20 ? "rgba(74,140,92,0.15)" : rel.score < -20 ? "rgba(212,68,62,0.15)" : "rgba(255,255,255,0.05)",
                }}>
                  {rel.type} ({rel.score > 0 ? "+" : ""}{rel.score})
                </span>
              </div>

              {rel.treaties.length > 0 && (
                <div style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "6px" }}>
                  조약: {rel.treaties.map((t) => `${t.type}(${t.turnsRemaining}턴)`).join(", ")}
                </div>
              )}

              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {DIPLOMATIC_ACTIONS.map((da) => {
                  const available =
                    (da.minScore === undefined || rel.score >= da.minScore) &&
                    (da.maxScore === undefined || rel.score <= da.maxScore);

                  if (da.action === "선전포고" && rel.type === "전쟁") return null;
                  if (da.action === "동맹_제안" && rel.type === "동맹") return null;

                  return (
                    <button
                      key={da.action}
                      onClick={() => onAction(faction.id, da.action)}
                      disabled={disabled || !available}
                      style={{
                        background: available && !disabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "10px",
                        color: available && !disabled
                          ? da.action === "선전포고" ? "var(--danger)" : "var(--text-primary)"
                          : "var(--text-dim)",
                        cursor: disabled || !available ? "not-allowed" : "pointer",
                        opacity: disabled || !available ? 0.4 : 1,
                      }}
                    >
                      {da.icon} {da.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
