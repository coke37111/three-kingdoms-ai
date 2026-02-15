"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { GameTask, FactionId, BattleResult, GameEndResult } from "@/types/game";
import type { ChatMessage, ConversationMessage, LLMProvider } from "@/types/chat";
import type { AdvisorState, CouncilMessage, AdvisorAction, ApprovalRequest, AdvisorStatsDelta, EmotionalDirective, SituationBriefing, ThreadMessage } from "@/types/council";
import { useWorldState } from "@/hooks/useWorldState";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useWorldTurn } from "@/hooks/useWorldTurn";
import { useTypewriter } from "@/hooks/useTypewriter";
import { callCouncilLLM, type CallLLMOptions, type CouncilLLMOptions } from "@/lib/api/llmClient";
import { buildCouncilPrompt, buildCouncilResultPrompt } from "@/lib/prompts/councilPrompt";
import { buildFactionAIPrompt, parseNPCResponse, type NPCActionType } from "@/lib/prompts/factionAIPrompt";
import { executeDiplomaticAction, updateRelation, getRelationBetween } from "@/lib/game/diplomacySystem";
import type { DiplomaticAction } from "@/lib/game/diplomacySystem";
import { autoSave, loadAutoSave, hasAutoSave } from "@/lib/game/saveSystem";
import { checkGameEnd } from "@/lib/game/victorySystem";
import { detectSituation } from "@/lib/game/situationDetector";
import { FACTION_NAMES } from "@/constants/factions";
import { INITIAL_ADVISORS } from "@/constants/advisors";
import { useAuth } from "@/hooks/useAuth";
import StatusBar from "./StatusBar";
import ChatBubble from "./ChatBubble";
import TaskPanel from "./TaskPanel";
import TitleScreen from "./TitleScreen";
import WorldStatus from "./WorldStatus";
import { type TurnNotificationItem } from "./TurnNotification";
import BattleReport from "./BattleReport";
import DiplomacyPanel from "./DiplomacyPanel";
import GameEndScreen from "./GameEndScreen";
import UserBadge from "./UserBadge";
import CouncilChat from "./CouncilChat";
import BriefingPanel from "./BriefingPanel";
import { useVoice } from "@/hooks/useVoice";
import { usePreferences } from "@/hooks/usePreferences";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function GameContainer() {
  const {
    worldState, setWorldState, worldStateRef,
    deltas, setDeltas,
    getPlayerFaction, getNPCFactions, updateFaction,
    applyPlayerChanges, loadWorldState,
  } = useWorldState();

  const {
    messages, setMessages, addMessage,
    convHistory, setConvHistory, addToConvHistory,
    convHistoryRef, messagesRef,
    streamingText, setStreamingText,
    scrollRef, scrollToBottom,
  } = useChatHistory();

  const { user, uid, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const { llmProvider, setLlmProvider, prefsLoading } = usePreferences(uid);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<GameTask[]>([]);
  const [showTasks, setShowTasks] = useState(false);
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
      try { localStorage.setItem("tk_usage", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // 참모 상태 — functional updater로 ref 즉시 동기화
  const [advisors, setAdvisorsRaw] = useState<AdvisorState[]>(INITIAL_ADVISORS);
  const advisorsRef = useRef<AdvisorState[]>(INITIAL_ADVISORS);
  const setAdvisors = useCallback((u: AdvisorState[] | ((p: AdvisorState[]) => AdvisorState[])) => {
    setAdvisorsRaw((prev) => {
      const next = typeof u === "function" ? u(prev) : u;
      advisorsRef.current = next;
      return next;
    });
  }, []);

  // 참모 회의 메시지 — functional updater로 ref 즉시 동기화
  const [councilMessages, setCouncilMessagesRaw] = useState<CouncilMessage[]>([]);
  const councilMsgsRef = useRef<CouncilMessage[]>([]);
  const setCouncilMessages = useCallback((u: CouncilMessage[] | ((p: CouncilMessage[]) => CouncilMessage[])) => {
    setCouncilMessagesRaw((prev) => {
      const next = typeof u === "function" ? u(prev) : u;
      councilMsgsRef.current = next;
      return next;
    });
  }, []);

  const [councilNumber, setCouncilNumberRaw] = useState(0);
  const councilNumberRef = useRef(0);
  const setCouncilNumber = useCallback((u: number | ((p: number) => number)) => {
    setCouncilNumberRaw((prev) => {
      const next = typeof u === "function" ? u(prev) : u;
      councilNumberRef.current = next;
      return next;
    });
  }, []);

  const [councilStreamMsg, setCouncilStreamMsg] = useState<{ speaker: string; text: string } | null>(null);

  // 타이핑 인디케이터 (입력 중... 표시)
  const [typingIndicator, setTypingIndicator] = useState<{ speaker: string } | null>(null);

  // 이전 회의 기록 보존 (최근 1세션)
  const [prevCouncil, setPrevCouncil] = useState<{ number: number; messages: CouncilMessage[] } | null>(null);

  // 자율 행동 + 결재 요청 상태
  const [autoActions, setAutoActions] = useState<AdvisorAction[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);

  // Phase 0: 정세 브리핑 상태
  const [briefing, setBriefing] = useState<SituationBriefing | null>(null);

  // 참모 발언 클릭 → 답장 컨텍스트 (인덱스 포함)
  const [replyTarget, setReplyTarget] = useState<{ msg: CouncilMessage; index: number } | null>(null);

  // 쓰레드: 메시지 인덱스 → 쓰레드 메시지 배열
  const [threads, setThreads] = useState<Record<number, ThreadMessage[]>>({});
  const [threadTyping, setThreadTyping] = useState<{ msgIndex: number; speaker: string } | null>(null);

  const processingTurnRef = useRef(false);

  useEffect(() => {
    if (uid) {
      hasAutoSave(uid).then(setHasSave);
    } else {
      setHasSave(false);
    }
  }, [uid]);

  // Phase C states
  const [showWorldStatus, setShowWorldStatus] = useState(false);
  const [showDiplomacy, setShowDiplomacy] = useState(false);
  const [battleReport, setBattleReport] = useState<BattleResult | null>(null);
  const [gameEndResult, setGameEndResult] = useState<GameEndResult | null>(null);
  const [npcProcessing, setNpcProcessing] = useState(false);

  const { advanceWorldTurn, checkAndTriggerEvents } = useWorldTurn({
    worldStateRef,
    setWorldState,
    setDeltas,
    setTasks,
    addMessage,
  });

  const { typeText, cancelTypewriter } = useTypewriter();

  const {
    startListening, stopListening, isListening, partialTranscript,
  } = useVoice();

  useEffect(() => {
    return () => { cancelTypewriter(); };
  }, [cancelTypewriter]);

  // ---- 참모 열정/충성도 업데이트 ----
  const updateAdvisorStats = useCallback((updates: AdvisorStatsDelta[]) => {
    if (updates.length === 0) return;
    setAdvisors((prev) => {
      const next = prev.map((a) => {
        const upd = updates.find((u) => u.name === a.name);
        if (!upd) return a;
        return {
          ...a,
          enthusiasm: Math.max(0, Math.min(100, a.enthusiasm + (upd.enthusiasm_delta ?? 0))),
          loyalty: Math.max(0, Math.min(100, a.loyalty + (upd.loyalty_delta ?? 0))),
        };
      });
      advisorsRef.current = next;
      return next;
    });
  }, []);

  // ---- Phase 1: 참모 회의 실행 (API 1회) ----
  const doCouncilMeeting = useCallback(async (
    context: string,
    options?: CallLLMOptions,
  ) => {
    const systemPrompt = buildCouncilPrompt(
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
      options,
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

  // ---- Phase 2: 결재/자유입력 처리 (API 1회) ----
  const doCouncilResult = useCallback(async (
    action: { type: "approval"; id: string; decision: "승인" | "거부"; subject: string; advisor: string }
         | { type: "freetext"; message: string; replyTo?: string },
  ) => {
    const systemPrompt = buildCouncilResultPrompt(
      worldStateRef.current,
      advisorsRef.current,
      action,
    );

    const content = action.type === "approval"
      ? `결재 ${action.decision}: "${action.subject}" (${action.advisor})`
      : `자유지시: "${action.message}"`;
    addToConvHistory("user", content);
    const trimmedHistory = convHistoryRef.current.slice(-20);

    const replyTo = action.type === "freetext" ? action.replyTo : undefined;
    const t0 = Date.now();
    const { council, advisorUpdates, usage } = await callCouncilLLM(
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

    addToConvHistory("assistant", JSON.stringify(council));
    return { council, advisorUpdates, elapsedMs };
  }, [worldStateRef, addToConvHistory, convHistoryRef, llmProvider, setTokenUsage]);

  // ---- 참모 회의 메시지 애니메이션 ----
  // options.firstImmediate: 첫 메시지 즉시 표시
  // options.speedDecay: 메시지마다 속도 배율 (0.8 = 매번 20% 빠르게)
  // options.apiElapsedMs: AI 응답 대기 시간 — 애니메이션 딜레이에서 차감
  const animateCouncilMessages = useCallback(async (
    msgs: CouncilMessage[],
    clearFirst = true,
    options?: { firstImmediate?: boolean; speedDecay?: number; speedMultiplier?: number; apiElapsedMs?: number },
  ) => {
    if (clearFirst) {
      setCouncilMessages([]);
    }

    // AI 응답 대기 시간을 크레딧으로 사용 — 딜레이에서 차감
    let credit = options?.apiElapsedMs ?? 0;

    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i];
      // speedDecay 적용: 첫 즉시 표시 시 i-1부터 카운트
      const decayIndex = options?.firstImmediate ? Math.max(0, i - 1) : i;
      const baseMultiplier = options?.speedMultiplier ?? 1;
      const speed = (options?.speedDecay ? Math.pow(options.speedDecay, decayIndex) : 1) * baseMultiplier;

      if (i === 0 && options?.firstImmediate) {
        // 첫 메시지 즉시 표시 (타이핑 인디케이터 없이)
        setCouncilMessages((prev) => [...prev, msg]);
        scrollToBottom();
      } else {
        // 입력 중... 표시
        setTypingIndicator({ speaker: msg.speaker });
        scrollToBottom();
        const typingDuration = Math.max(400, msg.dialogue.length * 30 * speed);
        const actualTyping = Math.max(0, typingDuration - credit);
        credit = Math.max(0, credit - typingDuration);
        await delay(actualTyping);

        // 입력 중 해제 → 메시지 표시
        setTypingIndicator(null);
        setCouncilMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }

      if (i < msgs.length - 1) {
        // 참모 간 딜레이: 0.5~2초 (속도 보정 적용)
        const interDelay = (500 + Math.random() * 1500) * speed;
        const actualInter = Math.max(0, interDelay - credit);
        credit = Math.max(0, credit - interDelay);
        await delay(actualInter);
      }
    }
  }, [scrollToBottom]);

  // ---- NPC Turn Processing ----
  const processNPCTurns = useCallback(async (): Promise<TurnNotificationItem[]> => {
    const world = worldStateRef.current;
    const npcFactions = world.factions.filter((f) => !f.isPlayer);
    if (npcFactions.length === 0) return [];

    setNpcProcessing(true);
    addMessage({ role: "system", content: "⏳ 타국 군주들이 행동 중..." });

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
      const npcResults = parseNPCResponse(raw);

      const notifications: TurnNotificationItem[] = [];

      for (const result of npcResults) {
        const faction = world.factions.find((f) => f.id === result.factionId);
        if (!faction) continue;

        notifications.push({
          factionId: result.factionId,
          summary: result.summary || result.actions.map((a) => a.details || a.action).join(", "),
          icon: faction.icon,
        });

        for (const action of result.actions) {
          applyNPCAction(result.factionId, action);
        }
      }

      if (notifications.length > 0) {
        const lines = notifications.map((n) => `${n.icon || "🏴"} ${FACTION_NAMES[n.factionId]} — ${n.summary}`).join("\n");
        addMessage({ role: "system", content: `📢 타국 동향\n${lines}` });
      }

      setNpcProcessing(false);
      return notifications;
    } catch (err) {
      console.error("NPC turn error:", err);
      const notifications: TurnNotificationItem[] = [];
      for (const npc of npcFactions) {
        applyDeterministicAction(npc.id);
        notifications.push({
          factionId: npc.id,
          summary: "내정에 집중하고 있습니다.",
          icon: npc.icon,
        });
      }
      const lines = notifications.map((n) => `${n.icon || "🏴"} ${FACTION_NAMES[n.factionId]} — ${n.summary}`).join("\n");
      addMessage({ role: "system", content: `📢 타국 동향\n${lines}` });
      setNpcProcessing(false);
      return notifications;
    }
  }, [worldStateRef, addMessage, llmProvider]);

  // ---- Apply NPC action locally ----
  const applyNPCAction = useCallback((factionId: FactionId, action: { action: NPCActionType; target?: string; details?: string }) => {
    setWorldState((prev) => {
      const factions = prev.factions.map((f) => {
        if (f.id !== factionId) return f;
        switch (action.action) {
          case "개발": {
            const city = f.cities[0];
            if (!city) return f;
            return {
              ...f,
              cities: f.cities.map((c, i) =>
                i === 0
                  ? { ...c, commerce: Math.min(100, c.commerce + 3), agriculture: Math.min(100, c.agriculture + 3) }
                  : c,
              ),
            };
          }
          case "모병": {
            const recruitCost = 2000;
            const recruits = 30000;
            if (f.gold < recruitCost) return f;
            return { ...f, gold: f.gold - recruitCost, totalTroops: f.totalTroops + recruits };
          }
          case "방어": {
            const city = f.cities[0];
            if (!city) return f;
            return {
              ...f,
              cities: f.cities.map((c, i) =>
                i === 0 ? { ...c, defense: Math.min(100, c.defense + 5) } : c,
              ),
            };
          }
          default:
            return f;
        }
      });
      return { ...prev, factions };
    });
  }, [setWorldState]);

  const applyDeterministicAction = useCallback((factionId: FactionId) => {
    applyNPCAction(factionId, { action: "개발" });
  }, [applyNPCAction]);

  // ---- Check game end ----
  const doCheckGameEnd = useCallback(() => {
    const result = checkGameEnd(worldStateRef.current);
    if (result) {
      setGameEndResult(result);
      return true;
    }
    return false;
  }, [worldStateRef]);

  // ---- Auto save ----
  const doAutoSave = useCallback(async () => {
    if (!uid) return;
    try {
      await autoSave(worldStateRef.current, messagesRef.current, convHistoryRef.current, uid, advisorsRef.current);
    } catch (err) {
      console.warn("자동 저장 실패:", err);
    }
  }, [worldStateRef, messagesRef, convHistoryRef, uid]);

  // ---- 참모 회의 전체 흐름 (Phase 1) ----
  const runCouncilMeeting = useCallback(async (context: string) => {
    // 이전 회의 메시지 보존
    const oldMsgs = councilMsgsRef.current;
    const oldNum = councilNumberRef.current;
    if (oldMsgs.length > 0) {
      setPrevCouncil({ number: oldNum, messages: oldMsgs });
    }

    setCouncilNumber((n) => n + 1);
    setCouncilMessages([]);
    setAutoActions([]);
    setApprovalRequests([]);
    setReplyTarget(null);
    setThreads({});
    setThreadTyping(null);
    setIsLoading(true);

    try {
      const { council, advisorUpdates, elapsedMs } = await doCouncilMeeting(context);

      // 참모 열정/충성도 업데이트
      updateAdvisorStats(advisorUpdates);

      // auto_actions의 state_changes 즉시 적용
      if (council.state_changes) {
        applyPlayerChanges(council.state_changes, addMessage);
      }

      // 참모 회의 메시지 애니메이션 (AI 응답 대기 시간만큼 딜레이 차감)
      await animateCouncilMessages(council.council_messages, true, { apiElapsedMs: elapsedMs });

      // 자율 행동 + 결재 요청 표시
      setAutoActions(council.auto_actions);
      if (council.approval_requests.length > 0) {
        await delay(400);
        setApprovalRequests(council.approval_requests);
        setTimeout(scrollToBottom, 450);
      }
    } finally {
      setIsLoading(false);
    }
  }, [doCouncilMeeting, animateCouncilMessages, updateAdvisorStats, applyPlayerChanges, addMessage, scrollToBottom]);

  // ---- 감정 방향 선택 처리 ----
  const handleDirectiveSelect = useCallback((directive: EmotionalDirective) => {
    setBriefing(null);
    const currentBriefing = detectSituation(worldStateRef.current);
    const directiveContext = `=== 주공의 지시 ===\n주공(유비)이 "${currentBriefing.briefingText}"를 듣고 "${directive.text}"라고 하셨다.\n→ 참모들은 ${directive.effect} 방향으로 업무를 수행하고 보고할 것.\n\n현재 정세를 분석하고 참모 회의를 진행하라. 각 참모가 자율 업무를 수행한 결과를 보고하라.`;
    runCouncilMeeting(directiveContext);
  }, [worldStateRef, runCouncilMeeting]);

  // ---- 브리핑 건너뛰기 (평상시) ----
  const handleBriefingSkip = useCallback(() => {
    setBriefing(null);
    const ev = checkAndTriggerEvents();
    const context = ev
      ? `이벤트: "${ev}". 현재 정세를 분석하고 참모 회의를 진행하라. 각 참모가 자율 업무를 수행한 결과를 보고하라.`
      : "현재 정세를 분석하고 참모 회의를 진행하라. 각 참모가 자율 업무를 수행한 결과를 보고하라.";
    runCouncilMeeting(context);
  }, [checkAndTriggerEvents, runCouncilMeeting]);

  // ---- 참모 발언 클릭 핸들러 ----
  const handleMessageClick = useCallback((msg: CouncilMessage, index: number) => {
    if (isLoading) return;
    setReplyTarget((prev) =>
      prev && prev.index === index ? null : { msg, index }
    );
  }, [isLoading]);

  // ---- Phase 2A: 결재 승인/거부 통합 ----
  const handleApprovalDecision = useCallback(async (reqId: string, decision: "승인" | "거부") => {
    if (processingTurnRef.current) return;
    processingTurnRef.current = true;

    const req = approvalRequests.find((r) => r.id === reqId);
    if (!req) { processingTurnRef.current = false; return; }

    const icon = decision === "승인" ? "✅" : "❌";
    setApprovalRequests((prev) => prev.filter((r) => r.id !== reqId));
    addMessage({ role: "user", content: `${icon} ${decision}: ${req.subject}` });
    setIsLoading(true);

    try {
      const { council, advisorUpdates, elapsedMs } = await doCouncilResult({
        type: "approval",
        id: req.id,
        decision,
        subject: req.subject,
        advisor: req.advisor,
      });

      await animateCouncilMessages(council.council_messages, false, { apiElapsedMs: elapsedMs });

      if (council.state_changes) {
        applyPlayerChanges(council.state_changes, addMessage);
      }
      updateAdvisorStats(advisorUpdates);

      // 남은 결재 요청이 없으면 자동 저장
      if (approvalRequests.length <= 1) {
        doAutoSave();
      }
    } finally {
      setIsLoading(false);
      processingTurnRef.current = false;
    }
  }, [approvalRequests, addMessage, doCouncilResult, animateCouncilMessages, applyPlayerChanges, updateAdvisorStats, doAutoSave]);

  const handleApproval = useCallback((reqId: string) => handleApprovalDecision(reqId, "승인"), [handleApprovalDecision]);
  const handleRejection = useCallback((reqId: string) => handleApprovalDecision(reqId, "거부"), [handleApprovalDecision]);

  // ---- 게임 시작 도입부 생성 ----
  const buildIntroMessages = useCallback((): CouncilMessage[] => {
    const ws = worldStateRef.current;
    const player = ws.factions.find((f) => f.isPlayer)!;
    const npcs = [...ws.factions.filter((f) => !f.isPlayer)].sort((a, b) => b.totalTroops - a.totalTroops);

    const npcLines = npcs.map((f) => {
      const troops = Math.round(f.totalTroops / 10000);
      return `${f.rulerName}이 ${f.cities.length}성에 ${troops}만 대군`;
    }).join(", ");

    const playerTroops = Math.round(player.totalTroops / 10000);
    const playerCities = player.cities.map((c) => c.cityName).join("·");
    const generalNames = player.generals.filter((g) => g.generalName !== "제갈량").map((g) => g.generalName).join(", ");

    return [
      {
        speaker: "제갈량",
        dialogue: `주공, 건안 13년 ${ws.currentMonth}월이옵니다. 이 제갈량, 삼고초려의 은혜에 보답하고자 오늘부터 주공의 곁에서 천하대계를 도모하겠사옵니다.`,
        emotion: "calm",
      },
      {
        speaker: "제갈량",
        dialogue: `현재 천하의 정세를 아뢰겠습니다. ${npcLines}을 거느리고 있사옵니다. 특히 조조와 원소는 이미 전쟁 중이니, 이 틈을 놓쳐서는 아니 되옵니다.`,
        emotion: "thoughtful",
      },
      {
        speaker: "제갈량",
        dialogue: `우리 유비군은 ${playerCities} 두 성에 병력 ${playerTroops}만... 비록 약소하나, ${generalNames} — 주공 곁에 이만한 인재가 있으니 결코 뜻을 펼치지 못할 바가 아니옵니다.`,
        emotion: "calm",
      },
      {
        speaker: "제갈량",
        dialogue: "그러면 첫 참모 회의를 열겠사옵니다. 각 참모의 업무 보고를 들으시고, 필요한 지시가 있으시면 말씀해 주시옵소서.",
        emotion: "excited",
      },
    ];
  }, [worldStateRef]);

  // ---- Actions ----
  const startGame = useCallback(async () => {
    if (processingTurnRef.current) return;
    processingTurnRef.current = true;
    setTokenUsage({ input: 0, output: 0 });
    setStarted(true);
    sessionStorage.setItem("gameActive", "true");

    try {
      // Phase 0: 제갈량 도입 서사
      const introMessages = buildIntroMessages();
      setCouncilNumber(0);
      await animateCouncilMessages(introMessages, true, { firstImmediate: true, speedDecay: 0.8, speedMultiplier: 0.7 });

      // 도입 후 잠시 대기
      await delay(1000);

      // Phase 1: 첫 참모 회의 — 도입 서사를 유지하며 인라인 처리 (깜빡임 방지)
      setIsLoading(true);
      const ev = checkAndTriggerEvents();
      const context = ev
        ? `게임이 시작되었다. 첫 번째 참모 회의다. 이벤트 "${ev}"도 포함하여 각 참모가 자율 업무를 수행한 결과를 보고하고, 천하 정세도 간략히 알려라. (도입 서사는 이미 완료됨 — 천하 정세 반복하지 말 것)`
        : "게임이 시작되었다. 첫 번째 참모 회의다. 각 참모가 자율 업무를 수행한 결과를 보고하고, 천하 정세도 간략히 알려라. (도입 서사는 이미 완료됨 — 천하 정세 반복하지 말 것)";

      const { council, advisorUpdates, elapsedMs } = await doCouncilMeeting(context);
      updateAdvisorStats(advisorUpdates);
      if (council.state_changes) {
        applyPlayerChanges(council.state_changes, addMessage);
      }

      // 도입 서사와 회의 사이에 타이틀 구분선 삽입
      setCouncilMessages((prev) => [...prev, { speaker: "__council_title__", dialogue: "1", emotion: "calm" as const }]);
      scrollToBottom();
      await delay(600);

      // 도입 서사 아래에 회의 메시지 이어붙임 (AI 대기 시간만큼 딜레이 차감)
      await animateCouncilMessages(council.council_messages, false, { apiElapsedMs: elapsedMs });

      setAutoActions(council.auto_actions);
      if (council.approval_requests.length > 0) {
        await delay(400);
        setApprovalRequests(council.approval_requests);
        setTimeout(scrollToBottom, 450);
      }
    } finally {
      setIsLoading(false);
      processingTurnRef.current = false;
    }
  }, [buildIntroMessages, animateCouncilMessages, checkAndTriggerEvents, doCouncilMeeting, updateAdvisorStats, applyPlayerChanges, addMessage, scrollToBottom, setTokenUsage]);

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

    const savedAdvisors = save.advisors;
    if (Array.isArray(savedAdvisors) && savedAdvisors.length > 0) {
      setAdvisors(savedAdvisors);
    }

    setStarted(true);
    sessionStorage.setItem("gameActive", "true");
    // 자동 저장 불러오기 메시지는 표시하지 않음
    setIsLoading(true);

    try {
      await runCouncilMeeting("저장된 게임을 불러왔다. 현재 상황을 간략히 요약하고 각 참모가 자율 업무를 수행한 결과를 보고하라.");
    } finally {
      setIsLoading(false);
      processingTurnRef.current = false;
    }
  }, [loadWorldState, setMessages, setConvHistory, addMessage, uid, setTokenUsage, runCouncilMeeting]);

  // ---- 쓰레드에 메시지 추가 헬퍼 ----
  const addThreadMessage = useCallback((msgIndex: number, threadMsg: ThreadMessage) => {
    setThreads((prev) => ({
      ...prev,
      [msgIndex]: [...(prev[msgIndex] || []), threadMsg],
    }));
  }, []);

  // ---- 쓰레드 내 응답 애니메이션 ----
  const animateThreadMessages = useCallback(async (msgIndex: number, msgs: CouncilMessage[]) => {
    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i];

      // 쓰레드 내 타이핑 인디케이터
      setThreadTyping({ msgIndex, speaker: msg.speaker });
      scrollToBottom();
      const typingDuration = Math.max(400, msg.dialogue.length * 30);
      await delay(typingDuration);

      // 타이핑 해제 → 메시지 추가
      setThreadTyping(null);
      addThreadMessage(msgIndex, {
        type: "advisor",
        speaker: msg.speaker,
        text: msg.dialogue,
        emotion: msg.emotion,
      });
      scrollToBottom();

      if (i < msgs.length - 1) {
        const interDelay = 500 + Math.random() * 1500;
        await delay(interDelay);
      }
    }
  }, [addThreadMessage, scrollToBottom]);

  // ---- sendMessage (Phase 2B: 자유 입력) ----
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || processingTurnRef.current) return;
    processingTurnRef.current = true;
    const text = input.trim();
    const reply = replyTarget;
    setInput("");
    setReplyTarget(null);
    setIsLoading(true);

    // LLM에 보낼 메시지에 답장 맥락 포함
    const llmMessage = reply
      ? `${reply.msg.speaker}의 "${reply.msg.dialogue}"에 대해 유비가 말합니다: "${text}"`
      : text;

    if (reply) {
      // 쓰레드에 유저 메시지 추가
      addThreadMessage(reply.index, { type: "user", speaker: "유비", text });
      scrollToBottom();
    } else {
      // 일반 메시지 (답장 대상 없음)
      addMessage({ role: "user", content: text });
    }

    try {
      const { council, advisorUpdates, elapsedMs } = await doCouncilResult({
        type: "freetext",
        message: llmMessage,
        replyTo: reply ? reply.msg.speaker : undefined,
      });

      if (reply) {
        // replyTo 참모가 맨 앞에 오도록 정렬 (LLM이 순서를 안 지킬 경우 대비)
        const replyToName = reply.msg.speaker;
        const sorted = [...council.council_messages].sort((a, b) => {
          if (a.speaker === replyToName && b.speaker !== replyToName) return -1;
          if (a.speaker !== replyToName && b.speaker === replyToName) return 1;
          return 0;
        });
        await animateThreadMessages(reply.index, sorted);
      } else {
        // 일반 응답 (AI 대기 시간만큼 딜레이 차감)
        await animateCouncilMessages(council.council_messages, false, { apiElapsedMs: elapsedMs });
      }

      if (council.state_changes) {
        applyPlayerChanges(council.state_changes, addMessage);
      }
      updateAdvisorStats(advisorUpdates);

      doAutoSave();
    } finally {
      setIsLoading(false);
      processingTurnRef.current = false;
    }
  }, [input, isLoading, replyTarget, addMessage, addThreadMessage, animateThreadMessages, doCouncilResult, animateCouncilMessages, applyPlayerChanges, updateAdvisorStats, doAutoSave, scrollToBottom]);

  // ---- handleNextTurn (Phase 2C + Phase 3) ----
  const handleNextTurn = useCallback(async () => {
    if (processingTurnRef.current) return;
    processingTurnRef.current = true;
    setIsLoading(true);

    try {
      // 방치형 처리: 미결재 건 자동 처리
      for (const req of approvalRequests) {
        if (req.urgency === "routine") {
          // routine → 자동 승인
          addMessage({ role: "system", content: `📝 ${req.advisor}의 "${req.subject}" — 자동 승인됨` });
          if (req.cost) {
            applyPlayerChanges(req.cost, addMessage);
          }
        } else if (req.urgency === "important") {
          // important → 제갈량 자율 판단 (50%)
          if (Math.random() > 0.5) {
            addMessage({ role: "system", content: `📝 제갈량이 ${req.advisor}의 "${req.subject}"을 승인했습니다` });
            if (req.cost) {
              applyPlayerChanges(req.cost, addMessage);
            }
          } else {
            addMessage({ role: "system", content: `📝 제갈량이 ${req.advisor}의 "${req.subject}"을 보류했습니다` });
          }
        } else {
          // critical → 보류 (다음 턴 이월 — 여기서는 그냥 알림)
          addMessage({ role: "system", content: `⚠️ ${req.advisor}의 "${req.subject}" — 결재 없이 보류됨` });
        }
      }
      setApprovalRequests([]);

      // Phase 3: NPC 턴 + 턴 진행
      const notifications = await processNPCTurns();
      advanceWorldTurn();

      if (doCheckGameEnd()) return;

      // Phase 0: 다음 턴 정세 브리핑
      await delay(800);
      const situation = detectSituation(worldStateRef.current);
      const ev = checkAndTriggerEvents();

      if (situation.isUrgent) {
        setIsLoading(false);
        setBriefing(situation);
        doAutoSave();
      } else {
        // 평상시 — 바로 참모 회의
        const npcSummary = notifications.length > 0
          ? `\n타국 동향: ${notifications.map((n) => `${FACTION_NAMES[n.factionId]}: ${n.summary}`).join(". ")}`
          : "";

        const context = ev
          ? `이벤트: "${ev}".${npcSummary} 현재 정세를 분석하고 참모 회의를 진행하라. 각 참모가 자율 업무를 수행한 결과를 보고하라.`
          : `${npcSummary ? npcSummary + " " : ""}현재 정세를 분석하고 참모 회의를 진행하라. 각 참모가 자율 업무를 수행한 결과를 보고하라.`;

        await runCouncilMeeting(context);
        doAutoSave();
      }
    } finally {
      setIsLoading(false);
      processingTurnRef.current = false;
    }
  }, [advanceWorldTurn, checkAndTriggerEvents, processNPCTurns, doCheckGameEnd, doAutoSave,
      runCouncilMeeting, approvalRequests, addMessage, applyPlayerChanges, worldStateRef]);

  // ---- Diplomacy Handler ----
  const handleDiplomacy = useCallback((targetId: FactionId, action: DiplomaticAction) => {
    const player = worldStateRef.current.factions.find((f) => f.isPlayer)!;
    const target = worldStateRef.current.factions.find((f) => f.id === targetId);
    if (!target) return;

    const rel = getRelationBetween(worldStateRef.current.relations, player.id, targetId);
    const result = executeDiplomaticAction(action, player, target, rel);

    addMessage({ role: "system", content: `🏛️ ${result.message}` });

    setWorldState((prev) => ({
      ...prev,
      relations: updateRelation(prev.relations, player.id, targetId, result),
    }));

    setShowDiplomacy(false);
    doAutoSave();
  }, [worldStateRef, addMessage, setWorldState, doAutoSave]);

  const handleRestart = useCallback(() => {
    sessionStorage.removeItem("gameActive");
    window.location.reload();
  }, []);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening((text) => {
        setInput(text);
      });
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
  const hasApprovalRequests = approvalRequests.length > 0;

  return (
    <div style={{
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-primary)",
      position: "relative",
      overflow: "hidden",
    }}>
      <StatusBar state={{
        rulerName: playerFaction.rulerName,
        gold: playerFaction.gold,
        food: playerFaction.food,
        totalTroops: playerFaction.totalTroops,
        popularity: playerFaction.popularity,
        currentTurn: worldState.currentTurn,
        currentMonth: worldState.currentMonth,
        currentSeason: worldState.currentSeason,
        cities: playerFaction.cities,
        generals: playerFaction.generals,
        recentEvents: playerFaction.recentEvents,
        pendingTasks: playerFaction.pendingTasks,
      }} deltas={deltas}>
        <UserBadge user={user} onLogin={() => {}} onLogout={logout} />
        <button onClick={() => setShowWorldStatus(true)} style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "16px",
          padding: "3px 10px", color: "var(--text-secondary)", fontSize: "11px", cursor: "pointer",
        }}>
          🗺️
        </button>
        <button onClick={() => setShowDiplomacy(true)} style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "16px",
          padding: "3px 10px", color: "var(--text-secondary)", fontSize: "11px", cursor: "pointer",
        }}>
          🏛️
        </button>
        <button onClick={() => setShowTasks(!showTasks)} style={{
          background: tasks.length > 0 ? "rgba(212,68,62,0.2)" : "rgba(255,255,255,0.05)",
          border: "1px solid var(--border)", borderRadius: "16px",
          padding: "3px 10px", color: "var(--text-secondary)", fontSize: "11px", cursor: "pointer",
        }}>
          📋 {tasks.length}
        </button>
      </StatusBar>

      <TaskPanel tasks={tasks} show={showTasks} onToggle={() => setShowTasks(false)} />

      {/* NPC Processing Indicator */}
      {npcProcessing && (
        <div style={{
          padding: "6px 14px",
          background: "rgba(201,168,76,0.1)",
          borderBottom: "1px solid var(--border)",
          textAlign: "center",
          fontSize: "11px",
          color: "var(--gold)",
          animation: "pulse 1.5s infinite",
        }}>
          ⏳ 타국 군주들이 행동 중...
        </div>
      )}

      {/* AI Provider Toggle + Token Usage */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
        padding: "2px 8px", fontSize: "10px",
        color: "var(--text-dim)", borderBottom: "1px solid var(--border)",
        background: "var(--bg-secondary)", letterSpacing: "0.5px",
      }}>
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
        {(tokenUsage.input > 0 || tokenUsage.output > 0) && (
          <span>
            턴당 ▲{Math.round(tokenUsage.input / Math.max(1, worldState.currentTurn)).toLocaleString()} ▼{Math.round(tokenUsage.output / Math.max(1, worldState.currentTurn)).toLocaleString()}
          </span>
        )}
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingTop: "6px", paddingBottom: "6px" }}>
        {/* 시스템/유저 메시지 */}
        {messages.map((msg, i) => <ChatBubble key={i} message={msg} />)}

        {/* Phase 0: 정세 브리핑 패널 */}
        {briefing && (
          <BriefingPanel
            briefing={briefing}
            onSelectDirective={handleDirectiveSelect}
            onSkip={handleBriefingSkip}
          />
        )}

        {/* 이전 회의 기록 (읽기 전용) */}
        {prevCouncil && (
          <div style={prevCouncil.number > 0 ? { opacity: 0.5 } : undefined}>
            <CouncilChat
              messages={prevCouncil.messages}
              advisors={advisors}
              councilNumber={prevCouncil.number}
            />
          </div>
        )}

        {/* 현재 참모 회의 채팅 */}
        {(councilMessages.length > 0 || typingIndicator) && (
          <CouncilChat
            messages={councilMessages}
            advisors={advisors}
            councilNumber={councilNumber}
            streamingMessage={councilStreamMsg}
            typingIndicator={typingIndicator}
            autoActions={autoActions}
            approvalRequests={approvalRequests}
            threads={threads}
            threadTyping={threadTyping}
            onApprove={handleApproval}
            onReject={handleRejection}
            onMessageClick={handleMessageClick}
            replyTarget={replyTarget}
            disabled={isLoading}
          />
        )}

        {/* 스트리밍 중 (현재 회의 메시지와 타이핑 인디케이터가 없을 때만) */}
        {councilMessages.length === 0 && !typingIndicator && councilStreamMsg && (
          <CouncilChat
            messages={[]}
            advisors={advisors}
            councilNumber={councilNumber}
            streamingMessage={councilStreamMsg}
          />
        )}

        {isLoading && !councilStreamMsg && !typingIndicator && !threadTyping && (
          <div style={{ padding: "8px 56px", fontSize: "12px", color: "var(--text-dim)", animation: "pulse 1.5s infinite" }}>
            🪶 참모들이 논의 중...
          </div>
        )}
      </div>

      {/* 답장 인디케이터 */}
      {replyTarget && (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "6px 14px",
          background: "rgba(201,168,76,0.08)",
          borderTop: "1px solid var(--border)",
          fontSize: "12px",
          color: "var(--text-secondary)",
        }}>
          <span style={{ color: "var(--gold)", fontWeight: 600 }}>
            💬 {replyTarget.msg.speaker}
          </span>
          <span style={{
            flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            opacity: 0.7,
          }}>
            {replyTarget.msg.dialogue}
          </span>
          <button
            onClick={() => setReplyTarget(null)}
            style={{
              background: "none", border: "none", color: "var(--text-dim)",
              cursor: "pointer", fontSize: "14px", padding: "0 4px", flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Input */}
      <div style={{
        display: "flex", gap: "8px", padding: "10px 14px",
        background: "var(--bg-secondary)", borderTop: replyTarget ? "none" : "1px solid var(--border)",
      }}>
        <button
          onClick={handleMicToggle}
          disabled={isLoading}
          style={{
            background: isListening ? "rgba(212,68,62,0.2)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${isListening ? "var(--danger)" : "var(--border)"}`,
            borderRadius: "8px",
            padding: "10px 12px",
            fontSize: "14px",
            cursor: isLoading ? "not-allowed" : "pointer",
            color: isListening ? "var(--danger)" : "var(--text-secondary)",
            animation: isListening ? "recording-pulse 1.5s infinite" : "none",
            flexShrink: 0,
          }}
        >
          🎤
        </button>
        <input
          value={isListening ? partialTranscript : input}
          onChange={(e) => { if (!isListening) setInput(e.target.value); }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={isListening ? "말씀하세요..." : hasApprovalRequests ? "결재를 처리하거나, 참모들에게 명을 내리십시오..." : "참모들에게 명을 내리십시오..."}
          disabled={isLoading || isListening}
          style={{
            flex: 1, background: "rgba(255,255,255,0.05)",
            border: `1px solid ${isListening ? "var(--danger)" : "var(--border)"}`,
            borderRadius: "8px",
            padding: "10px 14px", color: "var(--text-primary)", fontSize: "13.5px",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          style={{
            background: isLoading || !input.trim() ? "rgba(201,168,76,0.15)" : "var(--gold)",
            color: isLoading || !input.trim() ? "var(--text-dim)" : "var(--bg-primary)",
            border: "none", borderRadius: "8px", padding: "10px 16px",
            fontSize: "13px", cursor: isLoading ? "not-allowed" : "pointer", fontWeight: 700,
          }}
        >
          전송
        </button>
        {!isLoading && messages.length > 2 && !briefing && (
          <button onClick={handleNextTurn} style={{
            background: "rgba(255,255,255,0.05)", color: "var(--gold)",
            border: "1px solid var(--border)", borderRadius: "8px",
            padding: "10px 12px", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap", fontWeight: 600,
          }}>
            다음턴
          </button>
        )}
      </div>

      {/* Modals */}
      <WorldStatus worldState={worldState} show={showWorldStatus} onClose={() => setShowWorldStatus(false)} />
      <DiplomacyPanel
        worldState={worldState}
        show={showDiplomacy}
        onClose={() => setShowDiplomacy(false)}
        onAction={handleDiplomacy}
        disabled={isLoading}
      />
      {battleReport && (
        <BattleReport result={battleReport} onClose={() => setBattleReport(null)} />
      )}
    </div>
  );
}
