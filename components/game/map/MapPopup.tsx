"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { WorldState } from "@/types/game";
import type { MapHighlight } from "@/types/map";
import { WORLD_MAP } from "@/constants/worldMap";
import { TERRAIN_ICON, getCityPosition } from "@/constants/mapPositions";
import WorldMap from "./WorldMap";

interface MapPopupProps {
  worldState: WorldState;
  show: boolean;
  onClose: () => void;
  focusCity?: string | null;
  highlights?: MapHighlight[];
}

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.2;

function getCityOwner(cityName: string, worldState: WorldState) {
  for (const faction of worldState.factions) {
    if (faction.cities.some((c) => c.cityName === cityName)) {
      return faction;
    }
  }
  return null;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export default function MapPopup({ worldState, show, onClose, focusCity, highlights: externalHighlights }: MapPopupProps) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // 줌/팬 상태
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // 터치 줌 상태
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (show && focusCity) {
      setSelectedCity(focusCity);
      // 포커스 도시로 줌인 + 센터링
      const pos = getCityPosition(focusCity);
      if (pos) {
        const newScale = 2;
        setScale(newScale);
        // SVG viewBox 1000x800 기준, 컨테이너 중앙으로 오프셋 계산
        // translate는 % 기반이 아닌 px 기반이므로 컨테이너 크기 필요
        // 간략하게 SVG 좌표 비율로 오프셋
        setTranslate({
          x: -(pos.x / 1000 - 0.5) * 100 * (newScale - 1) * 2,
          y: -(pos.y / 800 - 0.5) * 100 * (newScale - 1) * 2,
        });
      }
    }
    if (show && !focusCity) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    }
  }, [show, focusCity]);

  // 팬 범위 제한
  const constrainTranslate = useCallback((tx: number, ty: number, s: number) => {
    const maxPan = (s - 1) * 50; // scale 기반 최대 팬 범위 (%)
    return {
      x: clamp(tx, -maxPan * 1.5, maxPan * 1.5),
      y: clamp(ty, -maxPan * 1.5, maxPan * 1.5),
    };
  }, []);

  // 줌 (마우스 휠)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((prev) => {
      const next = clamp(prev + delta, MIN_SCALE, MAX_SCALE);
      if (next === MIN_SCALE) {
        setTranslate({ x: 0, y: 0 });
      } else {
        setTranslate((t) => constrainTranslate(t.x, t.y, next));
      }
      return next;
    });
  }, [constrainTranslate]);

  // 드래그 시작
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [scale, translate]);

  // 드래그 이동
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const container = mapContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;
    const constrained = constrainTranslate(
      dragStart.current.tx + dx,
      dragStart.current.ty + dy,
      scale,
    );
    setTranslate(constrained);
  }, [isDragging, scale, constrainTranslate]);

  // 드래그 종료
  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 터치 줌 (핀치)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
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

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
    lastTouchCenter.current = null;
  }, []);

  // 줌 버튼
  const zoomIn = useCallback(() => {
    setScale((prev) => clamp(prev + ZOOM_STEP * 2, MIN_SCALE, MAX_SCALE));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const next = clamp(prev - ZOOM_STEP * 2, MIN_SCALE, MAX_SCALE);
      if (next === MIN_SCALE) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  if (!show) return null;

  const mapHighlights: MapHighlight[] = [
    ...(externalHighlights || []),
    ...(selectedCity ? [{ cityName: selectedCity, type: "selected" as const }] : []),
  ];

  const handleCityClick = (cityName: string) => {
    setSelectedCity((prev) => prev === cityName ? null : cityName);
  };

  // 선택된 도시 정보
  const worldCity = selectedCity ? WORLD_MAP.find((c) => c.name === selectedCity) : null;
  const owner = selectedCity ? getCityOwner(selectedCity, worldState) : null;
  const ownerCity = owner?.cities.find((c) => c.cityName === selectedCity);
  const governor = ownerCity?.governor;

  const zoomBtnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-secondary)",
    fontSize: "14px",
    cursor: "pointer",
    fontWeight: 700,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        zIndex: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeInUp 0.3s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "16px",
          width: "95%",
          maxWidth: "700px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "14px", letterSpacing: "2px" }}>
            📍 천하 지도
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "16px" }}
          >
            ✕
          </button>
        </div>

        {/* SVG 지도 (줌/팬 지원) */}
        <div
          ref={mapContainerRef}
          style={{
            background: "var(--bg-primary)",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            overflow: "hidden",
            marginBottom: "10px",
            position: "relative",
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
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
            bottom: "8px",
            right: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}>
            <button onClick={zoomIn} style={zoomBtnStyle} title="확대">+</button>
            <button onClick={zoomOut} style={zoomBtnStyle} title="축소">-</button>
            {scale > 1 && (
              <button onClick={resetZoom} style={{ ...zoomBtnStyle, fontSize: "10px" }} title="초기화">
                1:1
              </button>
            )}
          </div>

          {/* 줌 레벨 표시 */}
          {scale > 1 && (
            <div style={{
              position: "absolute",
              top: "8px",
              left: "8px",
              background: "rgba(0,0,0,0.6)",
              borderRadius: "4px",
              padding: "2px 6px",
              fontSize: "9px",
              color: "var(--text-dim)",
            }}>
              x{scale.toFixed(1)}
            </div>
          )}
        </div>

        {/* 범례 */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "10px",
          padding: "6px 8px",
          background: "rgba(255,255,255,0.02)",
          borderRadius: "8px",
          border: "1px solid var(--border)",
        }}>
          {worldState.factions.map((f) => (
            <span key={f.id} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px" }}>
              <span style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: f.color,
                display: "inline-block",
              }} />
              <span style={{ color: "var(--text-secondary)" }}>{f.rulerName}</span>
            </span>
          ))}
          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#555", display: "inline-block" }} />
            <span style={{ color: "var(--text-dim)" }}>중립</span>
          </span>
          <span style={{ fontSize: "10px", color: "var(--text-dim)", marginLeft: "auto" }}>
            🌾평원 ⛰️산지 🌊강 🏯요새
          </span>
        </div>

        {/* 선택 도시 정보 패널 */}
        {selectedCity && worldCity && (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${owner?.color || "var(--border)"}`,
            borderRadius: "10px",
            padding: "12px",
            animation: "fadeInUp 0.2s ease",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
                {TERRAIN_ICON[worldCity.terrain]} {selectedCity}
              </span>
              <span style={{
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "8px",
                background: owner ? `${owner.color}22` : "rgba(255,255,255,0.05)",
                color: owner?.color || "var(--text-dim)",
                fontWeight: 600,
                border: `1px solid ${owner?.color || "var(--border)"}44`,
              }}>
                {owner ? `${owner.icon} ${owner.rulerName}` : "중립"}
              </span>
            </div>

            {ownerCity ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {governor && (
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                      👤 태수: {governor}
                    </span>
                  )}
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    ⚔️ 병력: {ownerCity.garrison.toLocaleString()}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    🛡️ 방어: {ownerCity.defense}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    💰 상업: {ownerCity.commerce}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    🌾 농업: {ownerCity.agriculture}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    👥 인구: {ownerCity.population.toLocaleString()}
                  </span>
                </div>
                {worldCity.defenseBonus > 0 && (
                  <span style={{ fontSize: "10px", color: "var(--gold)" }}>
                    ⭐ 지형 방어 보너스: +{worldCity.defenseBonus}%
                  </span>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                영유 세력 없음
                {worldCity.defenseBonus > 0 && (
                  <span style={{ marginLeft: "8px", color: "var(--gold)" }}>
                    ⭐ 지형 방어 보너스: +{worldCity.defenseBonus}%
                  </span>
                )}
              </div>
            )}

            {/* 인접 도시 */}
            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>인접:</span>
              {worldCity.adjacentCities.map((adj) => {
                const adjOwner = getCityOwner(adj, worldState);
                return (
                  <button
                    key={adj}
                    onClick={() => setSelectedCity(adj)}
                    style={{
                      background: adjOwner ? `${adjOwner.color}15` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${adjOwner?.color || "var(--border)"}44`,
                      borderRadius: "6px",
                      padding: "2px 8px",
                      fontSize: "10px",
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
    </div>
  );
}
