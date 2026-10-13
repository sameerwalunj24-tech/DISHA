import {
  getPendingSyncItems,
  getPendingSyncCount,
  updateSyncItemsStatus
} from "../db/offlineStorage";

export interface SyncState {
  isOnline: boolean;
  isDemoOffline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastError: string | null;
}

type SyncStateListener = (state: SyncState) => void;

class SyncService {
  private isDemoOffline: boolean = false;
  private isSyncing: boolean = false;
  private pendingCount: number = 0;
  private lastSyncTime: Date | null = null;
  private lastError: string | null = null;
  private backoffDelayMs: number = 2000;
  private retryTimer: number | null = null;
  private listeners: Set<SyncStateListener> = new Set();
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.isDemoOffline = localStorage.getItem("disha_demo_offline") === "true";
      } catch {
        this.isDemoOffline = false;
      }
    }
  }

  public init(): void {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    // Listen to native online/offline events
    window.addEventListener("online", () => this.handleNetworkChange());
    window.addEventListener("offline", () => this.handleNetworkChange());

    // Listen to outbox writes
    window.addEventListener("disha_sync_outbox_changed", () => {
      this.refreshCount().then(() => {
        if (this.getIsEffectiveOnline() && this.pendingCount > 0 && !this.isSyncing) {
          // Attempt sync promptly with slight debounce
          setTimeout(() => this.triggerSync(), 300);
        }
      });
    });

    // Initial check
    this.refreshCount().then(() => {
      if (this.getIsEffectiveOnline() && this.pendingCount > 0) {
        this.triggerSync();
      }
    });
  }

  public getIsEffectiveOnline(): boolean {
    if (this.isDemoOffline) return false;
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }

  public getState(): SyncState {
    return {
      isOnline: this.getIsEffectiveOnline(),
      isDemoOffline: this.isDemoOffline,
      pendingCount: this.pendingCount,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError
    };
  }

  public subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((fn) => fn(state));
  }

  private handleNetworkChange(): void {
    this.notify();
    if (this.getIsEffectiveOnline()) {
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      this.backoffDelayMs = 2000;
      this.triggerSync();
    }
  }

  public async refreshCount(): Promise<number> {
    try {
      this.pendingCount = await getPendingSyncCount();
    } catch {
      this.pendingCount = 0;
    }
    this.notify();
    return this.pendingCount;
  }

  /**
   * Toggles simulated offline demo mode (e.g. tap logo 5 times).
   * Returns current demo offline state.
   */
  public toggleDemoOffline(): boolean {
    this.isDemoOffline = !this.isDemoOffline;
    try {
      localStorage.setItem("disha_demo_offline", this.isDemoOffline ? "true" : "false");
    } catch {}

    this.notify();

    // If turned back to online, trigger sync immediately!
    if (!this.isDemoOffline && (typeof navigator !== "undefined" ? navigator.onLine : true)) {
      this.backoffDelayMs = 2000;
      setTimeout(() => this.triggerSync(), 100);
    }

    return this.isDemoOffline;
  }

  /**
   * Triggers batch sync against POST /api/v1/sync.
   * Never blocks UI; retries with backoff on failure.
   */
  public async triggerSync(): Promise<void> {
    if (this.isSyncing) return;
    if (!this.getIsEffectiveOnline()) return;

    const pendingItems = await getPendingSyncItems();
    if (pendingItems.length === 0) {
      this.pendingCount = 0;
      this.notify();
      return;
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: pendingItems })
      });

      if (!response.ok) {
        throw new Error(`Sync server responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      const results: Array<{ id: string; status: string; student_id?: string; message?: string }> = data.results || [];

      const statusUpdates: Array<{ id: string; status: "pending" | "synced" | "failed"; attempts?: number }> = [];

      for (const res of results) {
        const item = pendingItems.find((p) => p.id === res.id);
        const currentAttempts = (item?.attempts || 0) + 1;

        if (res.status === "synced" || res.status === "conflict_ignored") {
          statusUpdates.push({ id: res.id, status: "synced", attempts: currentAttempts });

          // If a student_id was created/returned, update local storage and notify app
          if (res.student_id) {
            try {
              localStorage.setItem("disha_student_id", res.student_id);
              window.dispatchEvent(
                new CustomEvent("disha_student_id_updated", { detail: { studentId: res.student_id } })
              );
            } catch {}
          }
        } else {
          // Failure for this specific item
          const newStatus = currentAttempts >= 5 ? "failed" : "pending";
          statusUpdates.push({ id: res.id, status: newStatus, attempts: currentAttempts });
        }
      }

      if (statusUpdates.length > 0) {
        await updateSyncItemsStatus(statusUpdates);
      }

      this.lastSyncTime = new Date();
      this.backoffDelayMs = 2000; // Reset backoff on success
      await this.refreshCount();
    } catch (err: any) {
      console.warn("[SyncService] Sync attempt failed:", err);
      this.lastError = err?.message || "Sync network error";

      // Increment attempts for items and schedule backoff retry
      const updates = pendingItems.map((p) => ({
        id: p.id,
        status: p.status,
        attempts: (p.attempts || 0) + 1
      }));
      await updateSyncItemsStatus(updates);

      this.scheduleRetry();
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (!this.getIsEffectiveOnline()) return;

    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.triggerSync();
    }, this.backoffDelayMs);

    // Exponential backoff capped at 30 seconds
    this.backoffDelayMs = Math.min(this.backoffDelayMs * 1.5, 30000);
  }
}

export const syncService = new SyncService();
