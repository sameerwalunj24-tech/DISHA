// Disha IndexedDB Offline Storage for profiles & opportunity caching
const DB_NAME = "disha_offline_db";
const DB_VERSION = 4;
const STORE_PROFILES = "offline_profiles";
const STORE_MATCHES = "cached_matches";
const STORE_PATHWAYS = "cached_pathways";
const STORE_PATHWAY_PROGRESS = "pathway_progress";
export const STORE_SYNC_OUTBOX = "sync_outbox";

export interface SyncQueueItem {
  id: string; // uuid
  type: "offline_quiz_result" | "pathway_progress" | "discovery_answer" | "profile_save" | "recommendation" | "voice_note";
  payload: Record<string, any>;
  updated_at: string;
  attempts: number;
  status: "pending" | "synced" | "failed";
  client_id?: string;
  client_seq?: number;
}

export function getClientId(): string {
  if (typeof localStorage === "undefined") {
    return "client_fallback";
  }
  let id = localStorage.getItem("disha_client_id");
  if (!id) {
    id = `client_${generateUUID()}`;
    localStorage.setItem("disha_client_id", id);
  }
  return id;
}

export function getNextClientSeq(): number {
  if (typeof localStorage === "undefined") {
    return 1;
  }
  const raw = localStorage.getItem("disha_client_seq");
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (isNaN(current) ? 0 : current) + 1;
  localStorage.setItem("disha_client_seq", String(next));
  return next;
}

export interface OfflineProfileRecord {
  id: string;
  created_at: string;
  sync_status: "pending_sync" | "synced";
  profile_type: "offline_icon_quiz" | "voice_discovery";
  student_name: string;
  language: string;
  guardian_consent: boolean;
  consent_receipt_hash?: string | null;
  consent_version?: string | null;
  profile: {
    grade_level: number;
    state: string;
    district: string;
    primary_interests: string[];
    practical_skills: string[];
    career_aspirations: string[];
    is_vocational_recommended: boolean;
    mobility_preference: string;
    family_livelihood_context?: string;
  };
}

export interface PathwayProgressRecord {
  pathway_key: string;
  completed_step_ids: string[];
  sync_status: "pending_sync" | "synced";
  updated_at: string;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function sanitizePayload(raw: Record<string, any>): Record<string, any> {
  const sanitized = { ...raw };
  const sensitiveKeys = [
    "family_income", "social_category", "income", "caste",
    "annual_income", "category", "bank_account", "aadhaar"
  ];
  for (const k of sensitiveKeys) {
    delete sanitized[k];
  }
  if (sanitized.profile && typeof sanitized.profile === "object") {
    sanitized.profile = { ...sanitized.profile };
    for (const k of sensitiveKeys) {
      delete sanitized.profile[k];
    }
  }
  return sanitized;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB unavailable"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROFILES)) {
        db.createObjectStore(STORE_PROFILES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_MATCHES)) {
        db.createObjectStore(STORE_MATCHES, { keyPath: "cache_key" });
      }
      if (!db.objectStoreNames.contains(STORE_PATHWAYS)) {
        db.createObjectStore(STORE_PATHWAYS, { keyPath: "cache_key" });
      }
      if (!db.objectStoreNames.contains(STORE_PATHWAY_PROGRESS)) {
        db.createObjectStore(STORE_PATHWAY_PROGRESS, { keyPath: "pathway_key" });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_OUTBOX)) {
        const outboxStore = db.createObjectStore(STORE_SYNC_OUTBOX, { keyPath: "id" });
        outboxStore.createIndex("status", "status", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineProfile(record: OfflineProfileRecord): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROFILES, "readwrite");
      const store = tx.objectStore(STORE_PROFILES);
      const req = store.put(record);

      req.onsuccess = () => {
        try {
          localStorage.setItem(`disha_pending_profile_${record.id}`, JSON.stringify(record));
        } catch (e) {}
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Falling back to localStorage for profile:", err);
    localStorage.setItem(`disha_pending_profile_${record.id}`, JSON.stringify(record));
  }
}

export async function getOfflineProfiles(): Promise<OfflineProfileRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROFILES, "readonly");
      const store = tx.objectStore(STORE_PROFILES);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    const records: OfflineProfileRecord[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("disha_pending_profile_")) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || "");
          records.push(val);
        } catch (e) {}
      }
    }
    return records;
  }
}

export async function saveCachedMatches(matches: any[]): Promise<void> {
  const record = {
    cache_key: "latest_matches",
    updated_at: new Date().toISOString(),
    matches
  };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MATCHES, "readwrite");
      const store = tx.objectStore(STORE_MATCHES);
      const req = store.put(record);
      req.onsuccess = () => {
        try {
          localStorage.setItem("disha_cached_matches", JSON.stringify(matches));
        } catch (e) {}
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    localStorage.setItem("disha_cached_matches", JSON.stringify(matches));
  }
}

