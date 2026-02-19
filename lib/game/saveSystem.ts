import type { WorldState, SaveData } from "@/types/game";
import type { ChatMessage, ConversationMessage } from "@/types/chat";
import type { AdvisorState, CouncilMessage } from "@/types/council";
import {
  cloudSaveGame, cloudLoadGame, cloudAutoSave, cloudLoadAutoSave,
  cloudDeleteSave, cloudListSaveSlots, cloudHasAnySave, cloudHasAutoSave,
} from "@/lib/firebase/firestore";

const SAVE_VERSION = 3;

// ---- 채팅 로그 localStorage 헬퍼 ----
const CHAT_LOG_KEY = (slot: string) => `tk_chatlog_${slot}`;
const MAX_CHAT_LOG = 1000;

export function saveChatLog(slotKey: string, messages: CouncilMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_LOG_KEY(slotKey), JSON.stringify(messages.slice(-MAX_CHAT_LOG)));
  } catch { /* 용량 초과 시 무시 */ }
}

export function loadChatLog(slotKey: string): CouncilMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_LOG_KEY(slotKey));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function deleteChatLog(slotKey: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHAT_LOG_KEY(slotKey));
}

export interface SaveSlotInfo {
  index: number;
  name: string;
  timestamp: number;
  turnCount: number;
  playerFactionName: string;
  playerCastleCount: number;
  isEmpty: boolean;
}

function getPlayerInfo(world: WorldState) {
  const player = world.factions.find((f) => f.isPlayer);
  return {
    turnCount: world.currentTurn,
    playerFactionName: player?.rulerName ?? "유비",
    playerCastleCount: player?.castles.length ?? 0,
  };
}

function buildSaveData(
  worldState: WorldState,
  chatMessages: ChatMessage[],
  convHistory: ConversationMessage[],
  slotName: string,
  advisors?: AdvisorState[],
): SaveData {
  return {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    slotName,
    worldState,
    chatMessages: chatMessages.slice(-50),
    convHistory: convHistory.slice(-20),
    advisors,
    metadata: getPlayerInfo(worldState),
  };
}

export async function saveGame(
  slotIndex: number,
  worldState: WorldState,
  chatMessages: ChatMessage[],
  convHistory: ConversationMessage[],
  uid: string,
  slotName?: string,
  advisors?: AdvisorState[],
  councilMessages?: CouncilMessage[],
): Promise<boolean> {
  if (councilMessages) saveChatLog(slotIndex.toString(), councilMessages);
  const data = buildSaveData(worldState, chatMessages, convHistory, slotName || `저장 ${slotIndex + 1}`, advisors);
  return cloudSaveGame(uid, slotIndex, data);
}

export async function loadGame(slotIndex: number, uid: string): Promise<SaveData | null> {
  return cloudLoadGame(uid, slotIndex);
}

export async function autoSave(
  worldState: WorldState,
  chatMessages: ChatMessage[],
  convHistory: ConversationMessage[],
  uid: string,
  advisors?: AdvisorState[],
  councilMessages?: CouncilMessage[],
): Promise<boolean> {
  if (councilMessages) saveChatLog("auto", councilMessages);
  const data = buildSaveData(worldState, chatMessages, convHistory, "자동 저장", advisors);
  return cloudAutoSave(uid, data);
}

export async function loadAutoSave(uid: string): Promise<SaveData | null> {
  return cloudLoadAutoSave(uid);
}

export async function deleteSave(slotIndex: number, uid: string): Promise<void> {
  await cloudDeleteSave(uid, slotIndex);
}

export async function listSaveSlots(uid: string): Promise<SaveSlotInfo[]> {
  return cloudListSaveSlots(uid);
}

export async function hasAnySave(uid: string): Promise<boolean> {
  return cloudHasAnySave(uid);
}

export async function hasAutoSave(uid: string): Promise<boolean> {
  return cloudHasAutoSave(uid);
}
