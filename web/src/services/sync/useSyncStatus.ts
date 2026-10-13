import { useState, useEffect } from "react";
import { syncService, type SyncState } from "./syncService";

export function useSyncStatus(): SyncState & {
  triggerSync: () => Promise<void>;
  toggleDemoOffline: () => boolean;
} {
  const [state, setState] = useState<SyncState>(() => syncService.getState());

  useEffect(() => {
    syncService.init();
    const unsubscribe = syncService.subscribe((next) => {
      setState(next);
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    triggerSync: () => syncService.triggerSync(),
    toggleDemoOffline: () => syncService.toggleDemoOffline()
  };
}