export async function getCachedMatches(): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MATCHES, "readonly");
      const store = tx.objectStore(STORE_MATCHES);
      const req = store.get("latest_matches");

      req.onsuccess = () => {
        if (req.result && req.result.matches) {
          resolve(req.result.matches);
        } else {
          const fallback = localStorage.getItem("disha_cached_matches");
          resolve(fallback ? JSON.parse(fallback) : []);
        }
      };
      req.onerror = () => {
        const fallback = localStorage.getItem("disha_cached_matches");
        resolve(fallback ? JSON.parse(fallback) : []);
      };
    });
  } catch (e) {
    const fallback = localStorage.getItem("disha_cached_matches");
    return fallback ? JSON.parse(fallback) : [];
  }
}

export async function saveCachedPathway(pathway: any, key: string = "latest_pathway"): Promise<void> {
  const record = {
    cache_key: key,
    updated_at: new Date().toISOString(),
    pathway
  };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PATHWAYS, "readwrite");
      const store = tx.objectStore(STORE_PATHWAYS);
      const req = store.put(record);
      req.onsuccess = () => {
        try {
          localStorage.setItem(`disha_cached_pathway_${key}`, JSON.stringify(pathway));
        } catch (e) {}
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    localStorage.setItem(`disha_cached_pathway_${key}`, JSON.stringify(pathway));
  }
}

export async function getCachedPathway(key: string = "latest_pathway"): Promise<any | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PATHWAYS, "readonly");
      const store = tx.objectStore(STORE_PATHWAYS);
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result && req.result.pathway) {
          resolve(req.result.pathway);
        } else {
          const fallback = localStorage.getItem(`disha_cached_pathway_${key}`);
          resolve(fallback ? JSON.parse(fallback) : null);
        }
      };
      req.onerror = () => {
        const fallback = localStorage.getItem(`disha_cached_pathway_${key}`);
        resolve(fallback ? JSON.parse(fallback) : null);
      };
    });
  } catch (e) {
    const fallback = localStorage.getItem(`disha_cached_pathway_${key}`);
    return fallback ? JSON.parse(fallback) : null;
  }
}

export async function savePathwayProgress(record: PathwayProgressRecord): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PATHWAY_PROGRESS, "readwrite");
      const store = tx.objectStore(STORE_PATHWAY_PROGRESS);
      const req = store.put(record);
      req.onsuccess = () => {
        try {
          localStorage.setItem(`disha_progress_${record.pathway_key}`, JSON.stringify(record));
        } catch (e) {}
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    localStorage.setItem(`disha_progress_${record.pathway_key}`, JSON.stringify(record));
  }
}

export async function getPathwayProgress(key: string = "current_student"): Promise<PathwayProgressRecord | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PATHWAY_PROGRESS, "readonly");
      const store = tx.objectStore(STORE_PATHWAY_PROGRESS);
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result);
        } else {
          const fallback = localStorage.getItem(`disha_progress_${key}`);
          resolve(fallback ? JSON.parse(fallback) : null);
        }
      };
      req.onerror = () => {
        const fallback = localStorage.getItem(`disha_progress_${key}`);
        resolve(fallback ? JSON.parse(fallback) : null);
      };
    });
  } catch (e) {
    const fallback = localStorage.getItem(`disha_progress_${key}`);
    return fallback ? JSON.parse(fallback) : null;
  }
}

// ==========================================
// PHASE 5: OUTBOX SYNC QUEUE OPERATIONS
// ==========================================

function getLocalAllItems(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem("disha_sync_outbox_items");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getLocalPendingItems(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem("disha_sync_outbox_items");
    if (!raw) return [];
    const items: SyncQueueItem[] = JSON.parse(raw);
    return items.filter((i) => i.status === "pending");
  } catch {
    return [];
  }
}

