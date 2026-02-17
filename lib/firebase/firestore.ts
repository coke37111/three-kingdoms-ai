import { doc, setDoc, getDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "./config";
import type { SaveData } from "@/types/game";
import type { SaveSlotInfo } from "@/lib/game/saveSystem";
import type { LLMProvider } from "@/types/chat";

export interface UserPreferences {
  llmProvider: LLMProvider;
}

function savesCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "saves");
}

function saveDoc(uid: string, slotKey: string) {
  return doc(getFirebaseDb(), "users", uid, "saves", slotKey);
}

export async function cloudSaveGame(uid: string, slotIndex: number, data: SaveData): Promise<boolean> {
  try {
    await setDoc(saveDoc(uid, `slot_${slotIndex}`), data);
    return true;
  } catch (e) {
    console.error("Cloud save failed:", e);
    return false;
  }
}

export async function cloudLoadGame(uid: string, slotIndex: number): Promise<SaveData | null> {
  try {
    const snap = await getDoc(saveDoc(uid, `slot_${slotIndex}`));
    return snap.exists() ? (snap.data() as SaveData) : null;
  } catch (e) {
    console.error("Cloud load failed:", e);
    return null;
  }
}

export async function cloudAutoSave(uid: string, data: SaveData): Promise<boolean> {
  try {
    await setDoc(saveDoc(uid, "autosave"), data);
    return true;
  } catch (e) {
    console.error("Cloud auto-save failed:", e);
    return false;
  }
}

export async function cloudLoadAutoSave(uid: string): Promise<SaveData | null> {
  try {
    const snap = await getDoc(saveDoc(uid, "autosave"));
    return snap.exists() ? (snap.data() as SaveData) : null;
  } catch (e) {
    console.error("Cloud load auto-save failed:", e);
    return null;
  }
}

export async function cloudDeleteSave(uid: string, slotIndex: number): Promise<void> {
  try {
    await deleteDoc(saveDoc(uid, `slot_${slotIndex}`));
  } catch (e) {
    console.error("Cloud delete failed:", e);
  }
}

export async function cloudListSaveSlots(uid: string): Promise<SaveSlotInfo[]> {
  try {
    const snap = await getDocs(savesCollection(uid));
    const slots: SaveSlotInfo[] = [];

    for (let i = 0; i < 5; i++) {
      const docSnap = snap.docs.find((d) => d.id === `slot_${i}`);
      if (docSnap) {
        const data = docSnap.data() as SaveData;
        slots.push({
          index: i,
          name: data.slotName,
          timestamp: data.timestamp,
          turnCount: data.metadata.turnCount,
          playerFactionName: data.metadata.playerFactionName,
          playerCastleCount: data.metadata.playerCastleCount,
          isEmpty: false,
        });
      } else {
        slots.push({
          index: i,
          name: `슬롯 ${i + 1}`,
          timestamp: 0,
          turnCount: 0,
          playerFactionName: "",
          playerCastleCount: 0,
          isEmpty: true,
        });
      }
    }
    return slots;
  } catch (e) {
    console.error("Cloud list saves failed:", e);
    return [];
  }
}

export async function cloudHasAutoSave(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(saveDoc(uid, "autosave"));
    return snap.exists();
  } catch (e) {
    console.error("Cloud check autosave failed:", e);
    return false;
  }
}

export async function cloudHasAnySave(uid: string): Promise<boolean> {
  try {
    const snap = await getDocs(savesCollection(uid));
    return !snap.empty;
  } catch (e) {
    console.error("Cloud check saves failed:", e);
    return false;
  }
}

// ---- 사용자 설정 (preferences) ----

function preferencesDoc(uid: string) {
  return doc(getFirebaseDb(), "users", uid, "settings", "preferences");
}

export async function loadUserPreferences(uid: string): Promise<UserPreferences | null> {
  try {
    const snap = await getDoc(preferencesDoc(uid));
    return snap.exists() ? (snap.data() as UserPreferences) : null;
  } catch (e) {
    console.error("Load preferences failed:", e);
    return null;
  }
}

export async function saveUserPreferences(uid: string, prefs: Partial<UserPreferences>): Promise<boolean> {
  try {
    await setDoc(preferencesDoc(uid), prefs, { merge: true });
    return true;
  } catch (e) {
    console.error("Save preferences failed:", e);
    return false;
  }
}
