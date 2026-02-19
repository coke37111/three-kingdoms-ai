"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import type { WorldState, CastleGrade } from "@/types/game";
import { CASTLE_POSITIONS, CAPITAL_CASTLES } from "@/constants/castles";
import { FACTION_NAMES } from "@/constants/factions";

interface FactionMapProps {
  worldState: WorldState;
  show: boolean;
  onClose: () => void;
}

// ─── 세력 색상 (13개 세력 + neutral) ───────────────────────────────────────
const FACTION_COLORS: Record<string, string> = {
  liu_bei:      "#4a8c5c",
  cao_cao:      "#4466aa",
  sun_quan:     "#d4443e",
  liu_biao:     "#8B6914",
  ma_teng:      "#7B68EE",
  zhang_lu:     "#20B2AA",
  liu_zhang:    "#DAA520",
  jin_xuan:     "#C04000",
  liu_du:       "#556B2F",
  zhao_fan:     "#8B0000",
  han_xuan:     "#4682B4",
  gongsun_kang: "#A0522D",
  neutral:      "#5a5a5a",
};

const BASE_W = 900;
const BASE_H = 820;

// ─── 노드 스타일 헬퍼 ─────────────────────────────────────────────────────
function nodeR(g: CastleGrade) { return g === "본성" ? 14 : g === "요새" ? 10 : 7; }
function nodeStroke(g: CastleGrade) { return g === "본성" ? "#c9a84c" : g === "요새" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)"; }
function nodeStrokeW(g: CastleGrade) { return g === "본성" ? 2.5 : g === "요새" ? 1.5 : 0.8; }
function labelSize(g: CastleGrade) { return g === "본성" ? 12 : g === "요새" ? 10 : 9; }

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────
export default function FactionMap({ worldState, show, onClose }: FactionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [vx, setVx] = useState(0);
  const [vy, setVy] = useState(0);
  const [zoom, setZoom] = useState(1);

  const dragRef = useRef({ active: false, sx: 0, sy: 0, svx: 0, svy: 0, moved: false });
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  const [selectedCastle, setSelectedCastle] = useState<string | null>(null);

  // 지리 좌표 위치 맵
  const positions = useMemo(
    () => new Map(Object.entries(CASTLE_POSITIONS)),
    [],
  );

  // 인접 관계 기반 연결선 (중복 제거)
  const connections = useMemo(() => {
    const seen = new Set<string>();
    const conns: { from: string; to: string }[] = [];
    for (const castle of worldState.castles) {
      for (const adj of castle.adjacentCastles) {
        const key = [castle.name, adj].sort().join("|");
        if (!seen.has(key) && CASTLE_POSITIONS[castle.name] && CASTLE_POSITIONS[adj]) {
          seen.add(key);
          conns.push({ from: castle.name, to: adj });
        }
      }
    }
    return conns;
  }, [worldState.castles]);

  // 모달 열릴 때 플레이어 중심으로 포커싱
  useEffect(() => {
    if (!show) return;

    const player = worldState.factions.find(f => f.isPlayer);
    let targetX = BASE_W / 2;
    let targetY = BASE_H / 2;

    if (player && player.castles.length > 0) {
      let sumX = 0, sumY = 0, count = 0;
      for (const cName of player.castles) {
        const p = positions.get(cName);
        if (p) { sumX += p.x; sumY += p.y; count++; }
      }
      if (count > 0) {
        targetX = sumX / count;
        targetY = sumY / count;
      }
    }

    setZoom(1.3);
    setVx(targetX - BASE_W / 2);
    setVy(targetY - BASE_H / 2);
    setSelectedCastle(null);
  }, [show]);

  // 휠 줌
  useEffect(() => {
    if (!show) return;
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.max(0.3, Math.min(5, z * (e.deltaY > 0 ? 0.9 : 1.1))));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [show]);

  const svgScale = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { sx: 1, sy: 1 };
    const rect = el.getBoundingClientRect();
    return { sx: (BASE_W / zoom) / rect.width, sy: (BASE_H / zoom) / rect.height };
  }, [zoom]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, svx: vx, svy: vy, moved: false };
  }, [vx, vy]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    const s = svgScale();
    setVx(dragRef.current.svx - dx * s.sx);
    setVy(dragRef.current.svy - dy * s.sy);
  }, [svgScale]);

  const onMouseUp = useCallback(() => {
    if (!dragRef.current.moved) setSelectedCastle(null);
    dragRef.current.active = false;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragRef.current = { active: true, sx: e.touches[0].clientX, sy: e.touches[0].clientY, svx: vx, svy: vy, moved: false };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.sqrt(dx * dx + dy * dy), zoom };
    }
  }, [vx, vy, zoom]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && dragRef.current.active) {
      const dx = e.touches[0].clientX - dragRef.current.sx;
      const dy = e.touches[0].clientY - dragRef.current.sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
      const s = svgScale();
      setVx(dragRef.current.svx - dx * s.sx);
      setVy(dragRef.current.svy - dy * s.sy);
    } else if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      setZoom(Math.max(0.3, Math.min(5, pinchRef.current.zoom * (dist / pinchRef.current.dist))));
    }
  }, [svgScale]);

  const onTouchEnd = useCallback(() => {
    if (!dragRef.current.moved && pinchRef.current == null) setSelectedCastle(null);
    dragRef.current.active = false;
    pinchRef.current = null;
  }, []);

  const resetView = useCallback(() => { setVx(0); setVy(0); setZoom(1); }, []);

  if (!show) return null;

  const { castles, factions } = worldState;

  const w = BASE_W / zoom, h = BASE_H / zoom;
  const viewBox = `${vx + (BASE_W - w) / 2} ${vy + (BASE_H - h) / 2} ${w} ${h}`;

  const fCounts: Record<string, number> = {};
  for (const f of factions) {
    if (f.id !== "neutral") fCounts[f.id] = f.castles.length;
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeInUp 0.3s ease",
    }}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px",
        width: "94%", maxWidth: "560px", height: "85vh", maxHeight: "700px",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 8px" }}>
          <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "14px", letterSpacing: "2px" }}>🗺️ 세력 지도</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "16px" }}>✕</button>
        </div>

        {/* 줌 컨트롤 + 범례 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px 8px", flexWrap: "wrap", gap: "6px" }}>
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <ZoomBtn label="−" onClick={() => setZoom(z => Math.max(0.3, z * 0.8))} />
            <ZoomBtn label="↺" onClick={resetView} />
            <ZoomBtn label="+" onClick={() => setZoom(z => Math.min(5, z * 1.25))} />
            <span style={{ fontSize: "9px", color: "var(--text-dim)", marginLeft: "4px" }}>{Math.round(zoom * 100)}%</span>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", maxWidth: "340px", overflowY: "auto", maxHeight: "48px" }}>
            {factions.filter(f => f.id !== "neutral").map(f => (
              <span key={f.id} style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "9px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: f.color, flexShrink: 0 }} />
                {f.rulerName} {fCounts[f.id]}성
              </span>
            ))}
          </div>
        </div>

        {/* 지도 영역 */}
        <div
          ref={containerRef}
          style={{
            flex: 1, minHeight: 0, cursor: "grab", touchAction: "none", userSelect: "none",
            borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.3)", overflow: "hidden",
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <svg viewBox={viewBox} style={{ width: "100%", height: "100%", display: "block" }} preserveAspectRatio="xMidYMid meet">
            {/* 연결선 */}
            {connections.map((c, i) => {
              const p1 = positions.get(c.from), p2 = positions.get(c.to);
              if (!p1 || !p2) return null;
              return (
                <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
              );
            })}

            {/* 성채 노드 + 라벨 + garrison */}
            {castles.map(castle => {
              const p = positions.get(castle.name);
              if (!p) return null;
              const r = nodeR(castle.grade);
              const color = FACTION_COLORS[castle.owner] ?? "#888";
              const isSelected = selectedCastle === castle.name;
              const garrison = castle.garrison;
              const garrisonLabel = garrison >= 10000
                ? `${Math.round(garrison / 10000)}만`
                : garrison >= 1000
                  ? `${Math.round(garrison / 1000)}천`
                  : `${garrison}`;
              return (
                <g key={castle.name} style={{ cursor: "pointer" }}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setSelectedCastle(prev => prev === castle.name ? null : castle.name); }}>
                  {isSelected && (
                    <circle cx={p.x} cy={p.y} r={r + 5}
                      fill="none" stroke="var(--gold)" strokeWidth={2} strokeDasharray="4 2" opacity={0.8} />
                  )}
                  <circle cx={p.x} cy={p.y} r={r}
                    fill={color} fillOpacity={castle.owner === "neutral" ? 0.5 : 0.85}
                    stroke={isSelected ? "var(--gold)" : nodeStroke(castle.grade)}
                    strokeWidth={isSelected ? 2.5 : nodeStrokeW(castle.grade)} />
                  <text x={p.x} y={p.y + r + 12}
                    textAnchor="middle" fill={isSelected ? "#fff" : "#ccc"}
                    fontSize={labelSize(castle.grade)}
                    fontWeight={castle.grade === "본성" || isSelected ? 700 : 400}
                    stroke="rgba(0,0,0,0.8)" strokeWidth={3} paintOrder="stroke">
                    {castle.name}
                  </text>
                  {zoom >= 1.2 && (
                    <text x={p.x} y={p.y + r + 12 + labelSize(castle.grade) + 1}
                      textAnchor="middle" fill="rgba(255,255,255,0.5)"
                      fontSize={7}
                      stroke="rgba(0,0,0,0.8)" strokeWidth={2} paintOrder="stroke">
                      {garrisonLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* 하단: 성채 정보 또는 힌트 */}
        {selectedCastle ? (() => {
          const castle = castles.find(c => c.name === selectedCastle);
          if (!castle) return null;
          const ownerFaction = factions.find(f => f.id === castle.owner);
          const ownerName = ownerFaction?.rulerName ?? FACTION_NAMES[castle.owner] ?? castle.owner;
          const ownerColor = FACTION_COLORS[castle.owner] ?? "#888";
          const gradeLabel = castle.grade === "본성" ? "본성" : castle.grade === "요새" ? "요새" : "일반";
          const garrisonStr = castle.garrison.toLocaleString();
          const maxStr = castle.maxGarrison.toLocaleString();
          const fillRate = castle.maxGarrison > 0 ? Math.round((castle.garrison / castle.maxGarrison) * 100) : 0;
          return (
            <div style={{
              padding: "8px 16px", borderTop: "1px solid var(--border)",
              background: "rgba(201,168,76,0.06)", fontSize: "11px", color: "var(--text-secondary)",
              display: "flex", flexDirection: "column", gap: "4px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: ownerColor, fontWeight: 700 }}>{castle.name}</span>
                <span style={{ fontSize: "9px", opacity: 0.7 }}>{gradeLabel} · 방어 ×{castle.defenseMultiplier}</span>
                <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--text-dim)" }}>{ownerName}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>주둔 병력 <b style={{ color: "var(--gold)" }}>{garrisonStr}</b> / {maxStr}</span>
                <div style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: "rgba(255,255,255,0.1)", overflow: "hidden", maxWidth: 120,
                }}>
                  <div style={{
                    width: `${fillRate}%`, height: "100%", borderRadius: 2,
                    background: fillRate > 70 ? "#4a8c5c" : fillRate > 30 ? "var(--gold)" : "#d4443e",
                  }} />
                </div>
                <span style={{ fontSize: "9px", color: "var(--text-dim)" }}>{fillRate}%</span>
              </div>
            </div>
          );
        })() : (
          <div style={{ padding: "6px 16px", fontSize: "9px", color: "var(--text-dim)", textAlign: "center" }}>
            성채를 탭하여 병력 확인 · 드래그: 이동 · 휠/핀치: 확대축소
          </div>
        )}
      </div>
    </div>
  );
}

function ZoomBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: "6px",
      width: 26, height: 26, color: "var(--text-secondary)", fontSize: "13px", fontWeight: 700,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {label}
    </button>
  );
}
