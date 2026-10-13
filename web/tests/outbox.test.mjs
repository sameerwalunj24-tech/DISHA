import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Mock localStorage to simulate browser storage across reloads
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, val) {
    this.store[key] = String(val);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

// Outbox logic replica matching offlineStorage.ts
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

function enqueue(storage, type, payload) {
  const item = {
    id: `uuid-${Math.random().toString(36).slice(2, 10)}`,
    type,
    payload: sanitizePayload(payload),
    updated_at: new Date().toISOString(),
    attempts: 0,
    status: "pending"
  };
  const list = JSON.parse(storage.getItem("disha_sync_outbox_items") || "[]");
  list.push(item);
  storage.setItem("disha_sync_outbox_items", JSON.stringify(list));
  return item;
}

function getPending(storage) {
  const list = JSON.parse(storage.getItem("disha_sync_outbox_items") || "[]");
  return list.filter((i) => i.status === "pending");
}

function markSynced(storage, ids) {
  const list = JSON.parse(storage.getItem("disha_sync_outbox_items") || "[]");
  const idSet = new Set(ids);
  for (const item of list) {
    if (idSet.has(item.id)) {
      item.status = "synced";
    }
  }
  storage.setItem("disha_sync_outbox_items", JSON.stringify(list));
}

describe("Phase 5 Frontend Sync Outbox", () => {
  const persistentStorage = new MockStorage();

  test("1. Enqueue strips sensitive fields (income, caste category)", () => {
    const item = enqueue(persistentStorage, "offline_quiz_result", {
      student_name: "आनंद गवळी",
      family_income: 120000,
      social_category: "SC",
      caste: "Chamar",
      income: 120000,
      grade_level: 10,
      guardian_consent: true,
      profile: {
        district: "Satara",
        family_income: 120000,
        primary_interests: ["solar"]
      }
    });

    assert.equal(item.status, "pending");
    assert.equal(item.payload.student_name, "आनंद गवळी");
    assert.equal(item.payload.family_income, undefined);
    assert.equal(item.payload.social_category, undefined);
    assert.equal(item.payload.caste, undefined);
    assert.equal(item.payload.income, undefined);
    assert.equal(item.payload.profile.family_income, undefined);
    assert.equal(item.payload.profile.district, "Satara");
  });

  test("2. Outbox queues 3 pathway progress ticks following the quiz", () => {
    enqueue(persistentStorage, "pathway_progress", { step_id: "step_1", completed_step_ids: ["step_1"] });
    enqueue(persistentStorage, "pathway_progress", { step_id: "step_2", completed_step_ids: ["step_1", "step_2"] });
    enqueue(persistentStorage, "pathway_progress", { step_id: "step_3", completed_step_ids: ["step_1", "step_2", "step_3"] });

    const pending = getPending(persistentStorage);
    assert.equal(pending.length, 4, "Should have 1 quiz + 3 step ticks = 4 pending items");
  });

  test("3. Outbox survives simulated page reload / session restart", () => {
    // Simulate completely new session reading from existing persistent storage
    const reloadedPending = getPending(persistentStorage);
    assert.equal(reloadedPending.length, 4, "Outbox survives reload with all 4 items intact");
    assert.equal(reloadedPending[0].type, "offline_quiz_result");
    assert.equal(reloadedPending[1].type, "pathway_progress");
    assert.equal(reloadedPending[2].type, "pathway_progress");
    assert.equal(reloadedPending[3].type, "pathway_progress");
  });

  test("4. Marking synced transitions outbox and pending count reaches 0", () => {
    const allPending = getPending(persistentStorage);
    const ids = allPending.map((i) => i.id);
    markSynced(persistentStorage, ids);

    const remainingPending = getPending(persistentStorage);
    assert.equal(remainingPending.length, 0, "All items marked synced, 0 pending");
  });
});
