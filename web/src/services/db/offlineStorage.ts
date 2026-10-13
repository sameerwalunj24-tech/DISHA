// Disha IndexedDB Offline Storage for profiles & opportunity caching
const DB_NAME = "disha_offline_db";
const DB_VERSION = 3;
const STORE_PROFILES = "offline_profiles";
const STORE_MATCHES = "cached_matches";
const STORE_PATHWAYS = "cached_pathways";
const STORE_PATHWAY_PROGRESS = "pathway_progress";

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

