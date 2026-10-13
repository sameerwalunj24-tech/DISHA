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
  type: "offline_quiz_result" | "pathway_progress" | "discovery_answer" | "profile_save";
  payload: Record<string, any>;
  updated_at: string;
  attempts: number;
  status: "pending" | "synced" | "failed";
}

export interface OfflineProfileRecord {
  id: string;
  created_at: string;
  sync_status: "pending_sync" | "synced";
  profile_type: "offline_icon_quiz" | "voice_discovery";
  student_name: string;
  language: string;
  guardian_consent: boolean;
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

function sanitizePayload(raw: Record<string, any>): Record<string, any> {
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
  const item: SyncQueueItem = {
    id: generateUUID(),
    type,
    payload: sanitizePayload(payload),
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

