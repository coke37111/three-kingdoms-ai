import type { WorldState } from "@/types/game";
import type { SituationBriefing, UrgentEventType, EmotionalDirective } from "@/types/council";

const DIRECTIVES_BY_TYPE: Record<UrgentEventType, EmotionalDirective[]> = {
  invasion: [
    { id: "angry", icon: "🔥", text: "감히! 도저히 용서할 수 없다!", tone: "aggressive", effect: "공격적 방향 — 관우 적극, 미축 걱정" },
    { id: "coop", icon: "🤔", text: "큰일이군. 이 난관을 함께 헤쳐나가세.", tone: "cooperative", effect: "균형 잡힌 토론" },
    { id: "delegate", icon: "🙏", text: "그대들이 잘 해결해 줄 거라 믿네.", tone: "delegating", effect: "제갈량 주도, 참모 자율성 증가" },
    { id: "anxious", icon: "😰", text: "...어떻게 해야 할지 모르겠구나.", tone: "anxious", effect: "참모들이 적극적으로 안심시키며 제안" },
  ],
  famine: [
    { id: "angry", icon: "💪", text: "백성이 굶주리는 것은 내 탓이다. 방법을 찾아라!", tone: "aggressive", effect: "적극적 내정 개혁" },
    { id: "coop", icon: "🤝", text: "이웃 나라에 도움을 구하는 것은 어떠한가?", tone: "cooperative", effect: "외교적 해결 모색" },
    { id: "delegate", icon: "🙏", text: "미축, 그대에게 맡기겠네.", tone: "delegating", effect: "미축 주도 내정 처리" },
    { id: "anxious", icon: "😔", text: "참으로 어려운 시기로구나...", tone: "anxious", effect: "참모 자율 판단" },
  ],
  betrayal: [
    { id: "angry", icon: "😡", text: "배은망덕한 자를 용서하지 않겠다!", tone: "aggressive", effect: "강경 대응" },
    { id: "coop", icon: "🤔", text: "어찌 이런 일이... 진상을 파악하게.", tone: "cooperative", effect: "조사 후 대응" },
    { id: "delegate", icon: "🙏", text: "군사, 이 일을 맡아주시오.", tone: "delegating", effect: "관우 주도 처리" },
    { id: "anxious", icon: "😢", text: "나의 부덕함이 이런 결과를...", tone: "anxious", effect: "참모들이 위로하며 수습" },
  ],
  city_lost: [
    { id: "angry", icon: "⚔️", text: "반드시 되찾겠다! 출격 준비를 하라!", tone: "aggressive", effect: "즉각 반격 준비" },
    { id: "coop", icon: "🤔", text: "잃은 것보다 남은 것을 지키는 게 먼저다.", tone: "cooperative", effect: "방어 우선 전략" },
    { id: "delegate", icon: "🙏", text: "제갈량, 대책을 세워주시오.", tone: "delegating", effect: "제갈량 종합 전략 수립" },
    { id: "anxious", icon: "😰", text: "이 나라의 앞날이 걱정되는구나...", tone: "anxious", effect: "참모들이 사기 진작" },
  ],
  general_defect: [
    { id: "angry", icon: "😡", text: "배신자는 용서하지 않는다!", tone: "aggressive", effect: "추적/처벌 방향" },
    { id: "coop", icon: "🤔", text: "무엇이 부족했는지 돌아봐야 하네.", tone: "cooperative", effect: "내부 결속 강화" },
    { id: "delegate", icon: "🙏", text: "조운, 동향을 살피게.", tone: "delegating", effect: "첩보 주도 대응" },
    { id: "anxious", icon: "😢", text: "함께했던 동료인데...", tone: "anxious", effect: "참모들이 충성 재확인" },
  ],
};

export function detectSituation(world: WorldState): SituationBriefing {
  const player = world.factions.find((f) => f.isPlayer);
  if (!player) {
    return { isUrgent: false, briefingText: "주공, 현 정세를 살펴보겠습니다." };
  }

  const events = player.recentEvents || [];
  const month = world.currentMonth;
  const season = world.currentSeason;

  // 긴급 상황 감지 (우선순위 순)
  // 1. 적 침공/공격 이벤트
  const invasionEvent = events.find((e) =>
    e.includes("침공") || e.includes("공격") || e.includes("선전포고") || e.includes("전쟁")
  );
  if (invasionEvent) {
    return {
      isUrgent: true,
      urgentType: "invasion",
      briefingText: `주공, 긴급 보고입니다! ${invasionEvent}`,
      directives: DIRECTIVES_BY_TYPE.invasion,
    };
  }

  // 2. 도시 상실
  const cityLostEvent = events.find((e) =>
    e.includes("함락") || e.includes("상실") || e.includes("빼앗")
  );
  if (cityLostEvent) {
    return {
      isUrgent: true,
      urgentType: "city_lost",
      briefingText: `주공, 통탄할 소식이옵니다. ${cityLostEvent}`,
      directives: DIRECTIVES_BY_TYPE.city_lost,
    };
  }

  // 3. 기근/경제 위기 (식량 < 1000 또는 금 < 500)
  if (player.food < 1000 || player.gold < 500) {
    const crisis = player.food < 1000 ? "식량이 바닥나고 있사옵니다" : "국고가 거의 비었사옵니다";
    return {
      isUrgent: true,
      urgentType: "famine",
      briefingText: `주공, ${crisis}. 금 ${player.gold.toLocaleString()}, 식량 ${player.food.toLocaleString()}입니다.`,
      directives: DIRECTIVES_BY_TYPE.famine,
    };
  }

  // 4. 배신/동맹 파기
  const betrayalEvent = events.find((e) =>
    e.includes("파기") || e.includes("배신") || e.includes("반란")
  );
  if (betrayalEvent) {
    return {
      isUrgent: true,
      urgentType: "betrayal",
      briefingText: `주공, ${betrayalEvent}`,
      directives: DIRECTIVES_BY_TYPE.betrayal,
    };
  }

  // 5. 장수 이탈
  const defectEvent = events.find((e) =>
    e.includes("이탈") || e.includes("탈영") || e.includes("투항")
  );
  if (defectEvent) {
    return {
      isUrgent: true,
      urgentType: "general_defect",
      briefingText: `주공, ${defectEvent}`,
      directives: DIRECTIVES_BY_TYPE.general_defect,
    };
  }

  // 평상시 — 간략 브리핑
  const cityCount = player.cities.length;
  const troopStr = player.totalTroops.toLocaleString();
  return {
    isUrgent: false,
    briefingText: `주공, ${season} ${month}월입니다. 현재 ${cityCount}개 도시, 병력 ${troopStr}. 특별한 위급 상황은 없사옵니다.`,
  };
}
