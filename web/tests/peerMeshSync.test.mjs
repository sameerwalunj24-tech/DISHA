import test, { describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Payload sanitizer replica matching offlineStorage.ts
 */
function sanitizePayload(raw) {
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

/**
 * P2P Offline Mesh Sync logic replica matching peerMeshSync.ts
 */
function exportOfflineBundle(studentId, pendingItems, milestones = []) {
  if (!studentId || typeof studentId !== "string") {
    throw new Error("INVALID_STUDENT_REF: A valid studentId string is required to export bundle.");
  }

  const studentActions = pendingItems.filter((item) => {
    const p = item.payload || {};
    return (
      p.student_id === studentId ||
      p.student_name === studentId ||
      item.id === studentId ||
      (!p.student_id && pendingItems.length === 1)
    );
  });

  const selectedActions = studentActions.length > 0 ? studentActions : pendingItems.filter((i) => {
    const sId = i.payload?.student_id;
    return !sId || sId === studentId;
  });

  return {
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
    milestones: milestones.map((m) => ({
      step_id: String(m.step_id),
      completed: Boolean(m.completed)
    }))
  };
}

function importOfflineBundle(bundleData, localQueue) {
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

    const enqueuedItem = {
      id: item.id || `uuid-${Math.random().toString(36).slice(2, 10)}`,
      type: item.type,
      client_id: payload.client_id,
      client_seq: payload.client_seq,
      payload,
      updated_at: item.updated_at || new Date().toISOString(),
      attempts: 0,
      status: "pending"
    };

    localQueue.push(enqueuedItem);
    importedCount++;
  }

  return {
    imported_count: importedCount,
    student_ref: bundleData.student_ref
  };
}

describe("P2P Offline Peer Bundle Importer/Exporter", () => {
  test("1. exportOfflineBundle creates valid lightweight JSON bundle format", () => {
    const studentId = "std_mesh_001";
    const pendingItems = [
      {
        id: "act_1",
        type: "offline_quiz_result",
        client_id: "client_device_10",
        client_seq: 1,
        payload: {
          student_id: studentId,
          student_name: "अनिकेत शिंदे",
          family_income: 90000, // sensitive - should be stripped
          caste: "General",       // sensitive - should be stripped
          answers: { 1: "solar" }
        },
        updated_at: "2026-10-13T10:00:00Z"
      },
      {
        id: "act_2",
        type: "pathway_progress",
        client_id: "client_device_10",
        client_seq: 2,
        payload: {
          student_id: studentId,
          completed_step_ids: ["step_1"]
        },
        updated_at: "2026-10-13T10:05:00Z"
      },
      {
        id: "act_other_student",
        type: "pathway_progress",
        client_id: "client_device_10",
        client_seq: 3,
        payload: {
          student_id: "other_student_999",
          completed_step_ids: ["step_1"]
        },
        updated_at: "2026-10-13T10:06:00Z"
      }
    ];

    const milestones = [
      { step_id: "step_1", completed: true }
    ];

    const bundle = exportOfflineBundle(studentId, pendingItems, milestones);

    // Verify bundle envelope
    assert.equal(bundle.bundle_version, "1.0");
    assert.equal(bundle.student_ref, studentId);
    assert.ok(bundle.exported_at);
    assert.equal(bundle.outbox_items.length, 2, "Should only extract items for target student");

    // Verify sanitization: sensitive fields stripped
    assert.equal(bundle.outbox_items[0].payload.family_income, undefined);
    assert.equal(bundle.outbox_items[0].payload.caste, undefined);
    assert.equal(bundle.outbox_items[0].payload.student_name, "अनिकेत शिंदे");

    // Verify monotonic sequencing intact
    assert.equal(bundle.outbox_items[0].client_id, "client_device_10");
    assert.equal(bundle.outbox_items[0].client_seq, 1);
    assert.equal(bundle.outbox_items[1].client_seq, 2);

    // Verify milestones
    assert.equal(bundle.milestones.length, 1);
    assert.equal(bundle.milestones[0].step_id, "step_1");
  });

  test("2. exportOfflineBundle rejects invalid or empty studentId", () => {
    assert.throws(() => exportOfflineBundle("", []), /INVALID_STUDENT_REF/);
    assert.throws(() => exportOfflineBundle(null, []), /INVALID_STUDENT_REF/);
  });

  test("3. importOfflineBundle validates bundle schema and version", () => {
    const queue = [];

    assert.throws(
      () => importOfflineBundle(null, queue),
      /INVALID_BUNDLE_SCHEMA/
    );

    assert.throws(
      () => importOfflineBundle({ bundle_version: "2.0", student_ref: "s1", outbox_items: [] }, queue),
      /UNSUPPORTED_BUNDLE_VERSION/
    );

    assert.throws(
      () => importOfflineBundle({ bundle_version: "1.0", outbox_items: [] }, queue),
      /INVALID_BUNDLE_SCHEMA/
    );

    assert.throws(
      () => importOfflineBundle({ bundle_version: "1.0", student_ref: "s1", outbox_items: "not_an_array" }, queue),
      /INVALID_BUNDLE_SCHEMA/
    );
  });

  test("4. Round-trip P2P peer bundle export and import across facilitator devices", () => {
    const studentId = "std_mesh_roundtrip";
    const peerItems = [
      {
        id: "p2p_act_1",
        type: "offline_quiz_result",
        client_id: "student_phone_A",
        client_seq: 1,
        payload: {
          student_id: studentId,
          student_name: "स्नेहा गायकवाड",
          guardian_consent: true,
          answers: { 1: "healthcare" }
        },
        updated_at: "2026-10-13T11:00:00Z"
      },
      {
        id: "p2p_act_2",
        type: "pathway_progress",
        client_id: "student_phone_A",
        client_seq: 2,
        payload: {
          student_id: studentId,
          completed_step_ids: ["step_1", "step_2"]
        },
        updated_at: "2026-10-13T11:15:00Z"
      }
    ];

    // Peer 1 exports bundle
    const exportedBundle = exportOfflineBundle(studentId, peerItems, [{ step_id: "step_1", completed: true }]);
    assert.equal(exportedBundle.outbox_items.length, 2);

    // Peer 2 (Facilitator) receives and imports bundle into their local outbox
    const facilitatorLocalQueue = [];
    const importResult = importOfflineBundle(exportedBundle, facilitatorLocalQueue);

    assert.equal(importResult.imported_count, 2);
    assert.equal(importResult.student_ref, studentId);
    assert.equal(facilitatorLocalQueue.length, 2);

    // Verify imported items have status pending and retain client sequence
    assert.equal(facilitatorLocalQueue[0].status, "pending");
    assert.equal(facilitatorLocalQueue[0].client_id, "student_phone_A");
    assert.equal(facilitatorLocalQueue[0].client_seq, 1);
    assert.equal(facilitatorLocalQueue[1].client_seq, 2);
  });
});
