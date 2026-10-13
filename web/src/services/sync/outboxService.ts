import {
  getClientId,
  getNextClientSeq,
  enqueueSyncItem,
  getPendingSyncItems,
  getPendingSyncCount,
  type SyncQueueItem
} from "../db/offlineStorage";

export { getClientId, getNextClientSeq };

/**
 * Enqueues an outbox action with monotonic client-sequencing.
 * Guaranteed to attach client_id and incrementing client_seq for causal ordering.
 */
export async function enqueueAction(
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

  return await enqueueSyncItem(type, enrichedPayload);
}

export const outboxService = {
  getClientId,
  getNextClientSeq,
  enqueueAction,
  getPendingItems: getPendingSyncItems,
  getPendingCount: getPendingSyncCount
};
