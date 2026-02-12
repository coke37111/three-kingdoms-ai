"use client";

import type { GameState, ResourceDeltas } from "@/types/game";
import { SEASON_ICON } from "@/constants/gameConstants";

interface StatusBarProps {
  state: GameState;
  deltas: ResourceDeltas;
}

export default function StatusBar({ state, deltas }: StatusBarProps) {
  const stats = [
    { icon: "💰", label: "금", value: state.gold, delta: deltas.gold },
    { icon: "🌾", label: "식량", value: state.food, delta: deltas.food },
    { icon: "⚔️", label: "병력", value: state.totalTroops, delta: deltas.troops },
  ];

  return (
    <div style={{
      background: "linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)",
      borderBottom: "1px solid var(--border)",
      padding: "10px 16px 8px",
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      {/* Turn & Season */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "8px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: "16px",
            fontWeight: 900,
            color: "var(--gold)",
            letterSpacing: "2px",
          }}>
            第{state.currentTurn}턴
          </span>
          <span style={{ fontSize: "16px" }}>{SEASON_ICON[state.currentSeason]}</span>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{state.currentSeason}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>민심</span>
          <div style={{
            width: "80px",
            height: "6px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "3px",
            overflow: "hidden",
          }}>
            <div style={{
              width: `${state.popularity}%`,
              height: "100%",
              background: state.popularity > 60
                ? "var(--success)"
                : state.popularity > 30
                ? "var(--warning)"
                : "var(--danger)",
              borderRadius: "3px",
              transition: "width 0.6s ease",
            }} />
          </div>
          <span style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text-primary)",
            minWidth: "24px",
            textAlign: "right",
            position: "relative",
          }}>
            {state.popularity}
            {deltas.popularity !== 0 && (
              <span className="delta-anim" style={{ color: deltas.popularity > 0 ? "var(--success)" : "var(--danger)" }}>
                {deltas.popularity > 0 ? `+${deltas.popularity}` : deltas.popularity}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Resources */}
      <div style={{ display: "flex", gap: "6px" }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "6px 10px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            position: "relative",
          }}>
            <span style={{ fontSize: "14px" }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)", lineHeight: 1 }}>{s.label}</div>
              <div style={{ fontSize: "14px", fontWeight: 700, lineHeight: 1.3 }}>
                {s.value.toLocaleString()}
              </div>
            </div>
            {s.delta !== 0 && (
              <span className="delta-anim" style={{
                color: s.delta > 0 ? "var(--success)" : "var(--danger)",
                top: "2px",
                right: "6px",
              }}>
                {s.delta > 0 ? `+${s.delta.toLocaleString()}` : s.delta.toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