export async function enqueueSyncItem(
  type: SyncQueueItem["type"],
  payload: Record<string, any>
): Promise<SyncQueueItem> {
  const client_id = payload.client_id || getClientId();
  const client_seq = payload.client_seq !== undefined ? payload.client_seq : getNextClientSeq();

  const enrichedPayload = {
    ...payload,
    client_id,
    client_seq
  };

  const item: SyncQueueItem = {
    id: generateUUID(),
    type,
    client_id,
    client_seq,
    payload: sanitizePayload(enrichedPayload),
    updated_at: new Date().toISOString(),
    attempts: 0,
    status: "pending"
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_OUTBOX, "readwrite");
      const store = tx.objectStore(STORE_SYNC_OUTBOX);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("[SyncQueue] IndexedDB write failed, falling back to localStorage", e);
  }

  // Always mirror to localStorage so outbox survives even if IndexedDB is cleared
  try {
    const existingStr = localStorage.getItem("disha_sync_outbox_items") || "[]";
    const items: SyncQueueItem[] = JSON.parse(existingStr);
    items.push(item);
    localStorage.setItem("disha_sync_outbox_items", JSON.stringify(items));
  } catch (err) {}

  // Dispatch event for UI reactivity
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("disha_sync_outbox_changed", { detail: { item } }));
  }

  return item;
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SYNC_OUTBOX, "readonly");
      const store = tx.objectStore(STORE_SYNC_OUTBOX);
      const req = store.getAll();
      req.onsuccess = () => {
        const all: SyncQueueItem[] = req.result || [];
        const pending = all.filter((i) => i.status === "pending");
        resolve(pending);
      };
      req.onerror = () => {
        resolve(getLocalPendingItems());
      };
    });
  } catch {
    return getLocalPendingItems();
  }
}

export async function getAllSyncItems(): Promise<SyncQueueItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SYNC_OUTBOX, "readonly");
      const store = tx.objectStore(STORE_SYNC_OUTBOX);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve(getLocalAllItems());
    });
  } catch {
    return getLocalAllItems();
  }
}

export async function getPendingSyncCount(): Promise<number> {
  const pending = await getPendingSyncItems();
  return pending.length;
}

export async function updateSyncItemsStatus(
  updates: Array<{ id: string; status: "pending" | "synced" | "failed"; attempts?: number }>
): Promise<void> {
  const updateMap = new Map(updates.map((u) => [u.id, u]));

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_OUTBOX, "readwrite");
      const store = tx.objectStore(STORE_SYNC_OUTBOX);
      const getAllReq = store.getAll();

      getAllReq.onsuccess = () => {
        const items: SyncQueueItem[] = getAllReq.result || [];
        for (const item of items) {
          const upd = updateMap.get(item.id);
          if (upd) {
            item.status = upd.status;
            if (upd.attempts !== undefined) {
              item.attempts = upd.attempts;
            }
            store.put(item);
          }
        }
        resolve();
      };
      getAllReq.onerror = () => reject(getAllReq.error);
    });
  } catch (e) {
    console.warn("[SyncQueue] Error updating status in IndexedDB:", e);
  }

  // Mirror to localStorage
  try {
    const raw = localStorage.getItem("disha_sync_outbox_items");
    if (raw) {
      const items: SyncQueueItem[] = JSON.parse(raw);
      for (const item of items) {
        const upd = updateMap.get(item.id);
        if (upd) {
          item.status = upd.status;
          if (upd.attempts !== undefined) item.attempts = upd.attempts;
        }
      }
      localStorage.setItem("disha_sync_outbox_items", JSON.stringify(items));
    }
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("disha_sync_outbox_changed", { detail: { updates } }));
  }
}

/**
 * Clears the previous student's cached profile, matches, and pathway from browser storage
 * (both IndexedDB and localStorage) during shared-device mode transitions,
 * strictly preserving the outbox queue and facilitator credentials.
 */
export async function clearStudentBrowserSession(_studentId?: string | null): Promise<void> {
  // 1. Clear IndexedDB stores for learner profile, matches, pathways, progress
  try {
    const db = await openDB();
    const storesToClear = [STORE_PROFILES, STORE_MATCHES, STORE_PATHWAYS, STORE_PATHWAY_PROGRESS];
    for (const storeName of storesToClear) {
      if (db.objectStoreNames.contains(storeName)) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, "readwrite");
          const store = tx.objectStore(storeName);
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    }
  } catch (err) {
    console.warn("[Storage] IndexedDB session clear fallback:", err);
  }

  // 2. Clear localStorage keys associated with the student session
  try {
    localStorage.removeItem("disha_student_id");
    localStorage.removeItem("disha_student_nickname");
    localStorage.removeItem("disha_student_profile");
    localStorage.removeItem("disha_top_match");
    localStorage.removeItem("disha_consent_receipt");
    localStorage.removeItem("disha_consent_canonical");
    localStorage.removeItem("disha_guardian_consent");
    localStorage.removeItem("disha_guardian_name");
    localStorage.removeItem("disha_joined_cohort");
    localStorage.removeItem("disha_cached_matches");

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (
        k.startsWith("disha_cached_pathway_") ||
        k.startsWith("disha_progress_") ||
        k.startsWith("disha_pending_profile_") ||
        k.startsWith("disha_recs_")
      )) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch (err) {
    console.warn("[Storage] localStorage session clear error:", err);
  }
}

export const clearStudentSession = clearStudentBrowserSession;




