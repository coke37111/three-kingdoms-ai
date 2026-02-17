"use client";

import type { WorldState } from "@/types/game";
import type { MapHighlight } from "@/types/map";
import { CITY_POSITIONS, TERRAIN_ICON, getCityPosition } from "@/constants/mapPositions";
import { WORLD_MAP } from "@/constants/worldMap";

interface WorldMapProps {
  worldState: WorldState;
  highlights?: MapHighlight[];
  interactive?: boolean;
  showLabels?: boolean;
  showTerrain?: boolean;
  onCityClick?: (cityName: string) => void;
}

const NEUTRAL_COLOR = "#555";

function getCityOwner(cityName: string, worldState: WorldState) {
  for (const faction of worldState.factions) {
    if (faction.cities.some((c) => c.cityName === cityName)) {
      return faction;
    }
  }
  return null;
}

export default function WorldMap({
  worldState,
  highlights = [],
  interactive = false,
  showLabels = true,
  showTerrain = true,
  onCityClick,
}: WorldMapProps) {
  const highlightSet = new Map(highlights.map((h) => [h.cityName, h]));

  return (
    <svg
      viewBox="0 0 1000 800"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {/* 배경 */}
      <rect x="0" y="0" width="1000" height="800" fill="var(--bg-primary)" rx="8" />

      {/* 세력 영역 (반투명 원 + blur) */}
      <defs>
        <filter id="territory-blur">
          <feGaussianBlur stdDeviation="30" />
        </filter>
      </defs>
      {CITY_POSITIONS.map((pos) => {
        const owner = getCityOwner(pos.name, worldState);
        const color = owner?.color || NEUTRAL_COLOR;
        return (
          <circle
            key={`territory-${pos.name}`}
            cx={pos.x}
            cy={pos.y}
            r="55"
            fill={color}
            opacity="0.18"
            filter="url(#territory-blur)"
          />
        );
      })}

      {/* 도로 (adjacentCities 기반) */}
      {WORLD_MAP.map((city) => {
        const from = getCityPosition(city.name);
        if (!from) return null;
        return city.adjacentCities.map((adj) => {
          // 중복 방지: 알파벳 순서로 한 방향만 렌더링
          if (city.name > adj) return null;
          const to = getCityPosition(adj);
          if (!to) return null;
          return (
            <line
              key={`road-${city.name}-${adj}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="rgba(201,168,76,0.15)"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
          );
        });
      })}

      {/* 도시 노드 */}
      {CITY_POSITIONS.map((pos) => {
        const owner = getCityOwner(pos.name, worldState);
        const color = owner?.color || NEUTRAL_COLOR;
        const worldCity = WORLD_MAP.find((c) => c.name === pos.name);
        const terrain = worldCity?.terrain;
        const highlight = highlightSet.get(pos.name);
        const isSelected = highlight?.type === "selected";
        const ownerCity = owner?.cities.find((c) => c.cityName === pos.name);

        return (
          <g
            key={`city-${pos.name}`}
            style={{ cursor: interactive ? "pointer" : "default" }}
            onClick={() => interactive && onCityClick?.(pos.name)}
          >
            {/* 선택 하이라이트 pulse */}
            {isSelected && (
              <circle cx={pos.x} cy={pos.y} r="24" fill="none" stroke={color} strokeWidth="2" opacity="0.6">
                <animate attributeName="r" values="24;30;24" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}

            {/* 배경 원 (세력색 글로우) */}
            <circle cx={pos.x} cy={pos.y} r="20" fill={color} opacity="0.3" />

            {/* 메인 원 (세력색 면) */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r="13"
              fill={color}
              opacity="0.85"
              stroke={isSelected ? "#fff" : `${color}88`}
              strokeWidth={isSelected ? "2.5" : "1"}
            />

            {/* 지형 아이콘 */}
            {showTerrain && terrain && (
              <>
                <circle cx={pos.x} cy={pos.y} r="7" fill="rgba(0,0,0,0.4)" />
                <text
                  x={pos.x}
                  y={pos.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="9"
                  style={{ pointerEvents: "none" }}
                >
                  {TERRAIN_ICON[terrain]}
                </text>
              </>
            )}

            {/* 라벨 */}
            {showLabels && (
              <text
                x={pos.x + (pos.labelOffset?.dx || 0)}
                y={pos.y + (pos.labelOffset?.dy || -22)}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--text-primary)"
                fontSize="11"
                fontWeight="600"
                style={{ pointerEvents: "none" }}
              >
                {pos.name}
              </text>
            )}

            {/* 병력 표시 (interactive 모드) */}
            {interactive && ownerCity && (
              <>
                <rect
                  x={pos.x - 16}
                  y={pos.y + 20}
                  width="32"
                  height="14"
                  rx="4"
                  fill="rgba(0,0,0,0.65)"
                />
                <text
                  x={pos.x}
                  y={pos.y + 27}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  fontSize="9"
                  fontWeight="600"
                  style={{ pointerEvents: "none" }}
                >
                  {Math.round(ownerCity.garrison / 10000)}만
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
