"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { WorldState } from "@/types/game";
import type { MapHighlight } from "@/types/map";
import { WORLD_MAP } from "@/constants/worldMap";
import { TERRAIN_ICON, getCityPosition } from "@/constants/mapPositions";
import WorldMap from "./WorldMap";

interface MapSidebarProps {
  worldState: WorldState;
  focusCity?: string | null;
}

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.2;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function getCityOwner(cityName: string, worldState: WorldState) {
  for (const faction of worldState.factions) {
    if (faction.cities.some((c) => c.cityName === cityName)) {
      return faction;
    }
  }
  return null;
}

export default function MapSidebar({ worldState, focusCity }: MapSidebarProps) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // 줌/팬 상태
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const lastTouchDist = useRef<number | null>(null);

  useEffect(() => {
    if (focusCity) {
      setSelectedCity(focusCity);
      const pos = getCityPosition(focusCity);
      if (pos) {
        const newScale = 2;
        setScale(newScale);
        setTranslate({
          x: -(pos.x / 1000 - 0.5) * 100 * (newScale - 1) * 2,
          y: -(pos.y / 800 - 0.5) * 100 * (newScale - 1) * 2,
        });
      }
    }
  }, [focusCity]);

  const constrainTranslate = useCallback((tx: number, ty: number, s: number) => {
    const basePan = 15; // 최소 줌에서도 약간의 팬 허용
    const maxPan = basePan + (s - 1) * 50;
    return {
      x: clamp(tx, -maxPan * 1.5, maxPan * 1.5),
      y: clamp(ty, -maxPan * 1.5, maxPan * 1.5),
    };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((prev) => {
      const next = clamp(prev + delta, MIN_SCALE, MAX_SCALE);
      setTranslate((t) => constrainTranslate(t.x, t.y, next));
      return next;
    });
  }, [constrainTranslate]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [scale, translate]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const container = mapContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;
    setTranslate(constrainTranslate(dragStart.current.tx + dx, dragStart.current.ty + dy, scale));
  }, [isDragging, scale, constrainTranslate]);

  const handlePointerUp = useCallback(() => { setIsDragging(false); }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = (dist - lastTouchDist.current) * 0.01;
      lastTouchDist.current = dist;
      setScale((prev) => {
        const next = clamp(prev + delta, MIN_SCALE, MAX_SCALE);
        if (next === MIN_SCALE) setTranslate({ x: 0, y: 0 });
        return next;
      });
    }
  }, []);

  const handleTouchEnd = useCallback(() => { lastTouchDist.current = null; }, []);

  const zoomIn = useCallback(() => {
    setScale((prev) => clamp(prev + ZOOM_STEP * 2, MIN_SCALE, MAX_SCALE));
  }, []);
  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const next = clamp(prev - ZOOM_STEP * 2, MIN_SCALE, MAX_SCALE);
      setTranslate((t) => constrainTranslate(t.x, t.y, next));
      return next;
    });
  }, [constrainTranslate]);
  const resetZoom = useCallback(() => { setScale(1); setTranslate({ x: 0, y: 0 }); }, []);

  const mapHighlights: MapHighlight[] = selectedCity
    ? [{ cityName: selectedCity, type: "selected" }]
    : [];

  const handleCityClick = (cityName: string) => {
    setSelectedCity((prev) => prev === cityName ? null : cityName);
  };

  const worldCity = selectedCity ? WORLD_MAP.find((c) => c.name === selectedCity) : null;
  const owner = selectedCity ? getCityOwner(selectedCity, worldState) : null;
  const ownerCity = owner?.cities.find((c) => c.cityName === selectedCity);
  const governor = ownerCity?.governor;

  const zoomBtnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-secondary)",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: 700,
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--bg-secondary)",
    }}>
      {/* 헤더 */}
      <div style={{
        padding: "8px 12px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "12px", letterSpacing: "1px" }}>
          📍 천하 지도
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          {worldState.factions.map((f) => (
            <span key={f.id} style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "9px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: f.color, display: "inline-block" }} />
              <span style={{ color: "var(--text-dim)" }}>{f.rulerName}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 지도 (줌/팬) */}
      <div
        ref={mapContainerRef}
        style={{
          flex: 1,
          overflow: "hidden",
          background: "var(--bg-primary)",
          minHeight: 0,
          position: "relative",
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{
          transform: `scale(${scale}) translate(${translate.x}%, ${translate.y}%)`,
          transformOrigin: "center center",
          transition: isDragging ? "none" : "transform 0.15s ease-out",
        }}>
          <WorldMap
            worldState={worldState}
            highlights={mapHighlights}
            interactive
            showLabels
            showTerrain
            onCityClick={handleCityClick}
          />
        </div>

        {/* 줌 컨트롤 */}
        <div style={{
          position: "absolute",
          bottom: "6px",
          right: "6px",
          display: "flex",
          flexDirection: "column",
          gap: "3px",
        }}>
          <button onClick={zoomIn} style={zoomBtnStyle}>+</button>
          <button onClick={zoomOut} style={zoomBtnStyle}>-</button>
          {scale > 1 && (
            <button onClick={resetZoom} style={{ ...zoomBtnStyle, fontSize: "8px" }}>1:1</button>
          )}
        </div>

        {scale > 1 && (
          <div style={{
            position: "absolute",
            top: "6px",
            left: "6px",
            background: "rgba(0,0,0,0.6)",
            borderRadius: "4px",
            padding: "1px 5px",
            fontSize: "8px",
            color: "var(--text-dim)",
          }}>
            x{scale.toFixed(1)}
          </div>
        )}
      </div>

      {/* 선택 도시 정보 */}
      {selectedCity && worldCity && (
        <div style={{
          padding: "10px",
          borderTop: "1px solid var(--border)",
          background: "var(--bg-card)",
          flexShrink: 0,
          overflowY: "auto",
          maxHeight: "40%",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>
              {TERRAIN_ICON[worldCity.terrain]} {selectedCity}
            </span>
            <span style={{
              fontSize: "9px",
              padding: "1px 6px",
              borderRadius: "6px",
              background: owner ? `${owner.color}22` : "rgba(255,255,255,0.05)",
              color: owner?.color || "var(--text-dim)",
              fontWeight: 600,
              border: `1px solid ${owner?.color || "var(--border)"}44`,
            }}>
              {owner ? `${owner.icon} ${owner.rulerName}` : "중립"}
            </span>
          </div>

          {ownerCity ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {governor && (
                  <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>👤 {governor}</span>
                )}
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>⚔️ {ownerCity.garrison.toLocaleString()}</span>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>🛡️ {ownerCity.defense}</span>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>💰 {ownerCity.commerce}</span>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>🌾 {ownerCity.agriculture}</span>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>👥 {ownerCity.population.toLocaleString()}</span>
              </div>
              {worldCity.defenseBonus > 0 && (
                <span style={{ fontSize: "9px", color: "var(--gold)" }}>
                  ⭐ 방어 보너스 +{worldCity.defenseBonus}%
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
              영유 세력 없음
              {worldCity.defenseBonus > 0 && (
                <span style={{ marginLeft: "6px", color: "var(--gold)" }}>⭐ +{worldCity.defenseBonus}%</span>
              )}
            </div>
          )}

          {/* 인접 도시 */}
          <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "9px", color: "var(--text-dim)" }}>인접:</span>
            {worldCity.adjacentCities.map((adj) => {
              const adjOwner = getCityOwner(adj, worldState);
              return (
                <button
                  key={adj}
                  onClick={() => setSelectedCity(adj)}
                  style={{
                    background: adjOwner ? `${adjOwner.color}15` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${adjOwner?.color || "var(--border)"}44`,
                    borderRadius: "4px",
                    padding: "1px 6px",
                    fontSize: "9px",
                    color: adjOwner?.color || "var(--text-secondary)",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  {adj}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
