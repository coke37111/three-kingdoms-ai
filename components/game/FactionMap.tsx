"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import type { WorldState, FactionId, Castle, CastleGrade } from "@/types/game";
import { CAPITAL_CASTLES } from "@/constants/castles";
import { FACTION_NAMES } from "@/constants/factions";

interface FactionMapProps {
  worldState: WorldState;
  show: boolean;
  onClose: () => void;
}

// ═══════════════ 삼각형 꼭지점 (SVG 좌표) ═══════════════

const VTX: Record<FactionId, { x: number; y: number }> = {
  liu_bei: { x: 400, y: 40 },
  cao_cao: { x: 75, y: 560 },
  sun_quan: { x: 725, y: 560 },
};

const CENTER = {
  x: (VTX.liu_bei.x + VTX.cao_cao.x + VTX.sun_quan.x) / 3,
  y: (VTX.liu_bei.y + VTX.cao_cao.y + VTX.sun_quan.y) / 3,
};

// ═══════════════ 라인 정의 ═══════════════

interface BranchDef { castles: string[]; angle: number; }
interface EdgeDef { from: FactionId; to: FactionId; main: string[]; branches: BranchDef[]; }

const EDGES: Record<string, EdgeDef> = {
  liu_cao: {
    from: "liu_bei", to: "cao_cao",
    main: ["신야", "양양", "완", "여남", "소패", "서주", "진류", "복양", "동군", "업", "낙양", "허창"],
    branches: [
      { castles: ["서주", "북해", "평원"], angle: 0 },
      { castles: ["업", "남피", "기주", "유주"], angle: 0 },
    ],
  },
  liu_sun: {
    from: "liu_bei", to: "sun_quan",
    main: ["하비", "강하", "무릉", "장사", "건업"],
    branches: [],
  },
  sun_cao: {
    from: "sun_quan", to: "cao_cao",
    main: ["건업", "여강", "합비", "수춘", "허창"],
    branches: [
      { castles: ["건업", "시상", "강릉", "계양", "영릉"], angle: -20 },
      { castles: ["허창", "장안", "천수", "안정", "무위"], angle: 25 },
      { castles: ["허창", "하내", "홍농"], angle: -10 },
    ],
  },
};

const FACTION_COLORS: Record<FactionId, string> = {
  liu_bei: "#4a8c5c", cao_cao: "#4466aa", sun_quan: "#d4443e",
};

const BRANCH_SPACING = 40;
const BASE_W = 800;
const BASE_H = 720;

// ═══════════════ 수학 유틸 ═══════════════

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function normalize(v: { x: number; y: number }) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

function rotateVec(v: { x: number; y: number }, deg: number) {
  const r = (deg * Math.PI) / 180;
  return { x: v.x * Math.cos(r) - v.y * Math.sin(r), y: v.x * Math.sin(r) + v.y * Math.cos(r) };
}

function outwardPerp(a: { x: number; y: number }, b: { x: number; y: number }) {
  const ed = { x: b.x - a.x, y: b.y - a.y };
  const p1 = normalize({ x: -ed.y, y: ed.x });
  const p2 = normalize({ x: ed.y, y: -ed.x });
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return (p1.x * (mid.x - CENTER.x) + p1.y * (mid.y - CENTER.y)) > 0 ? p1 : p2;
}

// ═══════════════ 위치 / 연결 계산 ═══════════════

type Pos = { x: number; y: number };
type PosMap = Map<string, Pos>;
interface Conn { from: string; to: string; branch: boolean; }

function computePositions(): PosMap {
  const pos: PosMap = new Map();
  pos.set(CAPITAL_CASTLES.liu_bei, VTX.liu_bei);
  pos.set(CAPITAL_CASTLES.cao_cao, VTX.cao_cao);
  pos.set(CAPITAL_CASTLES.sun_quan, VTX.sun_quan);

  for (const edge of Object.values(EDGES)) {
    const A = VTX[edge.from], B = VTX[edge.to];
    const n = edge.main.length;
    for (let i = 0; i < n; i++) {
      const name = edge.main[i];
      if (pos.has(name)) continue;
      let t = i / (n - 1);
      if (t === 0) t = 0.06;
      else if (t === 1) t = 0.94;
      pos.set(name, { x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t) });
    }
    const perp = outwardPerp(A, B);
    for (const br of edge.branches) {
      const start = pos.get(br.castles[0]);
      if (!start) continue;
      const dir = rotateVec(perp, br.angle);
      for (let i = 1; i < br.castles.length; i++) {
        if (pos.has(br.castles[i])) continue;
        pos.set(br.castles[i], {
          x: start.x + dir.x * BRANCH_SPACING * i,
          y: start.y + dir.y * BRANCH_SPACING * i,
        });
      }
    }
  }
  return pos;
}

function computeConnections(): Conn[] {
  const conns: Conn[] = [];
  for (const edge of Object.values(EDGES)) {
    for (let i = 0; i < edge.main.length - 1; i++)
      conns.push({ from: edge.main[i], to: edge.main[i + 1], branch: false });
    for (const br of edge.branches)
      for (let i = 0; i < br.castles.length - 1; i++)
        conns.push({ from: br.castles[i], to: br.castles[i + 1], branch: true });
  }
  // 신야↔하비 크로스 라인 연결
  conns.push({ from: "신야", to: "하비", branch: false });
  return conns;
}

