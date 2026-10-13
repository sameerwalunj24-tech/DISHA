// Disha IndexedDB Offline Storage for profiles & quiz sync queue
const DB_NAME = "disha_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "offline_profiles";

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

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB unavailable"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
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
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => {
        console.log("[IndexedDB] Successfully saved offline profile:", record.id);
        // Also keep a copy in localStorage for backup redundancy
        try {
          localStorage.setItem(`disha_pending_profile_${record.id}`, JSON.stringify(record));
        } catch (e) {
          // ignore localStorage overflow
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Falling back to localStorage:", err);
    localStorage.setItem(`disha_pending_profile_${record.id}`, JSON.stringify(record));
  }
}

export async function getOfflineProfiles(): Promise<OfflineProfileRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Fallback: collect from localStorage
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
