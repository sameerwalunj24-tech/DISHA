import {
  getPendingSyncItems,
  getPathwayProgress,
  enqueueSyncItem,
  sanitizePayload,
  type SyncQueueItem
} from "../db/offlineStorage";

export interface OfflineSyncBundle {
  bundle_version: "1.0";
  exported_at: string;
  student_ref: string;
  outbox_items: Array<{
    id: string;
    type: SyncQueueItem["type"];
    payload: Record<string, any>;
    updated_at: string;
    client_id?: string;
    client_seq?: number;
  }>;
  milestones?: Array<{
    step_id: string;
    completed: boolean;
  }>;
}

/**
 * Extracts pending outbox actions and sanitized completed milestones for the specified student.
 * Returns a portable, lightweight JSON bundle containing bundle_version, exported_at, student_ref, outbox_items.
 */
export async function exportOfflineBundle(studentId: string): Promise<OfflineSyncBundle> {
  if (!studentId || typeof studentId !== "string") {
    throw new Error("INVALID_STUDENT_REF: A valid studentId string is required to export bundle.");
  }

  // 1. Get pending sync items
  let allPending: SyncQueueItem[] = [];
  try {
    allPending = await getPendingSyncItems();
  } catch (err) {
    try {
      allPending = JSON.parse(localStorage.getItem("disha_sync_outbox_items") || "[]");
    } catch {
      allPending = [];
    }
  }

  // 2. Filter actions relevant to this student
  const studentActions = allPending.filter((item) => {
    const p = item.payload || {};
    return (
      p.student_id === studentId ||
      p.student_name === studentId ||
      item.id === studentId ||
      (!p.student_id && allPending.length === 1)
    );
  });

  const selectedActions = studentActions.length > 0 ? studentActions : allPending.filter((i) => {
    const sId = i.payload?.student_id;
    return !sId || sId === studentId;
  });

  // 3. Extract sanitized milestones
  let milestones: Array<{ step_id: string; completed: boolean }> = [];
  try {
    const progress = await getPathwayProgress(studentId);
    if (progress && Array.isArray(progress.completed_step_ids)) {
      milestones = progress.completed_step_ids.map((id) => ({
        step_id: String(id),
        completed: true
      }));
    }
  } catch {
    try {
      const raw = localStorage.getItem(`disha_progress_${studentId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          milestones = parsed.map((id) => ({ step_id: String(id), completed: true }));
        }
      }
    } catch {}
  }

  const bundle: OfflineSyncBundle = {
    bundle_version: "1.0",
    exported_at: new Date().toISOString(),
    student_ref: studentId,
    outbox_items: selectedActions.map((item) => ({
      id: item.id,
      type: item.type,
      payload: sanitizePayload(item.payload),
      updated_at: item.updated_at,
      client_id: item.client_id || item.payload?.client_id,
      client_seq: item.client_seq || item.payload?.client_seq
    })),
    milestones
  };

  return bundle;
}

/**
 * Validates schema structure and ingests pending outbox items into the local queue
 * on the facilitator's device for batch upstream sync.
 */
export async function importOfflineBundle(
  bundleData: any
): Promise<{ imported_count: number; student_ref: string }> {
  if (!bundleData || typeof bundleData !== "object") {
    throw new Error("INVALID_BUNDLE_SCHEMA: Bundle payload must be a non-null object.");
  }

  if (bundleData.bundle_version !== "1.0") {
    throw new Error(
      `UNSUPPORTED_BUNDLE_VERSION: Expected bundle_version '1.0', got '${bundleData.bundle_version}'.`
    );
  }

  if (!bundleData.student_ref || typeof bundleData.student_ref !== "string") {
    throw new Error("INVALID_BUNDLE_SCHEMA: Missing or invalid 'student_ref' field.");
  }

  if (!Array.isArray(bundleData.outbox_items)) {
    throw new Error("INVALID_BUNDLE_SCHEMA: 'outbox_items' must be an array.");
  }

  let importedCount = 0;
  for (const item of bundleData.outbox_items) {
    if (!item.type || !item.payload) {
      continue;
    }

    const payload = sanitizePayload({
      ...item.payload,
      student_id: item.payload.student_id || bundleData.student_ref,
      client_id: item.client_id || item.payload.client_id,
      client_seq: item.client_seq || item.payload.client_seq
    });

    await enqueueSyncItem(item.type, payload);
    importedCount++;
  }

  return {
    imported_count: importedCount,
    student_ref: bundleData.student_ref
  };
}
