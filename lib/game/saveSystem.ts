import type { WorldState, SaveData } from "@/types/game";
import type { ChatMessage, ConversationMessage } from "@/types/chat";

const SAVE_KEY_PREFIX = "three_kingdoms_save_";
const AUTO_SAVE_KEY = "three_kingdoms_autosave";
const SAVE_VERSION = 1;
const MAX_SLOTS = 5;

const isBrowser = typeof window !== "undefined";

function getPlayerInfo(world: WorldState) {
  const player = world.factions.find((f) => f.isPlayer);
  return {
    turnCount: world.currentTurn,
    playerFactionName: player?.rulerName ?? "유비",
    playerCityCount: player?.cities.length ?? 0,
  };
}

export function saveGame(
  slotIndex: number,
  worldState: WorldState,
  chatMessages: ChatMessage[],
  convHistory: ConversationMessage[],
  slotName?: string,
): boolean {
  if (!isBrowser) return false;
  try {
    const data: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      slotName: slotName || `저장 ${slotIndex + 1}`,
      worldState,
      chatMessages: chatMessages.slice(-50),
      convHistory: convHistory.slice(-20),
      metadata: getPlayerInfo(worldState),
    };
    localStorage.setItem(
      `${SAVE_KEY_PREFIX}${slotIndex}`,
      JSON.stringify(data),
    );
    return true;
  } catch (e) {
    console.error("Save failed:", e);
    return false;
  }
}

export function loadGame(slotIndex: number): SaveData | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slotIndex}`);
    if (!raw) return null;
    const data: SaveData = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) {
      console.warn("Save version mismatch, attempting migration...");
    }
    return data;
  } catch (e) {
    console.error("Load failed:", e);
    return null;
  }
}

export function autoSave(
  worldState: WorldState,
  chatMessages: ChatMessage[],
  convHistory: ConversationMessage[],
): boolean {
  if (!isBrowser) return false;
  try {
    const data: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      slotName: "자동 저장",
      worldState,
      chatMessages: chatMessages.slice(-50),
      convHistory: convHistory.slice(-20),
      metadata: getPlayerInfo(worldState),
    };
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Auto-save failed:", e);
    return false;
  }
}

export function loadAutoSave(): SaveData | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(AUTO_SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Load auto-save failed:", e);
    return null;
  }
}

export function deleteSave(slotIndex: number): void {
  if (!isBrowser) return;
  localStorage.removeItem(`${SAVE_KEY_PREFIX}${slotIndex}`);
}

export interface SaveSlotInfo {
  index: number;
  name: string;
  timestamp: number;
  turnCount: number;
  playerFactionName: string;
  playerCityCount: number;
  isEmpty: boolean;
}

export function listSaveSlots(): SaveSlotInfo[] {
  if (!isBrowser) return [];
  const slots: SaveSlotInfo[] = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${i}`);
    if (raw) {
      try {
        const data: SaveData = JSON.parse(raw);
        slots.push({
          index: i,
          name: data.slotName,
          timestamp: data.timestamp,
          turnCount: data.metadata.turnCount,
          playerFactionName: data.metadata.playerFactionName,
          playerCityCount: data.metadata.playerCityCount,
          isEmpty: false,
        });
      } catch {
        slots.push({ index: i, name: `슬롯 ${i + 1}`, timestamp: 0, turnCount: 0, playerFactionName: "", playerCityCount: 0, isEmpty: true });
      }
    } else {
      slots.push({ index: i, name: `슬롯 ${i + 1}`, timestamp: 0, turnCount: 0, playerFactionName: "", playerCityCount: 0, isEmpty: true });
    }
  }
  return slots;
}

export function hasAnySave(): boolean {
  if (!isBrowser) return false;
  for (let i = 0; i < MAX_SLOTS; i++) {
    if (localStorage.getItem(`${SAVE_KEY_PREFIX}${i}`)) return true;
  }
  return !!localStorage.getItem(AUTO_SAVE_KEY);
}
