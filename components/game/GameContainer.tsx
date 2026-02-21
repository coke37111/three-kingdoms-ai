"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { FactionId, GameEndResult } from "@/types/game";
import type { ChatMessage, ConversationMessage, LLMProvider } from "@/types/chat";
import type { AdvisorState, CouncilMessage, MeetingPhase, StatusReport, PlanReport, AdvisorStatsDelta, ThreadMessage } from "@/types/council";
import { useWorldState } from "@/hooks/useWorldState";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useWorldTurn } from "@/hooks/useWorldTurn";
import { useTypewriter } from "@/hooks/useTypewriter";
import { callCouncilLLM, callReactionLLM, callMentionResponseLLM, type CallLLMOptions } from "@/lib/api/llmClient";
import { buildPhase1And3Prompt, buildPhase2Prompt, buildPhase1MentionResponsePrompt } from "@/lib/prompts/councilPrompt";
import { buildFactionAIPrompt, parseNPCResponse, type NPCActionType } from "@/lib/prompts/factionAIPrompt";
import { calcAllNPCActions } from "@/lib/game/npcAI";
import { autoSave, loadAutoSave, hasAutoSave, loadChatLog } from "@/lib/game/saveSystem";
import { getFirebaseAnalytics } from "@/lib/firebase/config";
import { logEvent } from "firebase/analytics";
import { checkGameEnd } from "@/lib/game/victorySystem";
import { resolveBattle, generateBattleNarrative, resolveRetreat } from "@/lib/game/combatSystem";
import { createWoundedPool } from "@/lib/game/pointCalculator";
import { rollTurnEvents } from "@/lib/game/eventSystem";
import { getResponseOptions, executeInvasionResponse } from "@/lib/game/invasionSystem";
import type { InvasionResponseType, PendingInvasion } from "@/types/game";
import { FACTION_NAMES } from "@/constants/factions";
import { INITIAL_ADVISORS } from "@/constants/advisors";
import { XP_PER_AP_SPENT, XP_PER_BATTLE_WIN, XP_PER_CASTLE_GAINED, RECRUIT_TROOPS_PER_IP, TRAIN_IP_COST, SP_TO_DP_COST, DP_CONVERSION_RATE, DP_REGEN_PER_TURN, getFacilityUpgradeCost, getFacilityBuildCost, SPECIAL_STRATEGY_INITIAL_RATE, SPECIAL_STRATEGY_USE_PENALTY, SPECIAL_STRATEGY_MIN_RATE, SPECIAL_STRATEGY_MAX_RATE, SPECIAL_STRATEGY_RECOVERY, SPECIAL_STRATEGY_COOLDOWN_TURNS } from "@/constants/gameConstants";
import { POINT_COLORS, getDeltaColor } from "@/constants/uiConstants";
import { SKILL_TREE } from "@/constants/skills";
import { useAuth } from "@/hooks/useAuth";
import TitleScreen from "./TitleScreen";
import WorldStatus from "./WorldStatus";
import FactionMap from "./FactionMap";
import TurnNotification, { type TurnNotificationItem } from "./TurnNotification";
import AdvisorBar from "./AdvisorBar";
import BattleReport from "./BattleReport";
import GameEndScreen from "./GameEndScreen";
import UserBadge from "./UserBadge";
import CouncilChat from "./CouncilChat";
import InvasionModal from "./InvasionModal";
import RecruitmentPopup from "./RecruitmentPopup";
import { useVoice } from "@/hooks/useVoice";
import { usePreferences } from "@/hooks/usePreferences";
import { analyzeGameSituation, shouldFallbackToLLM, runPhase1FromCases, runPhase3FromCases } from "@/lib/council/engine";
import { createInitialTurnContext } from "@/lib/council/types";
import { runMeetingFlow } from "@/lib/council/meetingFlow";
import AttackModal from "./AttackModal";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 새 정규화 기반 회의 시스템 활성화 */
const USE_NEW_MEETING_FLOW = true;
/** 제갈량만 발언하는 테스트 모드 */
const MEETING_FLOW_TEST_MODE = false;

