"use client";

import { useState, useCallback, useEffect } from "react";
import type { GameTask, FactionId, BattleResult, GameEndResult } from "@/types/game";
import type { Choice, AIResponse, ChatMessage, TokenUsage } from "@/types/chat";
import { useWorldState } from "@/hooks/useWorldState";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useWorldTurn } from "@/hooks/useWorldTurn";
import { useTypewriter } from "@/hooks/useTypewriter";
import { callLLM } from "@/lib/api/llmClient";
import { buildWorldSystemPrompt } from "@/lib/prompts/systemPrompt";
import { buildFactionAIPrompt, parseNPCResponse } from "@/lib/prompts/factionAIPrompt";
import { executeDiplomaticAction, updateRelation, getRelationBetween } from "@/lib/game/diplomacySystem";
import type { DiplomaticAction } from "@/lib/game/diplomacySystem";
import { resolveBattle, generateBattleNarrative } from "@/lib/game/combatSystem";
import { saveGame, loadGame, autoSave, loadAutoSave, hasAnySave } from "@/lib/game/saveSystem";
import { checkGameEnd } from "@/lib/game/victorySystem";
import { FACTION_NAMES } from "@/constants/factions";
import StatusBar from "./StatusBar";
import ChatBubble from "./ChatBubble";
import ChoicePanel from "./ChoicePanel";
import TaskPanel from "./TaskPanel";
import TitleScreen from "./TitleScreen";
import WorldStatus from "./WorldStatus";
import TurnNotification, { type TurnNotificationItem } from "./TurnNotification";
import BattleReport from "./BattleReport";
import DiplomacyPanel from "./DiplomacyPanel";
import SaveLoadPanel from "./SaveLoadPanel";
import GameEndScreen from "./GameEndScreen";
import { useVoice } from "@/hooks/useVoice";

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
    streamingText, setStreamingText,
    scrollRef, scrollToBottom,
  } = useChatHistory();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentChoices, setCurrentChoices] = useState<Choice[] | null>(null);
  const [tasks, setTasks] = useState<GameTask[]>([]);
  const [showTasks, setShowTasks] = useState(false);
  const [started, setStarted] = useState(false);
  const [waitChoice, setWaitChoice] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 });

  useEffect(() => {
    setHasSave(hasAnySave());
  }, []);

  // Phase C states
  const [showWorldStatus, setShowWorldStatus] = useState(false);
  const [showDiplomacy, setShowDiplomacy] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [saveLoadMode, setSaveLoadMode] = useState<"save" | "load">("save");
  const [turnNotifications, setTurnNotifications] = useState<TurnNotificationItem[]>([]);
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

  const { typeText } = useTypewriter();

  const {
    startListening, stopListening, isListening, partialTranscript,
  } = useVoice();


  // ---- Helper: get player as GameState-like for prompts ----
  const getPlayerGameState = useCallback(() => {
    const player = worldStateRef.current.factions.find((f) => f.isPlayer)!;
    return {
      rulerName: player.rulerName,
      gold: player.gold,
      food: player.food,
      totalTroops: player.totalTroops,
      popularity: player.popularity,
      currentTurn: worldStateRef.current.currentTurn,
      currentSeason: worldStateRef.current.currentSeason,
      cities: player.cities,
      generals: player.generals,
      recentEvents: player.recentEvents,
      pendingTasks: player.pendingTasks,
    };
  }, [worldStateRef]);

  // ---- API Call wrapper ----
  const doCallLLM = useCallback(async (
    userMsg: string | null,
    overrideContent?: string,
  ): Promise<AIResponse> => {
    const content = overrideContent || userMsg || "";
    addToConvHistory("user", content);

    const trimmedHistory = [...convHistory, { role: "user" as const, content }].slice(-20);
    const { response, usage } = await callLLM(
      buildWorldSystemPrompt(worldStateRef.current),
      trimmedHistory,
    );

    if (usage) {
      setTokenUsage((prev) => ({
        input: prev.input + usage.input_tokens,
        output: prev.output + usage.output_tokens,
      }));
    }

    const raw = JSON.stringify(response);
    addToConvHistory("assistant", raw);
    return response;
  }, [convHistory, worldStateRef, addToConvHistory]);

  // ---- NPC Turn Processing ----
  const processNPCTurns = useCallback(async () => {
    const world = worldStateRef.current;
    const npcFactions = world.factions.filter((f) => !f.isPlayer);
    if (npcFactions.length === 0) return;

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
        }),
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text || "";
      if (data.usage) {
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

        // Apply NPC actions
        for (const action of result.actions) {
          applyNPCAction(result.factionId, action);
        }
      }

      if (notifications.length > 0) {
        setTurnNotifications(notifications);
      }
    } catch (err) {
      console.error("NPC turn error:", err);
      // Fallback: deterministic NPC actions
      const notifications: TurnNotificationItem[] = [];
      for (const npc of npcFactions) {
        applyDeterministicAction(npc.id);
        notifications.push({
          factionId: npc.id,
          summary: "내정에 집중하고 있습니다.",
          icon: npc.icon,
        });
      }
      setTurnNotifications(notifications);
    }

    setNpcProcessing(false);
  }, [worldStateRef, addMessage]);

  // ---- Apply NPC action locally ----
  const applyNPCAction = useCallback((factionId: FactionId, action: { action: string; target?: string; details?: string }) => {
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
            const recruits = 3000;
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

  // ---- Add advisor message with typing animation (split into segments) ----
  const addAdvisorMsg = useCallback(async (parsed: AIResponse) => {
    setIsLoading(false);
    setStreamingText("");

    const segments = parsed.dialogue.split("\n\n").filter((s) => s.trim());

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i].trim();

      await typeText(seg, (partial) => {
        setStreamingText(partial);
        scrollToBottom();
      });

      setStreamingText("");
      addMessage({ role: "assistant", content: seg, emotion: parsed.emotion });

      if (i < segments.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    if (parsed.choices && parsed.choices.length > 0) {
      setCurrentChoices(parsed.choices);
      setWaitChoice(true);
    }
    if (parsed.state_changes) {
      applyPlayerChanges(parsed.state_changes, addMessage);
    }
  }, [typeText, setStreamingText, scrollToBottom, addMessage, applyPlayerChanges]);

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
  const doAutoSave = useCallback(() => {
    autoSave(worldStateRef.current, messages, convHistory as any);
  }, [worldStateRef, messages, convHistory]);

  // ---- Actions ----
  const startGame = useCallback(async () => {
    setStarted(true);
    setIsLoading(true);
    addMessage({ role: "system", content: "🏯 삼국지 AI — 제갈량이 보고를 올립니다" });

    const ev = checkAndTriggerEvents();
    const prompt = ev
      ? `게임이 시작되었다. 첫 턴이다. 주공(유비)에게 현재 상황을 보고하고, 이벤트 "${ev}" 도 포함하여 조언하라. 천하 정세도 간략히 알려라. 2~3개 선택지를 제시하라.`
      : "게임이 시작되었다. 첫 턴이다. 주공(유비)에게 현재 국가 상황을 보고하고, 천하 정세도 간략히 알려라. 2~3개 선택지를 제시하라.";

    const parsed = await doCallLLM(null, prompt);
    await addAdvisorMsg(parsed);
  }, [addMessage, checkAndTriggerEvents, doCallLLM, addAdvisorMsg]);

  const startFromSave = useCallback(async (slotIndex: number) => {
    const save = loadGame(slotIndex);
    if (!save) return;

    loadWorldState(save.worldState);
    setMessages(save.chatMessages as ChatMessage[]);
    setConvHistory(save.convHistory as any);
    setStarted(true);
    addMessage({ role: "system", content: `📂 저장된 게임을 불러왔습니다 (${save.metadata.turnCount}턴)` });
  }, [loadWorldState, setMessages, setConvHistory, addMessage]);

  const startFromAutoSave = useCallback(async () => {
    const save = loadAutoSave();
    if (!save) return;

    loadWorldState(save.worldState);
    setMessages(save.chatMessages as ChatMessage[]);
    setConvHistory(save.convHistory as any);
    setStarted(true);
    addMessage({ role: "system", content: `📂 자동 저장을 불러왔습니다 (${save.metadata.turnCount}턴)` });
  }, [loadWorldState, setMessages, setConvHistory, addMessage]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    addMessage({ role: "user", content: text });
    setIsLoading(true);
    const parsed = await doCallLLM(text);
    await addAdvisorMsg(parsed);
  }, [input, isLoading, addMessage, doCallLLM, addAdvisorMsg]);

  const handleChoice = useCallback(async (choice: Choice) => {
    setWaitChoice(false);
    setCurrentChoices(null);
    addMessage({ role: "user", content: `[${choice.id}] ${choice.text}` });
    setIsLoading(true);

    const prompt = `플레이어가 [${choice.id}] "${choice.text}"을(를) 선택했다. 결과를 보고하라. 반드시 state_changes를 포함하여 수치 변화를 알려라. state_changes: {"gold_delta":숫자,"food_delta":숫자,"troops_delta":숫자,"popularity_delta":숫자,"city_updates":[{"city":"도시명","defense_delta":숫자}],"general_updates":[{"name":"장수명","task":"임무","loyalty_delta":숫자}],"new_events":["설명"],"result_message":"요약"}`;
    const parsed = await doCallLLM(null, prompt);
    await addAdvisorMsg(parsed);

    // Auto save before turn advance
    doAutoSave();

    setTimeout(async () => {
      // Process NPC turns
      await processNPCTurns();

      // Advance turn
      advanceWorldTurn();

      // Check game end
      if (doCheckGameEnd()) return;

      setTimeout(async () => {
        const ev = checkAndTriggerEvents();
        const world = worldStateRef.current;
        const npcSummary = turnNotifications.length > 0
          ? `\n타국 동향: ${turnNotifications.map((n) => `${FACTION_NAMES[n.factionId]}: ${n.summary}`).join(". ")}`
          : "";

        const np = ev
          ? `새 턴이 시작되었다. 이벤트: "${ev}".${npcSummary} 보고하고 2~3개 선택지를 제시하라.`
          : `새 턴이 시작되었다.${npcSummary} 상황을 보고하고 2~3개 선택지를 제시하라.`;
        setIsLoading(true);
        const next = await doCallLLM(null, np);
        await addAdvisorMsg(next);
      }, 1200);
    }, 800);
  }, [addMessage, doCallLLM, addAdvisorMsg, advanceWorldTurn, checkAndTriggerEvents, processNPCTurns, doCheckGameEnd, doAutoSave, worldStateRef, turnNotifications]);

  const handleNextTurn = useCallback(async () => {
    doAutoSave();

    // Process NPC turns first
    await processNPCTurns();

    advanceWorldTurn();

    if (doCheckGameEnd()) return;

    setTimeout(async () => {
      const ev = checkAndTriggerEvents();
      const npcSummary = turnNotifications.length > 0
        ? `\n타국 동향: ${turnNotifications.map((n) => `${FACTION_NAMES[n.factionId]}: ${n.summary}`).join(". ")}`
        : "";

      const np = ev
        ? `새 턴이다. 이벤트: "${ev}".${npcSummary} 보고하고 2~3개 선택지를 제시하라.`
        : `새 턴이다.${npcSummary} 보고하고 2~3개 선택지를 제시하라.`;
      setIsLoading(true);
      const next = await doCallLLM(null, np);
      await addAdvisorMsg(next);
    }, 800);
  }, [advanceWorldTurn, checkAndTriggerEvents, doCallLLM, addAdvisorMsg, processNPCTurns, doCheckGameEnd, doAutoSave, turnNotifications]);

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
  }, [worldStateRef, addMessage, setWorldState]);

  // ---- Save/Load Handlers ----
  const handleSave = useCallback((slotIndex: number) => {
    const success = saveGame(slotIndex, worldStateRef.current, messages, convHistory as any);
    if (success) {
      addMessage({ role: "system", content: `💾 슬롯 ${slotIndex + 1}에 저장되었습니다.` });
    }
    setShowSaveLoad(false);
  }, [worldStateRef, messages, convHistory, addMessage]);

  const handleLoad = useCallback((slotIndex: number) => {
    const save = loadGame(slotIndex);
    if (save) {
      loadWorldState(save.worldState);
      setMessages(save.chatMessages as ChatMessage[]);
      setConvHistory(save.convHistory as any);
      addMessage({ role: "system", content: `📂 슬롯 ${slotIndex + 1}에서 불러왔습니다 (${save.metadata.turnCount}턴).` });
    }
    setShowSaveLoad(false);
  }, [loadWorldState, setMessages, setConvHistory, addMessage]);

  const handleRestart = useCallback(() => {
    window.location.reload();
  }, []);

  // ---- Voice choice matching ----
  const matchVoiceChoice = useCallback((transcript: string): Choice | null => {
    if (!currentChoices) return null;
    const t = transcript.trim().toLowerCase();

    const choiceMap: Record<string, string> = {
      "에이": "A", "a": "A", "1": "A", "첫번째": "A", "첫 번째": "A",
      "비": "B", "b": "B", "2": "B", "두번째": "B", "두 번째": "B",
      "씨": "C", "c": "C", "3": "C", "세번째": "C", "세 번째": "C",
    };

    for (const [keyword, id] of Object.entries(choiceMap)) {
      if (t.includes(keyword)) {
        const found = currentChoices.find((c) => c.id === id);
        if (found) return found;
      }
    }
    return null;
  }, [currentChoices]);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening((text) => {
        // Try to match a choice first
        const choice = matchVoiceChoice(text);
        if (choice) {
          handleChoice(choice);
        } else {
          setInput(text);
        }
      });
    }
  }, [isListening, stopListening, startListening, matchVoiceChoice, handleChoice]);

  // ===================== RENDER =====================

  if (gameEndResult) {
    return <GameEndScreen result={gameEndResult} onRestart={handleRestart} />;
  }

  if (!started) {
    return (
      <TitleScreen
        onStart={startGame}
        onContinue={hasSave ? startFromAutoSave : undefined}
        onLoadSlot={startFromSave}
      />
    );
  }

  const playerFaction = getPlayerFaction();

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
        currentSeason: worldState.currentSeason,
        cities: playerFaction.cities,
        generals: playerFaction.generals,
        recentEvents: playerFaction.recentEvents,
        pendingTasks: playerFaction.pendingTasks,
      }} deltas={deltas}>
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
        <button onClick={() => { setSaveLoadMode("save"); setShowSaveLoad(true); }} style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "16px",
          padding: "3px 10px", color: "var(--text-secondary)", fontSize: "11px", cursor: "pointer",
        }}>
          💾
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

      {/* Turn Notifications */}
      <TurnNotification notifications={turnNotifications} onDismiss={() => setTurnNotifications([])} />

      {/* Token Usage */}
      {(tokenUsage.input > 0 || tokenUsage.output > 0) && (
        <div style={{
          textAlign: "center", padding: "2px 0", fontSize: "10px",
          color: "var(--text-dim)", borderBottom: "1px solid var(--border)",
          background: "var(--bg-secondary)", letterSpacing: "0.5px",
        }}>
          토큰 ▲{tokenUsage.input.toLocaleString()} ▼{tokenUsage.output.toLocaleString()}
        </div>
      )}

      {/* Chat */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingTop: "6px", paddingBottom: "6px" }}>
        {messages.map((msg, i) => <ChatBubble key={i} message={msg} />)}
        {streamingText && (
          <ChatBubble message={{ role: "assistant", content: streamingText, emotion: "thoughtful" }} isTyping />
        )}
        {isLoading && !streamingText && (
          <div style={{ padding: "8px 56px", fontSize: "12px", color: "var(--text-dim)", animation: "pulse 1.5s infinite" }}>
            🪶 제갈량이 생각 중...
          </div>
        )}
      </div>

      {/* Choices */}
      {currentChoices && <ChoicePanel choices={currentChoices} onSelect={handleChoice} disabled={isLoading} />}

      {/* Input */}
      <div style={{
        display: "flex", gap: "8px", padding: "10px 14px",
        background: "var(--bg-secondary)", borderTop: "1px solid var(--border)",
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
          placeholder={isListening ? "말씀하세요..." : waitChoice ? "위 선택지를 골라주세요..." : "제갈량에게 명을 내리십시오..."}
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
        {!waitChoice && !isLoading && messages.length > 2 && (
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
      <SaveLoadPanel
        show={showSaveLoad}
        mode={saveLoadMode}
        onClose={() => setShowSaveLoad(false)}
        onSave={handleSave}
        onLoad={handleLoad}
      />
      {battleReport && (
        <BattleReport result={battleReport} onClose={() => setBattleReport(null)} />
      )}
    </div>
  );
}
