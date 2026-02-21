
// ===================== 포인트 컬러 정의 =====================

/** 포인트별 고유 색상 (CSS Variable 또는 Hex) */
export const POINT_COLORS = {
    AP: { label: "행동력", color: "#64b464" }, // Green
    SP: { label: "특수능력", color: "#5c9aff" }, // Blue
    MP: { label: "군사력", color: "#e65c5c" }, // Red
    IP: { label: "내정력", color: "#ffa726" }, // Orange
    DP: { label: "외교력", color: "#ba68c8" }, // Purple
};

/** 대사 내 포인트 용어 컬러링 패턴 (숫자 포함) */
// "내정력", "내정력 40", "내정력 +3", "군사력(병력) 3,000" 등을 한번에 잡기 위함 (전체 캡처 그룹 적용)
export const POINT_REGEX = /((?:행동력|특수능력|내정력|외교력|군사력(?:\(병력\))?|훈련도|사기)(?:\s*(?:[+-]?\d+(?:,\d+)*%?))?)/g;

export function getPointColor(text: string): string {
    if (text.includes("행동력")) return POINT_COLORS.AP.color;
    if (text.includes("특수능력")) return POINT_COLORS.SP.color;
    if (text.includes("군사력")) return POINT_COLORS.MP.color;
    if (text.includes("내정력")) return POINT_COLORS.IP.color;
    if (text.includes("외교력")) return POINT_COLORS.DP.color;
    if (text.includes("훈련도") || text.includes("사기")) return POINT_COLORS.MP.color;
    return "inherit";
}

export function getDeltaColor(value: number): string {
    return value >= 0 ? POINT_COLORS.AP.color : POINT_COLORS.MP.color;
}