export default function GameContainer() {
  const {
    worldState, setWorldState, worldStateRef,
    getPlayerFaction, getNPCFactions, updateFaction,
    applyPlayerChanges, applyNPCChanges, loadWorldState,
  } = useWorldState();

  const {
    messages, setMessages, addMessage,
    convHistory, setConvHistory, addToConvHistory,
    convHistoryRef, messagesRef,
    scrollRef, scrollToBottom,
  } = useChatHistory();

  const { user, uid, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const { llmProvider, setLlmProvider, prefsLoading } = usePreferences(uid);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [tokenUsage, setTokenUsageRaw] = useState<{ input: number; output: number }>(() => {
    if (typeof window === "undefined") return { input: 0, output: 0 };
    try {
      const s = localStorage.getItem("tk_usage");
      return s ? JSON.parse(s) : { input: 0, output: 0 };
    } catch { return { input: 0, output: 0 }; }
  });
  const setTokenUsage = useCallback((updater: { input: number; output: number } | ((prev: { input: number; output: number }) => { input: number; output: number })) => {
    setTokenUsageRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { localStorage.setItem("tk_usage", JSON.stringify(next)); } catch { }
      return next;
    });
  }, []);

  // 참모 상태
  const [advisors, setAdvisorsRaw] = useState<AdvisorState[]>(INITIAL_ADVISORS);
  const advisorsRef = useRef<AdvisorState[]>(INITIAL_ADVISORS);
  const setAdvisors = useCallback((u: AdvisorState[] | ((p: AdvisorState[]) => AdvisorState[])) => {
    setAdvisorsRaw((prev) => {
      const next = typeof u === "function" ? u(prev) : u;
      advisorsRef.current = next;
      return next;
    });
  }, []);

  // 참모 회의 메시지
  const [councilMessages, setCouncilMessagesRaw] = useState<CouncilMessage[]>([]);
  const councilMsgsRef = useRef<CouncilMessage[]>([]);
  const setCouncilMessages = useCallback((u: CouncilMessage[] | ((p: CouncilMessage[]) => CouncilMessage[])) => {
    setCouncilMessagesRaw((prev) => {
      const next = typeof u === "function" ? u(prev) : u;
      councilMsgsRef.current = next;
      return next;
    });
  }, []);

  // 시스템 메시지를 councilMessages에 인라인 추가
  const addSystemCouncilMsg = useCallback((text: string) => {
    setCouncilMessages(prev => [...prev, { speaker: "__system__", dialogue: text, emotion: "calm" as const }]);
  }, [setCouncilMessages]);

  // addMessage 어댑터: system → councilMessages, 나머지 → messages
  const addMsgToCouncil = useCallback((msg: ChatMessage) => {
    if (msg.role === "system") {
      addSystemCouncilMsg(msg.content);
    } else {
      addMessage(msg);
    }
  }, [addSystemCouncilMsg, addMessage]);

  const [councilNumber, setCouncilNumberRaw] = useState(0);
  const councilNumberRef = useRef(0);
  const setCouncilNumber = useCallback((u: number | ((p: number) => number)) => {
    setCouncilNumberRaw((prev) => {
      const next = typeof u === "function" ? u(prev) : u;
      councilNumberRef.current = next;
      return next;
    });
  }, []);

  // 3-Phase 회의 상태
  const [meetingPhase, setMeetingPhase] = useState<MeetingPhase>(1);
  const [statusReports, setStatusReports] = useState<StatusReport[]>([]);
  const [planReports, setPlanReports] = useState<PlanReport[]>([]);
  const [approvedPlans, setApprovedPlans] = useState<Set<number>>(new Set());

  // 타이핑 인디케이터
  const [typingIndicator, setTypingIndicator] = useState<{ speaker: string } | null>(null);

  // 이전 회의 기록
  const [prevCouncil, setPrevCouncil] = useState<{ number: number; messages: CouncilMessage[] } | null>(null);

  // 참모 발언 클릭 → 답장
  const [replyTarget, setReplyTarget] = useState<{ msg: CouncilMessage; index: number } | null>(null);

  // 쓰레드
  const [threads, setThreads] = useState<Record<number, ThreadMessage[]>>({});
  const [threadTyping, setThreadTyping] = useState<{ msgIndex: number; speaker: string } | null>(null);

  const processingTurnRef = useRef(false);
  const pendingInvasionsRef = useRef<PendingInvasion[]>([]);
  const pendingCasePlanReportsRef = useRef<import("@/types/council").PlanReport[]>([]);
  const turnCtxRef = useRef(createInitialTurnContext());
  const playerConqueredThisTurnRef = useRef(false); // Phase 2 공격으로 성채 획득 여부 추적

  // 침공 대응 모달
  const [pendingInvasion, setPendingInvasion] = useState<PendingInvasion | null>(null);
  const invasionResolveRef = useRef<((type: InvasionResponseType) => void) | null>(null);
  const battleResolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (uid) {
      hasAutoSave(uid).then(setHasSave);
    } else {
      setHasSave(false);
    }
  }, [uid]);

  // 모병 팝업
  const [recruitmentPopup, setRecruitmentPopup] = useState<{ maxIP: number } | null>(null);
  // 공격 개시 모달
  const [showAttackModal, setShowAttackModal] = useState(false);

  // Phase C states
  const [showWorldStatus, setShowWorldStatus] = useState(false);
  const [showFactionMap, setShowFactionMap] = useState(false);
  const [battleReport, setBattleReport] = useState<import("@/types/game").BattleResult | null>(null);
  const [gameEndResult, setGameEndResult] = useState<GameEndResult | null>(null);
  const [npcProcessing, setNpcProcessing] = useState(false);
  const [turnNotifications, setTurnNotifications] = useState<TurnNotificationItem[]>([]);

  const { advanceWorldTurn } = useWorldTurn({
    worldStateRef,
    setWorldState,
    addMessage: addMsgToCouncil,
  });

  const { cancelTypewriter } = useTypewriter();

  const {
    startListening, stopListening, isListening, partialTranscript,
  } = useVoice();

  useEffect(() => {
    return () => { cancelTypewriter(); };
  }, [cancelTypewriter]);

  // ---- 참모 열정/충성도 업데이트 ----
  const updateAdvisorStats = useCallback((updates: AdvisorStatsDelta[]) => {
    if (updates.length === 0) return;
    setAdvisors((prev) =>
      prev.map((a) => {
        const upd = updates.find((u) => u.name === a.name);
        if (!upd) return a;
        return {
          ...a,
          enthusiasm: Math.max(0, Math.min(100, a.enthusiasm + (upd.enthusiasm_delta ?? 0))),
          loyalty: Math.max(0, Math.min(100, a.loyalty + (upd.loyalty_delta ?? 0))),
        };
      })
    );
  }, []);

  // ---- Phase 1+3: 상태 보고 + 계획 보고 (API 1회) ----
  const doPhase1And3 = useCallback(async (context: string) => {
    const systemPrompt = buildPhase1And3Prompt(
      worldStateRef.current,
      advisorsRef.current,
      context,
    );

    addToConvHistory("user", context);
    const trimmedHistory = convHistoryRef.current.slice(-20);

    const t0 = Date.now();
    const { council, advisorUpdates, usage } = await callCouncilLLM(
      systemPrompt,
      trimmedHistory,
      llmProvider,
    );
    const elapsedMs = Date.now() - t0;

    if (usage) {
      setTokenUsage((prev) => ({
        input: prev.input + usage.input_tokens,
        output: prev.output + usage.output_tokens,
      }));
    }

    addToConvHistory("assistant", JSON.stringify(council));
    return { council, advisorUpdates, elapsedMs };
  }, [worldStateRef, addToConvHistory, convHistoryRef, llmProvider, setTokenUsage]);

  // ---- Phase 2: 군주 토론 (API 1회) ----
  const doPhase2Reply = useCallback(async (message: string, replyTo?: string) => {
    const systemPrompt = buildPhase2Prompt(
      worldStateRef.current,
      advisorsRef.current,
      message,
      replyTo,
    );

    addToConvHistory("user", message);
    const trimmedHistory = convHistoryRef.current.slice(-20);

    const t0 = Date.now();
    const { reaction, advisorUpdates, usage } = await callReactionLLM(
      systemPrompt,
      trimmedHistory,
      llmProvider,
      { replyTo },
    );
    const elapsedMs = Date.now() - t0;

    if (usage) {
      setTokenUsage((prev) => ({
        input: prev.input + usage.input_tokens,
        output: prev.output + usage.output_tokens,
      }));
    }

    addToConvHistory("assistant", JSON.stringify(reaction));
    return { reaction, advisorUpdates, elapsedMs };
  }, [worldStateRef, addToConvHistory, convHistoryRef, llmProvider, setTokenUsage]);

  // ---- 메시지 애니메이션 ----
  const animateCouncilMessages = useCallback(async (
    msgs: CouncilMessage[],
    clearFirst = true,
    options?: { firstImmediate?: boolean; speedDecay?: number; speedMultiplier?: number; apiElapsedMs?: number },
  ) => {
    if (clearFirst) setCouncilMessages([]);
    let credit = options?.apiElapsedMs ?? 0;

    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i];
      const decayIndex = options?.firstImmediate ? Math.max(0, i - 1) : i;
      const baseMultiplier = options?.speedMultiplier ?? 1;
      const speed = (options?.speedDecay ? Math.pow(options.speedDecay, decayIndex) : 1) * baseMultiplier;

      // replyTo가 설정된 경우 → 해당 참모의 가장 최근 메시지 쓰레드로 추가
      if (msg.replyTo) {
        const arr = councilMsgsRef.current;
        let targetIndex = -1;
        for (let j = arr.length - 1; j >= 0; j--) {
          if (arr[j].speaker === msg.replyTo) { targetIndex = j; break; }
        }
        if (targetIndex >= 0) {
          setThreadTyping({ msgIndex: targetIndex, speaker: msg.speaker });
          scrollToBottom();
          const typingDuration = Math.max(400, msg.dialogue.length * 30 * speed);
          const actualTyping = Math.max(0, typingDuration - credit);
          credit = Math.max(0, credit - typingDuration);
          await delay(actualTyping);
          setThreadTyping(null);
          addThreadMessage(targetIndex, {
            type: "advisor",
            speaker: msg.speaker,
            text: msg.dialogue,
            emotion: msg.emotion,
          });
          scrollToBottom();
          if (i < msgs.length - 1) {
            const interDelay = (400 + Math.random() * 800) * speed;
            const actualInter = Math.max(0, interDelay - credit);
            credit = Math.max(0, credit - interDelay);
            await delay(actualInter);
          }
          continue;
        }
      }

      if (i === 0 && options?.firstImmediate) {
        setCouncilMessages((prev) => [...prev, msg]);
        scrollToBottom();
      } else {
        setTypingIndicator({ speaker: msg.speaker });
        scrollToBottom();
        const typingDuration = Math.max(400, msg.dialogue.length * 30 * speed);
        const actualTyping = Math.max(0, typingDuration - credit);
        credit = Math.max(0, credit - typingDuration);
        await delay(actualTyping);

        setTypingIndicator(null);
        setCouncilMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }

      if (i < msgs.length - 1) {
        const interDelay = (500 + Math.random() * 1500) * speed;
        const actualInter = Math.max(0, interDelay - credit);
        credit = Math.max(0, credit - interDelay);
        await delay(actualInter);
      }
    }
  }, [scrollToBottom]);

  // ---- NPC 턴 처리 (Utility AI 기반) ----
  const processNPCTurns = useCallback(async (): Promise<TurnNotificationItem[]> => {
    const world = worldStateRef.current;
    const npcFactions = world.factions.filter(f => !f.isPlayer && f.id !== "neutral");
    if (npcFactions.length === 0) return [];

    setNpcProcessing(true);
    addSystemCouncilMsg("⏳ 타국 군주들이 행동 중...");

    try {
      // Utility AI로 NPC 행동 결정 (LLM 불필요)
      const npcResults = calcAllNPCActions(world);
      const notifications: TurnNotificationItem[] = [];

      for (const result of npcResults) {
        const faction = world.factions.find(f => f.id === result.factionId);
        if (!faction) continue;

        notifications.push({
          factionId: result.factionId,
          summary: result.summary || result.actions.map(a => a.action).join(", "),
          icon: faction.icon,
        });

        for (const action of result.actions) {
          applyNPCAction(result.factionId, action);
        }
      }

      setNpcProcessing(false);
      return notifications;
    } catch (err) {
      console.error("NPC Utility AI error:", err);
      // 폴백: LLM 호출 시도
      try {
        const prompt = buildFactionAIPrompt(world, npcFactions);
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: "너는 삼국지 전략 게임의 심판이다. 반드시 JSON으로만 응답하라.",
            messages: [{ role: "user", content: prompt }],
            provider: llmProvider,
          }),
        });
        const data = await res.json();
        const raw = data.text || "";
        if (data.usage && !data.cached) {
          setTokenUsage((prev) => ({
            input: prev.input + data.usage.input_tokens,
            output: prev.output + data.usage.output_tokens,
          }));
        }
        const llmResults = parseNPCResponse(raw);
        if (llmResults.length === 0) throw new Error("LLM NPC 응답 파싱 실패");
        const notifications: TurnNotificationItem[] = [];
        for (const result of llmResults) {
          const faction = world.factions.find(f => f.id === result.factionId);
          if (!faction) continue;
          notifications.push({
            factionId: result.factionId,
            summary: result.summary || result.actions.map(a => a.action).join(", "),
            icon: faction.icon,
          });
          for (const action of result.actions) {
            applyNPCAction(result.factionId, action);
          }
        }
        setNpcProcessing(false);
        return notifications;
      } catch (llmErr) {
        console.error("NPC LLM fallback error:", llmErr);
        const notifications: TurnNotificationItem[] = [];
        for (const npc of npcFactions) {
          applyDeterministicAction(npc.id);
          notifications.push({ factionId: npc.id, summary: "내정에 집중하고 있습니다.", icon: npc.icon });
        }
        setNpcProcessing(false);
        return notifications;
      }
    }
  }, [worldStateRef, addSystemCouncilMsg, llmProvider, setTokenUsage]);

  // ---- NPC 행동 적용 ----
  const applyNPCAction = useCallback((factionId: FactionId, action: { action: NPCActionType; target?: string }) => {
    // cost_reduce 스킬 적용: 모병/훈련 IP 비용 할인
    const world = worldStateRef.current;
    const faction = world.factions.find(f => f.id === factionId);
    let costReduceRate = 0;
    if (faction) {
      for (const sid of faction.skills) {
        const def = SKILL_TREE.find(s => s.id === sid);
        if (def?.effect.type === "cost_reduce") costReduceRate += def.effect.value;
      }
    }
    const discount = 1 - costReduceRate;

    switch (action.action) {
      case "개발": {
        // target: "market" | "farm" | "bank" (Utility AI 지정) 또는 기본값 "market"
        const facType = (action.target === "farm" || action.target === "bank")
          ? action.target
          : "market";
        const facilitiesNow = faction?.facilities;
        let devCost: number;
        let facUpgrade: { type: "market" | "farm" | "bank"; count_delta?: number; level_delta?: number };
        if (facType === "bank") {
          devCost = getFacilityUpgradeCost(facilitiesNow?.bank ?? 0);
          facUpgrade = { type: "bank", level_delta: 1 };
        } else {
          const fb = facilitiesNow?.[facType];
          const npcCastleCount = worldStateRef.current.castles.filter(c => c.owner === factionId).length;
          if ((fb?.count ?? 0) < npcCastleCount) {
            devCost = getFacilityBuildCost(fb?.count ?? 0);
            facUpgrade = { type: facType, count_delta: 1 };
          } else {
            devCost = getFacilityUpgradeCost(fb?.level ?? 1);
            facUpgrade = { type: facType, level_delta: 1 };
          }
        }
        const npcIp = faction?.points.ip ?? 0;
        if (npcIp < devCost) break; // IP 부족 시 스킵
        applyNPCChanges(factionId, {
          point_deltas: { ip_delta: -devCost },
          facility_upgrades: [facUpgrade],
        });
        break;
      }
      case "모병": {
        // NPC는 보유 IP의 절반을 모병에 투자 (최소 10, 최대 50)
        const npcIp = faction?.points.ip ?? 0;
        const recruitIp = Math.min(50, Math.max(10, Math.floor(npcIp * 0.5)));
        const recruitTroops = Math.round(recruitIp * RECRUIT_TROOPS_PER_IP * (1 + costReduceRate));
        applyNPCChanges(factionId, {
          point_deltas: { ip_delta: -Math.round(recruitIp * discount), mp_troops_delta: recruitTroops },
        });
        break;
      }
      case "훈련":
        applyNPCChanges(factionId, {
          point_deltas: { ip_delta: -Math.round(TRAIN_IP_COST * discount), mp_training_delta: 0.05 },
        });
        break;
      case "공격": {
        // 초반 6턴: 게임 적응 기간 — 모든 전투 차단
        if (world.currentTurn <= 6) break;
        if (!action.target || !faction) break;
        const targetCastle = world.castles.find(c => c.name === action.target);
        if (!targetCastle || targetCastle.owner === factionId) break;
        const defenderFaction = world.factions.find(f => f.id === targetCastle.owner);
        if (!defenderFaction) break;

        // 플레이어 성채 공격 → pendingInvasions에 수집 (Phase 5에서 별도 처리)
        if (targetCastle.owner === "liu_bei") {
          pendingInvasionsRef.current.push({
            attackerFactionId: factionId,
            targetCastle: targetCastle.name,
            attackerTroops: Math.floor(faction.points.mp_troops * 0.6),
          });
          break;
        }

        const atkTroops = Math.floor(faction.points.mp_troops * 0.6);
        const defTroops = Math.min(defenderFaction.points.mp_troops, targetCastle.garrison);
        if (atkTroops <= 0) break;
        const result = resolveBattle(faction, defenderFaction, "공성", targetCastle, atkTroops, defTroops);
        result.narrative = generateBattleNarrative(result, faction.rulerName, defenderFaction.rulerName, factionId);

        // 공격측 손실/부상 적용
        applyNPCChanges(factionId, {
          point_deltas: { mp_troops_delta: -result.attackerLosses },
        });
        if (result.attackerWounded > 0) {
          const atkFac = world.factions.find(f => f.id === factionId)!;
          atkFac.woundedPool = [...atkFac.woundedPool, createWoundedPool(result.attackerWounded)];
        }
        // 수비측 손실/부상 적용 (garrison 차감 포함)
        applyNPCChanges(targetCastle.owner, {
          point_deltas: { mp_troops_delta: -result.defenderLosses },
          castle_updates: [{ castle: targetCastle.name, garrison_delta: -result.defenderLosses }],
          ...(result.castleConquered ? { conquered_castles: [result.castleConquered] } : {}),
        });
        if (result.defenderWounded > 0) {
          const defFac = world.factions.find(f => f.id === targetCastle.owner)!;
          defFac.woundedPool = [...defFac.woundedPool, createWoundedPool(result.defenderWounded)];
        }

        // 시설 피해 적용 (수비측)
        if (result.facilityDamage) {
          const dmgUpgrades: { type: "farm" | "market"; levels: number }[] = [];
          if (result.facilityDamage.farm_damage > 0) dmgUpgrades.push({ type: "farm", levels: -result.facilityDamage.farm_damage });
          if (result.facilityDamage.market_damage > 0) dmgUpgrades.push({ type: "market", levels: -result.facilityDamage.market_damage });
          if (dmgUpgrades.length > 0) {
            applyNPCChanges(targetCastle.owner, { facility_upgrades: dmgUpgrades });
          }
        }

        // 점령 시 소유권 이전 + garrison 초기화 + 도주 판정
        if (result.castleConquered) {
          applyNPCChanges(factionId, {
            conquered_castles: [result.castleConquered],
            castle_updates: [{ castle: result.castleConquered, garrison_delta: -targetCastle.garrison }],
          });

          // 도주 판정
          const updatedWorld = worldStateRef.current;
          const loser = updatedWorld.factions.find(f => f.id === targetCastle.owner);
          if (loser) {
            const retreat = resolveRetreat(loser, result.castleConquered, updatedWorld.castles);
            if (retreat) {
              result.retreatInfo = retreat;
              applyNPCChanges(targetCastle.owner, {
                point_deltas: {
                  mp_troops_delta: -retreat.troopsLost,
                  mp_morale_delta: retreat.moralePenalty,
                },
              });
            }
          }
        }

        addSystemCouncilMsg(result.narrative);
        setBattleReport(result);
        break;
      }
      case "외교":
        applyNPCChanges(factionId, { point_deltas: { dp_delta: -2 } });
        break;
      case "방어":
        applyNPCChanges(factionId, { point_deltas: { mp_morale_delta: 0.02 } });
        break;
      case "스킬":
        break;
      default:
        break;
    }
  }, [applyNPCChanges, worldStateRef, addSystemCouncilMsg, setBattleReport]);

  const applyDeterministicAction = useCallback((factionId: FactionId) => {
    applyNPCAction(factionId, { action: "개발" });
  }, [applyNPCAction]);

  // ---- 게임 종료 체크 ----
  const doCheckGameEnd = useCallback(() => {
    const result = checkGameEnd(worldStateRef.current);
    if (result) {
      setGameEndResult(result);
      const analytics = getFirebaseAnalytics();
      if (analytics) logEvent(analytics, "game_end", { type: result.type, turn: result.turn });
      return true;
    }
    return false;
  }, [worldStateRef]);

  // ---- 자동 저장 ----
  const doAutoSave = useCallback(async () => {
    if (!uid) return;
    try {
      await autoSave(worldStateRef.current, messagesRef.current, convHistoryRef.current, uid, advisorsRef.current, councilMsgsRef.current);
    } catch (err) {
      console.warn("자동 저장 실패:", err);
    }
  }, [worldStateRef, messagesRef, convHistoryRef, uid]);

  // ---- 모병 팝업 확인 ----
  const handleRecruitConfirm = useCallback((troops: number) => {
    const ipCost = Math.ceil(troops / RECRUIT_TROOPS_PER_IP);
    applyPlayerChanges({ point_deltas: { ip_delta: -ipCost, mp_troops_delta: troops } }, addMsgToCouncil);
    setCouncilMessages(prev => [...prev, {
      speaker: "관우",
      dialogue: `${troops.toLocaleString()}명 모병 완료! (내정력 -${ipCost})`,
      emotion: "excited" as const,
    }]);
    setRecruitmentPopup(null);
    doAutoSave();
  }, [applyPlayerChanges, addMsgToCouncil, doAutoSave]);

  // ---- AP 소비 ----
  const consumeAP = useCallback((amount: number) => {
    applyPlayerChanges({
      point_deltas: { ap_delta: -amount },
      xp_gain: Math.floor(amount * XP_PER_AP_SPENT),
    }, addMsgToCouncil);
  }, [applyPlayerChanges, addMsgToCouncil]);

  // ---- SP→DP 변환 ----
  const handleConvertSPtoDP = useCallback(() => {
    const player = worldStateRef.current.factions.find(f => f.isPlayer);
    if (!player || player.points.sp < SP_TO_DP_COST) return;
    applyPlayerChanges({
      point_deltas: { sp_delta: -SP_TO_DP_COST, dp_delta: 1 },
    }, addMsgToCouncil);
  }, [applyPlayerChanges, addMsgToCouncil, worldStateRef]);

  // ---- 3-Phase 회의: 보고(상태+계획) → 토론 → 실행 ----
  const runMeetingPhase1And3 = useCallback(async (context: string) => {
    const oldMsgs = councilMsgsRef.current;
    const oldNum = councilNumberRef.current;
    if (oldMsgs.length > 0) {
      setPrevCouncil({ number: oldNum, messages: oldMsgs });
    }

    setCouncilNumber(n => n + 1);
    setCouncilMessages([]);
    setStatusReports([]);
    setPlanReports([]);
    setApprovedPlans(new Set());
    setReplyTarget(null);
    setThreads({});
    setThreadTyping(null);
    setMeetingPhase(1);
    setIsLoading(true);

    try {
      // ── 케이스 엔진 경로 ──
      const situation = analyzeGameSituation(
        worldStateRef.current,
        advisorsRef.current,
        turnCtxRef.current,
      );
      const consecutive = turnCtxRef.current.consecutiveCaseTurns;

      // ── 새 회의 흐름 경로 ──
      if (USE_NEW_MEETING_FLOW && !shouldFallbackToLLM(situation, consecutive)) {
        const flowResult = runMeetingFlow(
          situation,
          worldStateRef.current,
          advisorsRef.current,
          worldStateRef.current.currentTurn,
          { testMode: MEETING_FLOW_TEST_MODE },
        );

        if (flowResult.advisorUpdates.length > 0) {
          updateAdvisorStats(flowResult.advisorUpdates);
        }

        pendingCasePlanReportsRef.current = flowResult.planReports;
        turnCtxRef.current = { ...turnCtxRef.current, consecutiveCaseTurns: consecutive + 1 };

        await animateCouncilMessages(flowResult.messages, true, {});
        setStatusReports(flowResult.statusReports);
        setPlanReports(flowResult.planReports);
        setMeetingPhase(2);
        setIsLoading(false);
        return;
      }

      // ── 기존 케이스 엔진 경로 ──
      if (!shouldFallbackToLLM(situation, consecutive)) {
        const phase1 = runPhase1FromCases(situation, worldStateRef.current.currentTurn);
        const phase3 = runPhase3FromCases(situation, worldStateRef.current.currentTurn, phase1?.judgment);

        if (phase1 && phase3) {
          updateAdvisorStats(phase1.advisorUpdates);
          pendingCasePlanReportsRef.current = phase3.planReports;
          turnCtxRef.current = { ...turnCtxRef.current, consecutiveCaseTurns: consecutive + 1 };

          // 엔진이 반환한 Phase 1 메시지 순서를 유지 (선도-댓글 구조 보존)
          // Phase 3 메시지는 각 참모의 첫 발언에 병합
          const usedP3 = new Set<string>();
          const merged: CouncilMessage[] = [];

          for (const msg of phase1.messages) {
            if (!usedP3.has(msg.speaker)) {
              const p3 = phase3.messages.find(m => m.speaker === msg.speaker);
              if (p3) {
                merged.push({
                  ...msg,
                  dialogue: `${msg.dialogue} ${p3.dialogue}`,
                  emotion: p3.emotion,
                  phase: 1 as const,
                });
                usedP3.add(msg.speaker);
                continue;
              }
            }
            merged.push({ ...msg, phase: 1 as const });
          }

          // Phase 3에만 있는 참모 → 마무리 메시지 직전에 삽입
          for (const p3Msg of phase3.messages) {
            if (!usedP3.has(p3Msg.speaker)) {
              const closingIdx = merged.length - 1;
              merged.splice(closingIdx, 0, { ...p3Msg, phase: 1 as const });
              usedP3.add(p3Msg.speaker);
            }
          }

          await animateCouncilMessages(merged, true, {});
          setStatusReports(phase1.statusReports);
          setPlanReports(phase3.planReports);
          setMeetingPhase(2);
          setIsLoading(false);
          return;
        }
      }

      // ── LLM 폴백 경로 ──
      turnCtxRef.current = { ...turnCtxRef.current, consecutiveCaseTurns: 0 };
      const { council, advisorUpdates, elapsedMs } = await doPhase1And3(context);
      updateAdvisorStats(advisorUpdates);

      if (council.state_changes) {
        const { result_message: _, ...changesOnly } = council.state_changes;
        applyPlayerChanges(changesOnly, addMsgToCouncil);
      } else {
        pendingCasePlanReportsRef.current = council.plan_reports;
      }

      // ── POST-PROCESSING: advisor_mentions 기반 replyTo 자동 주입 ──
      let processedMessages = council.council_messages;
      let remainingMentions = council.advisor_mentions ?? [];

      if (remainingMentions.length > 0) {
        processedMessages = council.council_messages.map(msg => {
          if (msg.replyTo) return msg; // 이미 설정됨 → 유지
          const mention = remainingMentions.find(m => m.to === msg.speaker);
          return mention ? { ...msg, replyTo: mention.from } : msg;
        });

        // replyTo가 설정된 참모는 별도 mention API 호출 불필요
        const handledAdvisors = new Set(processedMessages.filter(m => m.replyTo).map(m => m.speaker));
        remainingMentions = remainingMentions.filter(m => !handledAdvisors.has(m.to));
      }

      // 모든 메시지를 순서대로 애니메이션 (구분선 없음)
      await animateCouncilMessages(processedMessages, true, { apiElapsedMs: elapsedMs });
      setStatusReports(council.status_reports);
      setPlanReports(council.plan_reports);

      // ── 멘션 응답 처리 ──
      if (remainingMentions.length > 0) {
        try {
          const mentionSystem = buildPhase1MentionResponsePrompt(
            worldStateRef.current,
            advisorsRef.current,
            remainingMentions,
            council.council_messages,
          );
          const { mentionResponses, usage: mentionUsage } = await callMentionResponseLLM(
            mentionSystem,
            [{ role: "user", content: "위 멘션 요청에 대한 응답을 생성해주세요." }],
            llmProvider,
          );
          if (mentionUsage) {
            setTokenUsage((prev) => ({
              input: prev.input + mentionUsage.input_tokens,
              output: prev.output + mentionUsage.output_tokens,
            }));
          }
          for (const resp of mentionResponses) {
            const fromName = resp.replyTo;
            if (!fromName) continue;
            // replyTo 참모의 메시지 인덱스 찾기 (현재 councilMessages 기준)
            const msgIndex = councilMsgsRef.current.findIndex(m => m.speaker === fromName);
            if (msgIndex < 0) continue;
            // 타이핑 인디케이터 표시
            setThreadTyping({ msgIndex, speaker: resp.speaker });
            await delay(Math.max(400, resp.dialogue.length * 30));
            setThreadTyping(null);
            addThreadMessage(msgIndex, {
              type: "advisor",
              speaker: resp.speaker,
              text: resp.dialogue,
              emotion: resp.emotion,
            });
          }
        } catch (mentionErr) {
          console.error("Mention response error (ignored):", mentionErr);
        }
      }

      setMeetingPhase(2);

      const player = worldStateRef.current.factions.find(f => f.isPlayer);
      if (player && player.points.ap >= 1) {
        setIsLoading(false);
      } else {
        // AP 부족 — 바로 실행
        await delay(500);
      }
    } catch (err) {
      console.error("Phase 1+3 error:", err);
      setIsLoading(false);
    }
  }, [doPhase1And3, animateCouncilMessages, updateAdvisorStats, applyPlayerChanges, addMsgToCouncil, worldStateRef]);

  // ---- "실행" 버튼: Phase 2 → Phase 3(실행) ----
  const handleAdvancePhase = useCallback(async () => {
    if (processingTurnRef.current) return;
    processingTurnRef.current = true;
    setIsLoading(true);

    try {
      if (meetingPhase === 2) {
        await handleExecuteTurn();
      }
    } finally {
      setIsLoading(false);
      processingTurnRef.current = false;
    }
  }, [meetingPhase]);

  // ---- 침공 대응 Promise 헬퍼 ----
  const waitForInvasionResponse = useCallback((invasion: PendingInvasion): Promise<InvasionResponseType> => {
    return new Promise<InvasionResponseType>((resolve) => {
      setPendingInvasion(invasion);
      invasionResolveRef.current = resolve;
    });
  }, []);

  const waitForBattleReportClose = useCallback((): Promise<void> => {
    return new Promise<void>((resolve) => {
      battleResolveRef.current = resolve;
    });
  }, []);

  // ---- 플레이어 공격 개시 ----
  const handlePlayerAttack = useCallback(async (targetCastleName: string, attackTroops: number) => {
    if (processingTurnRef.current) return;
    setShowAttackModal(false);
    setIsLoading(true);
    processingTurnRef.current = true;

    try {
      const world = worldStateRef.current;
      const player = world.factions.find(f => f.isPlayer);
      const targetCastle = world.castles.find(c => c.name === targetCastleName);
      if (!player || !targetCastle) return;
      const defenderFaction = world.factions.find(f => f.id === targetCastle.owner);
      if (!defenderFaction) return;

      const defTroops = Math.min(defenderFaction.points.mp_troops, targetCastle.garrison);
      const result = resolveBattle(player, defenderFaction, "공성", targetCastle, attackTroops, defTroops);
      result.narrative = generateBattleNarrative(result, player.rulerName, defenderFaction.rulerName, player.id);

      // 공격측(플레이어) 손실 적용
      applyPlayerChanges({
        point_deltas: { mp_troops_delta: -result.attackerLosses },
      }, addMsgToCouncil);
      if (result.attackerWounded > 0) {
        const pFac = worldStateRef.current.factions.find(f => f.isPlayer)!;
        pFac.woundedPool = [...pFac.woundedPool, createWoundedPool(result.attackerWounded)];
      }

      // 수비측(NPC) 손실 적용
      applyNPCChanges(defenderFaction.id, {
        point_deltas: { mp_troops_delta: -result.defenderLosses },
        castle_updates: [{ castle: targetCastleName, garrison_delta: -result.defenderLosses }],
      });
      if (result.defenderWounded > 0) {
        const dFac = worldStateRef.current.factions.find(f => f.id === defenderFaction.id)!;
        dFac.woundedPool = [...dFac.woundedPool, createWoundedPool(result.defenderWounded)];
      }

      // 시설 피해 적용 (수비측)
      if (result.facilityDamage) {
        const dmg: { type: "farm" | "market"; levels: number }[] = [];
        if (result.facilityDamage.farm_damage > 0) dmg.push({ type: "farm", levels: -result.facilityDamage.farm_damage });
        if (result.facilityDamage.market_damage > 0) dmg.push({ type: "market", levels: -result.facilityDamage.market_damage });
        if (dmg.length > 0) applyNPCChanges(defenderFaction.id, { facility_upgrades: dmg });
      }

      // 성채 점령 처리
      if (result.castleConquered) {
        playerConqueredThisTurnRef.current = true;
        applyPlayerChanges({
          conquered_castles: [result.castleConquered],
          castle_updates: [{ castle: result.castleConquered, garrison_delta: -targetCastle.garrison }],
          xp_gain: XP_PER_CASTLE_GAINED,
        }, addMsgToCouncil);

        // 수비측 도주
        const updatedWorld = worldStateRef.current;
        const loser = updatedWorld.factions.find(f => f.id === defenderFaction.id);
        if (loser) {
          const retreat = resolveRetreat(loser, result.castleConquered, updatedWorld.castles);
          if (retreat) {
            result.retreatInfo = retreat;
            applyNPCChanges(defenderFaction.id, { point_deltas: { mp_troops_delta: -retreat.troopsLost, mp_morale_delta: retreat.moralePenalty } });
          }
        }
      }

      // 전투 승리 XP
      if (result.winner === "liu_bei") {
        applyPlayerChanges({ xp_gain: XP_PER_BATTLE_WIN }, addMsgToCouncil);
      }

      addSystemCouncilMsg(result.narrative);
      setBattleReport(result);
      await waitForBattleReportClose();

      if (doCheckGameEnd()) return;
    } finally {
      setIsLoading(false);
      processingTurnRef.current = false;
    }
  }, [worldStateRef, applyPlayerChanges, applyNPCChanges, addMsgToCouncil, addSystemCouncilMsg, doCheckGameEnd, waitForBattleReportClose]);

  const handleInvasionSelect = useCallback((type: InvasionResponseType) => {
    setPendingInvasion(null);
    invasionResolveRef.current?.(type);
    invasionResolveRef.current = null;
  }, []);

  const handleBattleReportClose = useCallback(() => {
    setBattleReport(null);
    if (battleResolveRef.current) {
      battleResolveRef.current();
      battleResolveRef.current = null;
    }
  }, []);

  // ---- Phase 3: 턴 실행 ----
  const handleExecuteTurn = useCallback(async () => {
    setMeetingPhase(3);
    setIsLoading(true);
    pendingInvasionsRef.current = [];

    // turnCtx 추적 변수
    let turnBattleOccurred = false;
    let turnPlayerWon = false;
    let turnPlayerLost = false;
    let turnHadInvasion = false;
    let turnCastlesLost = false;
    let turnCastlesGained = false;
    let playerDefendedThisTurn = false; // 수성 내정 억제용
    const lostCastleNames: string[] = [];
    const gainedCastleNames: string[] = [];

    // 레벨업/스킬 해금 감지용: 턴 시작 기준값 기록
    const playerAtTurnStart = worldStateRef.current.factions.find(f => f.isPlayer);
    const levelAtTurnStart = playerAtTurnStart?.rulerLevel.level ?? 1;
    const skillsAtTurnStart = playerAtTurnStart?.skills.length ?? 0;
    playerConqueredThisTurnRef.current = false; // Phase 4 공격 성채 획득 플래그 초기화

    try {
      pendingCasePlanReportsRef.current = [];

      // ① NPC 턴 (플레이어 공격은 pendingInvasions로 수집)
      await processNPCTurns();

      // ② 침공 순차 해결
      const invasions = [...pendingInvasionsRef.current];
      pendingInvasionsRef.current = [];
      if (invasions.length > 0) turnHadInvasion = true;

      for (const invasion of invasions) {
        const world = worldStateRef.current;
        const attackerFaction = world.factions.find(f => f.id === invasion.attackerFactionId);
        if (!attackerFaction) continue;

        // 플레이어 선택 대기
        const responseType = await waitForInvasionResponse(invasion);

        const player = world.factions.find(f => f.isPlayer)!;
        const targetCastle = world.castles.find(c => c.name === invasion.targetCastle)!;

        if (responseType === "전투") {
          // 수성전 직접 진행
          const defTroops = Math.min(player.points.mp_troops, targetCastle.garrison);
          const result = resolveBattle(attackerFaction, player, "수성", targetCastle, invasion.attackerTroops, defTroops);
          result.narrative = generateBattleNarrative(result, attackerFaction.rulerName, player.rulerName, invasion.attackerFactionId);
          turnBattleOccurred = true;
          playerDefendedThisTurn = true;
          if (result.winner === "liu_bei") turnPlayerWon = true;
          else turnPlayerLost = true;

          // 손실 적용
          applyNPCChanges(invasion.attackerFactionId, { point_deltas: { mp_troops_delta: -result.attackerLosses } });
          if (result.attackerWounded > 0) {
            const atkFac = worldStateRef.current.factions.find(f => f.id === invasion.attackerFactionId)!;
            atkFac.woundedPool = [...atkFac.woundedPool, createWoundedPool(result.attackerWounded)];
          }
          applyPlayerChanges({
            point_deltas: { mp_troops_delta: -result.defenderLosses },
            castle_updates: [{ castle: targetCastle.name, garrison_delta: -result.defenderLosses }],
          }, addMsgToCouncil);
          if (result.defenderWounded > 0) {
            const pFac = worldStateRef.current.factions.find(f => f.isPlayer)!;
            pFac.woundedPool = [...pFac.woundedPool, createWoundedPool(result.defenderWounded)];
          }

          // 시설 피해
          if (result.facilityDamage) {
            const dmgUpgrades: { type: "farm" | "market"; levels: number }[] = [];
            if (result.facilityDamage.farm_damage > 0) dmgUpgrades.push({ type: "farm", levels: -result.facilityDamage.farm_damage });
            if (result.facilityDamage.market_damage > 0) dmgUpgrades.push({ type: "market", levels: -result.facilityDamage.market_damage });
            if (dmgUpgrades.length > 0) applyPlayerChanges({ facility_upgrades: dmgUpgrades }, addMsgToCouncil);
          }

          // 성채 함락 시 소유권 이전 + garrison 초기화 + 도주
          if (result.castleConquered) {
            turnCastlesLost = true;
            lostCastleNames.push(result.castleConquered);
            applyNPCChanges(invasion.attackerFactionId, {
              conquered_castles: [result.castleConquered],
              castle_updates: [{ castle: result.castleConquered, garrison_delta: -targetCastle.garrison }],
            });
            const updatedWorld = worldStateRef.current;
            const loser = updatedWorld.factions.find(f => f.isPlayer);
            if (loser) {
              const retreat = resolveRetreat(loser, result.castleConquered, updatedWorld.castles);
              if (retreat) {
                result.retreatInfo = retreat;
                applyPlayerChanges({ point_deltas: { mp_troops_delta: -retreat.troopsLost, mp_morale_delta: retreat.moralePenalty } }, addMsgToCouncil);
              }
            }
          }

          // 전투 승리 시 XP 획득
          if (result.winner === "liu_bei") {
            applyPlayerChanges({ xp_gain: XP_PER_BATTLE_WIN }, addMsgToCouncil);
          }

          addSystemCouncilMsg(result.narrative);
          setBattleReport(result);
          await waitForBattleReportClose();
        } else {
          // 비전투 대응
          const invResult = executeInvasionResponse(responseType, worldStateRef.current, invasion);

          // 비용 차감
          if (responseType === "특수_전략") {
            applyPlayerChanges({ point_deltas: { sp_delta: -5 } }, addMsgToCouncil);
            // 특수 전략 성공률 감소
            const prevRate = worldStateRef.current.specialStrategyRate ?? SPECIAL_STRATEGY_INITIAL_RATE;
            const nextRate = Math.max(SPECIAL_STRATEGY_MIN_RATE, prevRate - SPECIAL_STRATEGY_USE_PENALTY);
            setWorldState(prev => ({ ...prev, specialStrategyRate: nextRate, specialStrategyLastChangedTurn: prev.currentTurn }));
          } else if (responseType === "지원_요청") {
            applyPlayerChanges({ point_deltas: { dp_delta: -3 } }, addMsgToCouncil);
          } else if (responseType === "조공") {
            const tributeCost = Math.max(20, Math.floor(invasion.attackerTroops * 0.0005));
            applyPlayerChanges({ point_deltas: { ip_delta: -tributeCost } }, addMsgToCouncil);
          }

          addSystemCouncilMsg(`📢 ${invResult.message}`);

          // 실패 시 자동 전투
          if (!invResult.success) {
            await delay(500);
            const freshWorld = worldStateRef.current;
            const freshPlayer = freshWorld.factions.find(f => f.isPlayer)!;
            const freshCastle = freshWorld.castles.find(c => c.name === invasion.targetCastle)!;
            const freshAttacker = freshWorld.factions.find(f => f.id === invasion.attackerFactionId)!;
            const defTroops = Math.min(freshPlayer.points.mp_troops, freshCastle.garrison);

            const result = resolveBattle(freshAttacker, freshPlayer, "수성", freshCastle, invasion.attackerTroops, defTroops);
            result.narrative = generateBattleNarrative(result, freshAttacker.rulerName, freshPlayer.rulerName, invasion.attackerFactionId);
            playerDefendedThisTurn = true;

            applyNPCChanges(invasion.attackerFactionId, { point_deltas: { mp_troops_delta: -result.attackerLosses } });
            if (result.attackerWounded > 0) {
              const atkFac = worldStateRef.current.factions.find(f => f.id === invasion.attackerFactionId)!;
              atkFac.woundedPool = [...atkFac.woundedPool, createWoundedPool(result.attackerWounded)];
            }
            applyPlayerChanges({
              point_deltas: { mp_troops_delta: -result.defenderLosses },
              castle_updates: [{ castle: invasion.targetCastle, garrison_delta: -result.defenderLosses }],
            }, addMsgToCouncil);
            if (result.defenderWounded > 0) {
              const pFac = worldStateRef.current.factions.find(f => f.isPlayer)!;
              pFac.woundedPool = [...pFac.woundedPool, createWoundedPool(result.defenderWounded)];
            }

            if (result.facilityDamage) {
              const dmgUpgrades: { type: "farm" | "market"; levels: number }[] = [];
              if (result.facilityDamage.farm_damage > 0) dmgUpgrades.push({ type: "farm", levels: -result.facilityDamage.farm_damage });
              if (result.facilityDamage.market_damage > 0) dmgUpgrades.push({ type: "market", levels: -result.facilityDamage.market_damage });
              if (dmgUpgrades.length > 0) applyPlayerChanges({ facility_upgrades: dmgUpgrades }, addMsgToCouncil);
            }

            if (result.castleConquered) {
              applyNPCChanges(invasion.attackerFactionId, {
                conquered_castles: [result.castleConquered],
                castle_updates: [{ castle: result.castleConquered, garrison_delta: -freshCastle.garrison }],
              });
              const updatedWorld = worldStateRef.current;
              const loser = updatedWorld.factions.find(f => f.isPlayer);
              if (loser) {
                const retreat = resolveRetreat(loser, result.castleConquered, updatedWorld.castles);
                if (retreat) {
                  result.retreatInfo = retreat;
                  applyPlayerChanges({ point_deltas: { mp_troops_delta: -retreat.troopsLost, mp_morale_delta: retreat.moralePenalty } }, addMsgToCouncil);
                }
              }
            }

            addSystemCouncilMsg(result.narrative);
            setBattleReport(result);
            await waitForBattleReportClose();
          }
        }

        if (doCheckGameEnd()) return;
      }

      // ③ 이벤트 발생
      const events = rollTurnEvents(worldStateRef.current);
      if (events.length > 0) {
        const eventLines: string[] = [];
        for (const event of events) {
          if (event.targetFaction === "liu_bei") {
            applyPlayerChanges({ point_deltas: event.effects }, addMsgToCouncil);
          } else {
            applyNPCChanges(event.targetFaction, { point_deltas: event.effects });
          }
          const factionName = FACTION_NAMES[event.targetFaction] || event.targetFaction;
          eventLines.push(`${event.emoji} [${factionName}] ${event.description}`);
        }
        addSystemCouncilMsg(`🎲 턴 이벤트\n${eventLines.join("\n")}`);
      }

      // ④ 턴 전진 (포인트 충전, 부상 회복)
      advanceWorldTurn();

      // 특수 전략 성공률 쿨타임 회복
      {
        const ws = worldStateRef.current;
        const rate = ws.specialStrategyRate ?? SPECIAL_STRATEGY_INITIAL_RATE;
        const lastChanged = ws.specialStrategyLastChangedTurn ?? 0;
        if (rate < SPECIAL_STRATEGY_MAX_RATE && ws.currentTurn - lastChanged >= SPECIAL_STRATEGY_COOLDOWN_TURNS) {
          const recovered = Math.min(SPECIAL_STRATEGY_MAX_RATE, rate + SPECIAL_STRATEGY_RECOVERY);
          setWorldState(prev => ({ ...prev, specialStrategyRate: recovered, specialStrategyLastChangedTurn: prev.currentTurn }));
        }
      }

      // 수성 내정 억제: 수성 방어 시 해당 턴 IP 충전량의 50% 감산
      if (playerDefendedThisTurn) {
        const playerAfterTurn = worldStateRef.current.factions.find(f => f.isPlayer);
        if (playerAfterTurn && playerAfterTurn.points.ip_regen > 0) {
          const ipPenalty = Math.floor(playerAfterTurn.points.ip_regen * 0.5);
          if (ipPenalty > 0) {
            applyPlayerChanges({ point_deltas: { ip_delta: -ipPenalty } }, addMsgToCouncil);
            addSystemCouncilMsg(`⚔️ 수성 전란으로 내정이 위축되었습니다. (내정력 -${ipPenalty})`);
          }
        }
      }

      if (doCheckGameEnd()) return;

      const analyticsInst = getFirebaseAnalytics();
      if (analyticsInst) logEvent(analyticsInst, "turn_complete", { turn: worldStateRef.current.currentTurn });

      await delay(800);
      doAutoSave();

      // turnCtxRef 업데이트 (다음 턴 케이스 엔진용)
      const prevCtx = turnCtxRef.current;
      turnCtxRef.current = {
        ...prevCtx,
        lastTurnBattle: turnBattleOccurred,
        lastTurnBattleWon: turnPlayerWon,
        lastTurnBattleLost: turnPlayerLost,
        lastTurnInvasion: turnHadInvasion,
        lastTurnCastleGained: turnCastlesGained || playerConqueredThisTurnRef.current,
        lastTurnCastleLost: turnCastlesLost,
        lastTurnEvents: events.map(e => e.type),
        consecutiveWins: turnPlayerWon ? prevCtx.consecutiveWins + 1 : (turnBattleOccurred ? 0 : prevCtx.consecutiveWins),
        consecutiveLosses: turnPlayerLost ? prevCtx.consecutiveLosses + 1 : (turnBattleOccurred ? 0 : prevCtx.consecutiveLosses),
        phase2Messages: [],
        lastLevelUp: (worldStateRef.current.factions.find(f => f.isPlayer)?.rulerLevel.level ?? 1) > levelAtTurnStart,
        lastSkillUnlock: (worldStateRef.current.factions.find(f => f.isPlayer)?.skills.length ?? 0) > skillsAtTurnStart,
      };

      // ⑤ Phase 1 복귀: 다음 턴 참모 회의 (전투 결과 반영 context)
      {
        const player = worldStateRef.current.factions.find(f => f.isPlayer)!;
        let councilContext: string;

        if (turnCastlesLost) {
          const lostList = lostCastleNames.join(", ");
          councilContext = `⚠️ 긴급 상황: ${lostList} 함락으로 영토가 축소되었다. 사기 저하와 병력 손실이 심각하다. 이번 회의의 최우선 의제는 (1) 피해 현황 파악, (2) 방어선 재구축 계획, (3) 병력·사기 회복 방안이다. 각 참모는 평상시 보고 대신 위기 대응을 중심으로 발언하라.`;
        } else if (turnPlayerLost && turnHadInvasion) {
          councilContext = `전투에서 패배했으나 성채는 지켰다. 병력 손실(현재 군사력: ${player.points.mp.toLocaleString()})과 사기 하락을 회복해야 한다. 이번 회의의 핵심은 (1) 피해 복구 계획, (2) 방어 강화 방안 논의다.`;
        } else if (playerDefendedThisTurn && !turnPlayerLost) {
          councilContext = `적의 침공을 막아냈다. 수성 전란으로 내정이 위축되었으니 빠른 복구가 필요하다. 각 참모가 수성 현황을 보고하고, 방어력 강화 및 내정 회복 계획을 제안하라.`;
        } else if (turnCastlesGained || playerConqueredThisTurnRef.current) {
          const gainedList = gainedCastleNames.join(", ");
          councilContext = `${gainedList ? gainedList + " 점령 성공!" : "성채 점령 성공!"} 전선이 확장되었다. 점령지 방어 배치와 후속 전략을 논의하라. 각 참모가 현황을 보고하고 다음 턴 계획을 제안하라.`;
        } else if (turnPlayerWon) {
          councilContext = `전투에서 승리했다. 전력을 유지하며 다음 전략을 논의하라. 각 참모가 현황을 보고하고 다음 턴 계획을 제안하라.`;
        } else {
          councilContext = "현재 정세를 분석하고 참모 회의를 진행하라. 각 참모가 담당 업무 현황을 보고하고, 다음 턴 계획을 제안하라.";
        }

        await runMeetingPhase1And3(councilContext);
      }
    } finally {
      setIsLoading(false);
    }
  }, [processNPCTurns, advanceWorldTurn, doCheckGameEnd, doAutoSave, runMeetingPhase1And3, waitForInvasionResponse, waitForBattleReportClose, applyPlayerChanges, applyNPCChanges, addMsgToCouncil, addSystemCouncilMsg, worldStateRef]);

  // ---- 도입 서사 ----
  const buildIntroMessages = useCallback((): CouncilMessage[] => {
    const ws = worldStateRef.current;
    const player = ws.factions.find(f => f.isPlayer)!;
    const npcs = [...ws.factions.filter(f => !f.isPlayer)].sort((a, b) => b.points.mp - a.points.mp);

    const npcLines = npcs.map(f => {
      const troops = Math.round(f.points.mp_troops / 10000);
      return `${f.rulerName}이 ${f.castles.length}성에 ${troops}만 대군`;
    }).join(", ");

    const playerTroops = Math.round(player.points.mp_troops / 10000);
    const playerCastles = player.castles.join("·");

    return [
      {
        speaker: "제갈량",
        dialogue: `주공, 건안 13년이옵니다. 이 제갈량, 삼고초려의 은혜에 보답하고자 오늘부터 주공의 곁에서 천하대계를 도모하겠사옵니다.`,
        emotion: "calm" as const,
      },
      {
        speaker: "제갈량",
        dialogue: `현재 천하의 정세를 아뢰겠습니다. ${npcLines}을 거느리고 있사옵니다. 이 틈을 놓쳐서는 아니 되옵니다.`,
        emotion: "thoughtful" as const,
      },
      {
        speaker: "제갈량",
        dialogue: `우리 유비군은 ${playerCastles} 두 성에 병력 ${playerTroops}만... 비록 약소하나, 관우·방통·미축 — 주공 곁에 이만한 인재가 있으니 결코 뜻을 펼치지 못할 바가 아니옵니다.`,
        emotion: "calm" as const,
      },
      {
        speaker: "제갈량",
        dialogue: "그러면 첫 참모 회의를 열겠사옵니다. 각 참모의 업무 보고를 들으시고, 필요한 지시가 있으시면 말씀해 주시옵소서.",
        emotion: "excited" as const,
      },
    ];
  }, [worldStateRef]);

  // ---- 게임 시작 ----
  const startGame = useCallback(async () => {
    if (processingTurnRef.current) return;
    processingTurnRef.current = true;
    setTokenUsage({ input: 0, output: 0 });
    setStarted(true);
    sessionStorage.setItem("gameActive", "true");
    const analytics = getFirebaseAnalytics();
    if (analytics) logEvent(analytics, "game_start");

    try {
      // 도입 서사
      const introMessages = buildIntroMessages();
      setCouncilNumber(0);
      await animateCouncilMessages(introMessages, true, { firstImmediate: true, speedDecay: 0.8, speedMultiplier: 0.7 });

      await delay(1000);

      // 첫 참모 회의 (councilNumber 증가는 runMeetingPhase1And3 내부에서 처리)
      await delay(600);

      const context = "게임이 시작되었다. 첫 번째 참모 회의다. 각 참모가 자율 업무를 수행한 결과를 보고하고, 다음 턴 계획을 제안하라. (도입 서사는 이미 완료됨 — 천하 정세 반복하지 말 것)";
      await runMeetingPhase1And3(context);
    } finally {
      setIsLoading(false);
      processingTurnRef.current = false;
    }
  }, [buildIntroMessages, animateCouncilMessages, scrollToBottom, setTokenUsage, runMeetingPhase1And3]);

  // ---- 저장 불러오기 ----
  const startFromAutoSave = useCallback(async () => {
    if (!uid) return;
    if (processingTurnRef.current) return;
    processingTurnRef.current = true;

    const save = await loadAutoSave(uid);
    if (!save) { processingTurnRef.current = false; return; }

    setTokenUsage({ input: 0, output: 0 });
    loadWorldState(save.worldState);
    setMessages(save.chatMessages as ChatMessage[]);
    setConvHistory(save.convHistory as ConversationMessage[]);

    if (Array.isArray(save.advisors) && save.advisors.length > 0) {
      setAdvisors(save.advisors);
    }

    // 채팅 로그 복원: 이전 회의 기록을 councilMessages에 복원하면
    // runMeetingPhase1And3에서 prevCouncil로 이동하여 위로 스크롤 시 확인 가능
    const chatLog = loadChatLog("auto");
    if (chatLog.length > 0) setCouncilMessages(chatLog);

    // councilNumber 복원: runMeetingPhase1And3 내부에서 +1 되므로 턴-1로 설정
    setCouncilNumber(Math.max(0, save.worldState.currentTurn - 1));

    setStarted(true);
    sessionStorage.setItem("gameActive", "true");
    setIsLoading(true);

    try {
      await runMeetingPhase1And3("저장된 게임을 불러왔다. 현재 상황을 요약하고 참모 회의를 진행하라.");
    } finally {
      setIsLoading(false);
      processingTurnRef.current = false;
    }
  }, [loadWorldState, setMessages, setConvHistory, uid, setTokenUsage, runMeetingPhase1And3]);

  // ---- 쓰레드 헬퍼 ----
  const addThreadMessage = useCallback((msgIndex: number, threadMsg: ThreadMessage) => {
    setThreads(prev => ({
      ...prev,
      [msgIndex]: [...(prev[msgIndex] || []), threadMsg],
    }));
  }, []);

  const animateThreadMessages = useCallback(async (msgIndex: number, msgs: CouncilMessage[]) => {
    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i];
      setThreadTyping({ msgIndex, speaker: msg.speaker });
      scrollToBottom();
      await delay(Math.max(400, msg.dialogue.length * 30));
      setThreadTyping(null);
      addThreadMessage(msgIndex, { type: "advisor", speaker: msg.speaker, text: msg.dialogue, emotion: msg.emotion });
      scrollToBottom();
      if (i < msgs.length - 1) await delay(500 + Math.random() * 1500);
    }
  }, [addThreadMessage, scrollToBottom]);

  // ---- 안건 승인 ----
  const handleApprovePlan = useCallback((planIndex: number) => {
    const plan = planReports[planIndex];
    if (!plan || approvedPlans.has(planIndex)) return;

    setApprovedPlans(prev => new Set([...prev, planIndex]));

    // 포인트/시설 변동 적용
    const hasPoints = plan.expected_points && Object.values(plan.expected_points).some(v => v !== undefined && v !== 0);
    const hasFacilities = plan.facility_upgrades && plan.facility_upgrades.length > 0;
    if (hasPoints || hasFacilities) {
      applyPlayerChanges({
        ...(hasPoints ? { point_deltas: plan.expected_points } : {}),
        ...(hasFacilities ? { facility_upgrades: plan.facility_upgrades } : {}),
      }, addMsgToCouncil);
    }

    // 플레이어 발언 추가
    const playerMsgIdx = councilMsgsRef.current.length;
    setCouncilMessages(prev => [...prev, {
      speaker: "유비",
      dialogue: `${plan.speaker}의 안건이 좋아 보인다. 진행하라.`,
      emotion: "calm" as const,
      phase: 2,
    }]);
    scrollToBottom();

    // 참모 열정 +1 적용
    updateAdvisorStats([{ name: plan.speaker, enthusiasm_delta: 1 }]);

    // 참모 댓글 추가 (약간 딜레이)
    setTimeout(() => {
      addThreadMessage(playerMsgIdx, {
        type: "advisor",
        speaker: plan.speaker,
        text: "알겠사옵니다. 즉시 시행하겠습니다.",
        emotion: "excited" as const,
        stat_delta: { enthusiasm_delta: 1 },
      });
      scrollToBottom();
    }, 600);
  }, [planReports, approvedPlans, applyPlayerChanges, addMsgToCouncil, setCouncilMessages, councilMsgsRef, addThreadMessage, scrollToBottom]);

  // ---- 참모 발언 클릭 ----
  const handleMessageClick = useCallback((msg: CouncilMessage, index: number) => {
    if (isLoading) return;
    setReplyTarget(prev => prev && prev.index === index ? null : { msg, index });
  }, [isLoading]);

  // ---- 메시지 전송 (Phase 2 또는 Phase 4) ----
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || processingTurnRef.current) return;
    processingTurnRef.current = true;

    const player = worldStateRef.current.factions.find(f => f.isPlayer);
    if (!player || player.points.ap < 1) {
      addSystemCouncilMsg("⚠️ 행동력이 부족합니다. '다음' 버튼을 눌러 진행하세요.");
      processingTurnRef.current = false;
      return;
    }

    const text = input.trim();
    const reply = replyTarget;
    setInput("");
    setReplyTarget(null);
    setIsLoading(true);

    const ADVISOR_NAMES = ["관우", "미축", "방통", "제갈량"];
    const detectedAdvisor = !reply
      ? ADVISOR_NAMES.find(name => text.includes(name))
      : undefined;

    const llmMessage = reply
      ? `${reply.msg.speaker}의 "${reply.msg.dialogue}"에 대해 유비가 말합니다: "${text}"`
      : text;
    const effectiveReplyTo = reply ? reply.msg.speaker : detectedAdvisor;

    if (reply) {
      addThreadMessage(reply.index, { type: "user", speaker: "유비", text });
      scrollToBottom();
    } else {
      setCouncilMessages(prev => [...prev, { speaker: "유비", dialogue: text, emotion: "calm" as const }]);
      scrollToBottom();
    }

    try {
      // AP 소비 (API 호출 전에 차감, 실패 시 catch에서 복구)
      consumeAP(1);

      if (meetingPhase === 2) {
        const { reaction, advisorUpdates, elapsedMs } = await doPhase2Reply(llmMessage, effectiveReplyTo);
        if (reply) {
          const sorted = [...reaction.council_messages].sort((a, b) => {
            if (a.speaker === reply.msg.speaker) return -1;
            if (b.speaker === reply.msg.speaker) return 1;
            return 0;
          });
          await animateThreadMessages(reply.index, sorted);
        } else {
          await animateCouncilMessages(reaction.council_messages, false, { apiElapsedMs: elapsedMs });
        }
        if (reaction.state_changes) {
          applyPlayerChanges(reaction.state_changes, addMsgToCouncil);
        } else {
          // 참모가 질문만 하고 실제 행동 없으면 AP 환불 (예: "얼마나 모병할까요?")
          applyPlayerChanges({ point_deltas: { ap_delta: 1 } }, addMsgToCouncil);
          // 모병 수량 질문이면 팝업 오픈
          const isRecruitQuestion = reaction.council_messages.some(m =>
            (m.dialogue.includes("모병") || m.dialogue.includes("징병")) &&
            (m.dialogue.includes("얼마") || m.dialogue.includes("수량") || m.dialogue.includes("몇"))
          );
          if (isRecruitQuestion) {
            const ip = worldStateRef.current.factions.find(f => f.isPlayer)!.points.ip;
            setRecruitmentPopup({ maxIP: ip });
          }
        }
        updateAdvisorStats(advisorUpdates);
      }
      doAutoSave();
    } catch (err) {
      console.error("sendMessage error:", err);
      // API 실패 시 AP 복구
      applyPlayerChanges({ point_deltas: { ap_delta: 1 } }, addMsgToCouncil);
      addSystemCouncilMsg("⚠️ 요청 처리 중 오류가 발생했습니다. 행동력이 복구됩니다.");
    } finally {
      setIsLoading(false);
      processingTurnRef.current = false;
    }
  }, [input, isLoading, replyTarget, meetingPhase, worldStateRef, consumeAP, addMsgToCouncil, addSystemCouncilMsg, addThreadMessage, animateThreadMessages, doPhase2Reply, animateCouncilMessages, applyPlayerChanges, updateAdvisorStats, doAutoSave, scrollToBottom]);

  // ---- Restart / Mic ----
  const handleRestart = useCallback(() => {
    sessionStorage.removeItem("gameActive");
    window.location.reload();
  }, []);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening(text => setInput(text));
    }
  }, [isListening, stopListening, startListening]);

  const handleGoogleLogin = useCallback(async () => {
    await loginWithGoogle();
  }, [loginWithGoogle]);

  // ===================== RENDER =====================

  if (gameEndResult) {
    return <GameEndScreen result={gameEndResult} onRestart={handleRestart} />;
  }

  if (!started) {
    return (
      <TitleScreen
        onStart={startGame}
        onContinue={hasSave ? startFromAutoSave : undefined}
        user={user}
        uid={uid}
        authLoading={authLoading}
        onGoogleLogin={handleGoogleLogin}
        onLogout={logout}
      />
    );
  }

  const playerFaction = getPlayerFaction();
  const currentAP = playerFaction.points.ap;
  const phaseLabel = meetingPhase === 1 ? "보고" : meetingPhase === 2 ? "토론" : "실행";

  // 매턴 포인트 증가치 계산
  const apRegenTotal = playerFaction.points.ap_regen + playerFaction.skills.reduce((sum, sid) => {
    const def = SKILL_TREE.find(s => s.id === sid);
    return sum + (def?.effect.type === "ap_regen" ? def.effect.value : 0);
  }, 0);
  const ipRegen = playerFaction.points.ip_regen;
  const dpRegenTotal = DP_REGEN_PER_TURN * (1 + playerFaction.skills.reduce((sum, sid) => {
    const def = SKILL_TREE.find(s => s.id === sid);
    return sum + (def?.effect.type === "dp_bonus" ? def.effect.value : 0);
  }, 0));
  const canInput = meetingPhase === 2 && currentAP >= 1 && !isLoading;
  const showNextButton = meetingPhase === 2 && !isLoading && !processingTurnRef.current;

  return (
    <div style={{
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-primary)",
      overflow: "hidden",
    }}>
      {/* 턴 바 */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "6px 12px",
        background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)",
        fontSize: "11px", color: "var(--text-secondary)",
        flexWrap: "wrap",
      }}>
        <span style={{ color: "var(--gold)", fontWeight: 700 }}>
          第{worldState.currentTurn}턴
        </span>
        <span>Lv.{playerFaction.rulerLevel.level}</span>
        <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--text-dim)" }}>
          성채 {playerFaction.castles.length}
        </span>
        <UserBadge user={user} onLogin={() => { }} onLogout={logout} />
        <button onClick={() => setShowFactionMap(true)} style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "16px",
          padding: "3px 10px", color: "var(--text-secondary)", fontSize: "11px", cursor: "pointer",
        }}>
          🗺️
        </button>
        <button onClick={() => setShowWorldStatus(true)} style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "16px",
          padding: "3px 10px", color: "var(--text-secondary)", fontSize: "11px", cursor: "pointer",
        }}>
          🏯
        </button>
      </div>

      {/* Phase 표시 */}
      <div style={{
        display: "flex", alignItems: "center", gap: "4px",
        padding: "3px 12px",
        background: "rgba(201,168,76,0.05)", borderBottom: "1px solid var(--border)",
        fontSize: "10px",
      }}>
        {([1, 2, 3] as MeetingPhase[]).map(p => (
          <span key={p} style={{
            padding: "1px 8px", borderRadius: "8px",
            background: p === meetingPhase ? "rgba(201,168,76,0.2)" : "transparent",
            color: p === meetingPhase ? "var(--gold)" : "var(--text-dim)",
            fontWeight: p === meetingPhase ? 700 : 400,
          }}>
            {p === 1 ? "보고" : p === 2 ? "토론" : "실행"}
          </span>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setLlmProvider(llmProvider === "openai" ? "claude" : "openai")}
            disabled={isLoading || prefsLoading}
            style={{
              background: llmProvider === "claude" ? "rgba(204,120,50,0.15)" : "rgba(100,180,100,0.15)",
              border: `1px solid ${llmProvider === "claude" ? "rgba(204,120,50,0.4)" : "rgba(100,180,100,0.4)"}`,
              borderRadius: "10px", padding: "1px 8px", fontSize: "10px",
              color: llmProvider === "claude" ? "#cc7832" : "#64b464",
              cursor: isLoading || prefsLoading ? "not-allowed" : "pointer",
              opacity: isLoading || prefsLoading ? 0.5 : 1,
              fontWeight: 600,
            }}
          >
            {llmProvider === "claude" ? "Claude" : "GPT-4o"}
          </button>
        </div>
      </div>

      {/* NPC Processing */}
      {npcProcessing && (
        <div style={{
          padding: "6px 14px", background: "rgba(201,168,76,0.1)",
          borderBottom: "1px solid var(--border)", textAlign: "center",
          fontSize: "11px", color: "var(--gold)", animation: "pulse 1.5s infinite",
        }}>
          ⏳ 타국 군주들이 행동 중...
        </div>
      )}

      {/* 타국 동향 팝업 제거 (항상 숨김) */}

      {/* Chat Area (with point overlay) */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* 포인트 오버레이 */}
        <div style={{
          position: "absolute", top: "8px", right: "8px", zIndex: 10,
          background: "rgba(13,13,26,0.25)",
          borderRadius: "10px", padding: "8px 12px",
          border: "1px solid rgba(201,168,76,0.1)",
          fontSize: "12px", color: "var(--text-secondary)",
          display: "flex", flexDirection: "column", gap: "4px",
          pointerEvents: "auto",
        }}>
          <div style={{ color: currentAP >= 1 ? POINT_COLORS.AP.color : "var(--text-dim)" }}>
            행동력 {currentAP.toFixed(1)}/{playerFaction.points.ap_max} <span style={{ color: getDeltaColor(apRegenTotal), fontSize: "10px" }}>(+{apRegenTotal % 1 === 0 ? apRegenTotal : apRegenTotal.toFixed(1)})</span>
          </div>
          <div style={{ color: POINT_COLORS.SP.color }}>특수능력 {playerFaction.points.sp} <span style={{ color: getDeltaColor(1), fontSize: "10px" }}>(+1)</span></div>
          <div style={{ color: POINT_COLORS.MP.color }}>군사력 {playerFaction.points.mp.toLocaleString()}</div>
          <div style={{ color: POINT_COLORS.IP.color }}>내정력 {playerFaction.points.ip}/{playerFaction.points.ip_cap} <span style={{ color: getDeltaColor(ipRegen), fontSize: "10px" }}>(+{ipRegen})</span></div>
          <div style={{ color: POINT_COLORS.DP.color }}>외교력 {playerFaction.points.dp} <span style={{ color: getDeltaColor(dpRegenTotal), fontSize: "10px" }}>(+{dpRegenTotal % 1 === 0 ? dpRegenTotal : dpRegenTotal.toFixed(1)})</span></div>
        </div>

        <div ref={scrollRef} style={{ height: "100%", overflowY: "auto", paddingTop: "6px", paddingBottom: "6px" }}>
          {prevCouncil && (
            <div style={prevCouncil.number > 0 ? { opacity: 0.5 } : undefined}>
              <CouncilChat
                messages={prevCouncil.messages}
                advisors={advisors}
                councilNumber={prevCouncil.number}
              />
            </div>
          )}

          {(councilMessages.length > 0 || typingIndicator || (isLoading && councilNumber > 0 && !typingIndicator)) && (
            <CouncilChat
              messages={councilMessages}
              advisors={advisors}
              councilNumber={councilNumber}
              typingIndicator={typingIndicator}
              threads={threads}
              threadTyping={threadTyping}
              onMessageClick={handleMessageClick}
              replyTarget={replyTarget}
              disabled={isLoading}
              planReports={planReports}
              approvedPlans={approvedPlans}
              onApprovePlan={isLoading ? undefined : handleApprovePlan}
              meetingPhase={meetingPhase}
              onOpenMap={() => setShowFactionMap(true)}
            />
          )}

          {isLoading && !typingIndicator && !threadTyping && (
            <div style={{ padding: "8px 56px", fontSize: "12px", color: "var(--text-dim)", animation: "pulse 1.5s infinite" }}>
              🪶 참모들이 논의 중...
            </div>
          )}
        </div>
      </div>{/* /Chat Area wrapper */}

      {/* 답장 인디케이터 */}
      {replyTarget && (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "6px 14px", background: "rgba(201,168,76,0.08)",
          borderTop: "1px solid var(--border)", fontSize: "12px", color: "var(--text-secondary)",
        }}>
          <span style={{ color: "var(--gold)", fontWeight: 600 }}>💬 {replyTarget.msg.speaker}</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.7 }}>
            {replyTarget.msg.dialogue}
          </span>
          <button onClick={() => setReplyTarget(null)} style={{
            background: "none", border: "none", color: "var(--text-dim)",
            cursor: "pointer", fontSize: "14px", padding: "0 4px", flexShrink: 0,
          }}>✕</button>
        </div>
      )}

      {/* Input */}
      <div style={{
        display: "flex", gap: "8px", padding: "10px 14px",
        background: "var(--bg-secondary)", borderTop: replyTarget ? "none" : "1px solid var(--border)",
      }}>
        <button onClick={handleMicToggle} disabled={isLoading || !canInput} style={{
          background: isListening ? "rgba(212,68,62,0.2)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${isListening ? "var(--danger)" : "var(--border)"}`,
          borderRadius: "8px", padding: "10px 12px", fontSize: "14px",
          cursor: isLoading || !canInput ? "not-allowed" : "pointer",
          color: isListening ? "var(--danger)" : "var(--text-secondary)",
          flexShrink: 0,
        }}>🎤</button>
        <input
          value={isListening ? partialTranscript : input}
          onChange={(e) => { if (!isListening) setInput(e.target.value); }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={
            !canInput
              ? `${phaseLabel} 진행 중...`
              : `행동력 ${currentAP.toFixed(1)} — 참모에게 질문, 지시, 또는 계획 피드백 (1 소비)`
          }
          disabled={isLoading || !canInput}
          style={{
            flex: 1, background: "rgba(255,255,255,0.05)",
            border: `1px solid ${isListening ? "var(--danger)" : "var(--border)"}`,
            borderRadius: "8px", padding: "10px 14px", color: "var(--text-primary)", fontSize: "13.5px",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim() || !canInput}
          style={{
            background: isLoading || !input.trim() || !canInput ? "rgba(201,168,76,0.15)" : "var(--gold)",
            color: isLoading || !input.trim() || !canInput ? "var(--text-dim)" : "var(--bg-primary)",
            border: "none", borderRadius: "8px", padding: "10px 16px",
            fontSize: "13px", cursor: !canInput ? "not-allowed" : "pointer", fontWeight: 700,
          }}
        >전송</button>
        {showNextButton && meetingPhase === 2 && (
          <button onClick={() => setShowAttackModal(true)} style={{
            background: "rgba(196,68,68,0.15)", color: "#c44",
            border: "1px solid rgba(196,68,68,0.4)", borderRadius: "8px",
            padding: "10px 12px", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap", fontWeight: 600,
          }}>⚔️ 공격</button>
        )}
        {showNextButton && (
          <button onClick={handleAdvancePhase} style={{
            background: "rgba(255,255,255,0.05)", color: "var(--gold)",
            border: "1px solid var(--border)", borderRadius: "8px",
            padding: "10px 12px", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap", fontWeight: 600,
          }}>
            실행 ⚡
          </button>
        )}
      </div>

      {/* 모병 팝업 */}
      {recruitmentPopup && (
        <RecruitmentPopup
          maxIP={recruitmentPopup.maxIP}
          onConfirm={handleRecruitConfirm}
          onCancel={() => setRecruitmentPopup(null)}
        />
      )}

      {/* 공격 개시 모달 */}
      {showAttackModal && (
        <AttackModal
          worldState={worldState}
          playerFaction={playerFaction}
          onConfirm={handlePlayerAttack}
          onClose={() => setShowAttackModal(false)}
        />
      )}

      {/* Modals */}
      <WorldStatus worldState={worldState} show={showWorldStatus} onClose={() => setShowWorldStatus(false)} />
      <FactionMap worldState={worldState} show={showFactionMap} onClose={() => setShowFactionMap(false)} />
      {battleReport && (
        <BattleReport result={battleReport} onClose={handleBattleReportClose} />
      )}
      {pendingInvasion && (() => {
        const world = worldStateRef.current;
        const castle = world.castles.find(c => c.name === pendingInvasion.targetCastle);
        const options = getResponseOptions(world, pendingInvasion);
        return (
          <InvasionModal
            invasion={pendingInvasion}
            castleGrade={castle?.grade || "일반"}
            castleGarrison={castle?.garrison || 0}
            options={options}
            onSelect={handleInvasionSelect}
          />
        );
      })()}
    </div>
  );
}
