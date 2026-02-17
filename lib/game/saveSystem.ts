import type { WorldState, SaveData } from "@/types/game";
import type { ChatMessage, ConversationMessage } from "@/types/chat";
import type { AdvisorState } from "@/types/council";
import {
  cloudSaveGame, cloudLoadGame, cloudAutoSave, cloudLoadAutoSave,
  cloudDeleteSave, cloudListSaveSlots, cloudHasAnySave, cloudHasAutoSave,
} from "@/lib/firebase/firestore";

const SAVE_VERSION = 2;

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
): Promise<boolean> {
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
): Promise<boolean> {
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