// ═══════════════ 노드 스타일 ═══════════════

function nodeR(g: CastleGrade) { return g === "본성" ? 14 : g === "요새" ? 10 : 7; }
function nodeStroke(g: CastleGrade) { return g === "본성" ? "#c9a84c" : g === "요새" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)"; }
function nodeStrokeW(g: CastleGrade) { return g === "본성" ? 2.5 : g === "요새" ? 1.5 : 0.8; }
function labelSize(g: CastleGrade) { return g === "본성" ? 12 : g === "요새" ? 10 : 9; }

// ═══════════════ 메인 컴포넌트 ═══════════════

export default function FactionMap({ worldState, show, onClose }: FactionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // viewBox 기반 줌/팬
  const [vx, setVx] = useState(0);
  const [vy, setVy] = useState(0);
  const [zoom, setZoom] = useState(1);

  const dragRef = useRef({ active: false, sx: 0, sy: 0, svx: 0, svy: 0, moved: false });
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);

  // 선택된 성채
  const [selectedCastle, setSelectedCastle] = useState<string | null>(null);

  const positions = useMemo(() => computePositions(), []);
  const connections = useMemo(() => computeConnections(), []);

  // 모달 열릴 때 리셋
  useEffect(() => { if (show) { setVx(0); setVy(0); setZoom(1); setSelectedCastle(null); } }, [show]);

  // 휠 줌 (passive: false 필요)
  useEffect(() => {
    if (!show) return;
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.max(0.4, Math.min(4, z * factor)));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [show]);

  // 픽셀→SVG 변환 계수
  const svgScale = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { sx: 1, sy: 1 };
    const rect = el.getBoundingClientRect();
    return { sx: (BASE_W / zoom) / rect.width, sy: (BASE_H / zoom) / rect.height };
  }, [zoom]);

  // ── 마우스 드래그 ──
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
    if (!dragRef.current.moved) {
      // 클릭 (드래그 아님) — 빈 공간 클릭 시 선택 해제
      setSelectedCastle(null);
    }
    dragRef.current.active = false;
  }, []);

  // ── 터치 드래그 / 핀치 ──
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
      setZoom(Math.max(0.4, Math.min(4, pinchRef.current.zoom * (dist / pinchRef.current.dist))));
    }
  }, [svgScale]);

  const onTouchEnd = useCallback(() => {
    if (!dragRef.current.moved && pinchRef.current == null) {
      setSelectedCastle(null);
    }
    dragRef.current.active = false;
    pinchRef.current = null;
  }, []);

  const resetView = useCallback(() => { setVx(0); setVy(0); setZoom(1); }, []);

  if (!show) return null;

  const { castles, factions } = worldState;

  // viewBox
  const w = BASE_W / zoom, h = BASE_H / zoom;
  const viewBox = `${vx + (BASE_W - w) / 2} ${vy + (BASE_H - h) / 2} ${w} ${h}`;

  // 범례용
  const fCounts: Record<string, number> = {};
  for (const f of factions) fCounts[f.id] = f.castles.length;

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
            <ZoomBtn label="−" onClick={() => setZoom(z => Math.max(0.4, z * 0.8))} />
            <ZoomBtn label="↺" onClick={resetView} />
            <ZoomBtn label="+" onClick={() => setZoom(z => Math.min(4, z * 1.25))} />
            <span style={{ fontSize: "9px", color: "var(--text-dim)", marginLeft: "4px" }}>{Math.round(zoom * 100)}%</span>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {factions.map(f => (
              <span key={f.id} style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "var(--text-secondary)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: f.color, flexShrink: 0 }} />
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
                  stroke="rgba(255,255,255,0.15)" strokeWidth={c.branch ? 1 : 1.5}
                  strokeDasharray={c.branch ? "4 3" : "none"} />
              );
            })}

            {/* 성채 노드 + 라벨 + garrison */}
            {castles.map(castle => {
              const p = positions.get(castle.name);
              if (!p) return null;
              const r = nodeR(castle.grade);
              const color = FACTION_COLORS[castle.owner] || "#888";
              const isSelected = selectedCastle === castle.name;
              const garrisonLabel = castle.garrison >= 10000
                ? `${Math.round(castle.garrison / 10000)}만`
                : castle.garrison >= 1000
                  ? `${Math.round(castle.garrison / 1000)}천`
                  : `${castle.garrison}`;
              return (
                <g key={castle.name} style={{ cursor: "pointer" }}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setSelectedCastle(prev => prev === castle.name ? null : castle.name); }}>
                  {/* 선택 하이라이트 링 */}
                  {isSelected && (
                    <circle cx={p.x} cy={p.y} r={r + 5}
                      fill="none" stroke="var(--gold)" strokeWidth={2} strokeDasharray="4 2" opacity={0.8} />
                  )}
                  <circle cx={p.x} cy={p.y} r={r}
                    fill={color} fillOpacity={0.85}
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
          const ownerName = ownerFaction?.rulerName ?? castle.owner;
          const ownerColor = FACTION_COLORS[castle.owner] || "#888";
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
