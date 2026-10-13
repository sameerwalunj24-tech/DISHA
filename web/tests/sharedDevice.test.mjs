import test, { describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Mock localStorage implementation simulating browser storage with full key enumeration
 */
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, val) {
    this.store.set(key, String(val));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  key(index) {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }
  get length() {
    return this.store.size;
  }
}

/**
 * Shared-device Next Student cache wipe matching offlineStorage.ts clearStudentBrowserSession()
 */
function clearStudentSession(storage) {
  // Wipe individual student session keys
  const directKeys = [
    "disha_student_id",
    "disha_student_nickname",
    "disha_student_profile",
    "disha_top_match",
    "disha_consent_receipt",
    "disha_consent_canonical",
    "disha_guardian_consent",
    "disha_guardian_name",
    "disha_joined_cohort",
    "disha_cached_matches"
  ];
  for (const k of directKeys) {
    storage.removeItem(k);
  }

  // Wipe wildcard prefixes
  const keysToRemove = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
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
    storage.removeItem(k);
  }
}

describe("Shared-Device Session Isolation & 'Next Student' Protocol", () => {
  const storage = new MockStorage();

  test("1. Student A discovery, milestone progress, and consent receipt are recorded", () => {
    // Facilitator shared session state
    storage.setItem("disha_facilitator_token", "jwt_fac_token_secure_999");
    storage.setItem("disha_shared_device_cohort", JSON.stringify({ id: "cohort_satara_10a", name: "10th Class A" }));
    storage.setItem("disha_client_id", "client_tablet_satara_01");
    storage.setItem("disha_client_seq", "5");

    // Student A session state
    const studentAId = "std_a_987654";
    storage.setItem("disha_student_id", studentAId);
    storage.setItem("disha_student_nickname", "रोहन माने (Rohan M.)");
    storage.setItem("disha_student_profile", JSON.stringify({
      grade_level: 10,
      district: "Satara",
      primary_interests: ["solar", "electrical"]
    }));
    storage.setItem("disha_top_match", JSON.stringify({
      id: "opp_solar_surya_mitra",
      title: "Surya Mitra Solar Technician"
    }));
    storage.setItem("disha_cached_matches", JSON.stringify([
      { id: "opp_solar_surya_mitra", title: "Surya Mitra Solar Technician" }
    ]));
    storage.setItem("disha_consent_receipt", "disha_rcpt_0123456789abcdef");
    storage.setItem("disha_consent_canonical", "सुनीता माने|DPDP_V1.0|2026-10-13T10:00:00.000Z");
    storage.setItem("disha_guardian_consent", "true");
    storage.setItem("disha_guardian_name", "सुनीता माने");
    storage.setItem("disha_joined_cohort", JSON.stringify({ id: "cohort_satara_10a" }));

    // Cached pathway & progress
    storage.setItem("disha_cached_pathway_solar", JSON.stringify({ title: "Solar Micro Pathway", steps: [1, 2, 3] }));
    storage.setItem("disha_progress_solar", JSON.stringify(["step_1", "step_2"]));
    storage.setItem(`disha_pending_profile_${studentAId}`, JSON.stringify({ grade: 10 }));
    storage.setItem(`disha_recs_${studentAId}`, JSON.stringify([{ id: "rec_1", title: "Solar Diploma" }]));

    // Device outbox queue with Student A's discovery action
    const outboxItem = {
      id: "sync_action_001",
      type: "offline_quiz_result",
      client_id: "client_tablet_satara_01",
      client_seq: 5,
      payload: { student_id: studentAId, student_name: "रोहन माने" }
    };
    storage.setItem("disha_sync_outbox_items", JSON.stringify([outboxItem]));

    assert.equal(storage.getItem("disha_student_id"), studentAId);
    assert.equal(storage.getItem("disha_student_nickname"), "रोहन माने (Rohan M.)");
    assert.ok(storage.getItem("disha_consent_receipt"));
    assert.ok(storage.getItem("disha_cached_pathway_solar"));
  });

  test("2. 'Next Student' reset triggers clearStudentSession() cache wipe", () => {
    clearStudentSession(storage);

    // 1. Assert student identity and profile keys are completely wiped
    assert.equal(storage.getItem("disha_student_id"), null);
    assert.equal(storage.getItem("disha_student_nickname"), null);
    assert.equal(storage.getItem("disha_student_profile"), null);
    assert.equal(storage.getItem("disha_top_match"), null);
    assert.equal(storage.getItem("disha_cached_matches"), null);

    // 2. Assert DPDP consent receipts and guardian details are completely wiped
    assert.equal(storage.getItem("disha_consent_receipt"), null);
    assert.equal(storage.getItem("disha_consent_canonical"), null);
    assert.equal(storage.getItem("disha_guardian_consent"), null);
    assert.equal(storage.getItem("disha_guardian_name"), null);
    assert.equal(storage.getItem("disha_joined_cohort"), null);

    // 3. Assert pathway states and progress records are completely wiped
    assert.equal(storage.getItem("disha_cached_pathway_solar"), null);
    assert.equal(storage.getItem("disha_progress_solar"), null);
    assert.equal(storage.getItem("disha_pending_profile_std_a_987654"), null);
    assert.equal(storage.getItem("disha_recs_std_a_987654"), null);

    // 4. Assert facilitator token, cohort metadata, and device sync outbox are strictly preserved
    assert.equal(storage.getItem("disha_facilitator_token"), "jwt_fac_token_secure_999");
    const preservedCohort = JSON.parse(storage.getItem("disha_shared_device_cohort"));
    assert.equal(preservedCohort.id, "cohort_satara_10a");
    assert.equal(storage.getItem("disha_client_id"), "client_tablet_satara_01");
    assert.equal(storage.getItem("disha_client_seq"), "5");

    const preservedOutbox = JSON.parse(storage.getItem("disha_sync_outbox_items"));
    assert.equal(preservedOutbox.length, 1);
    assert.equal(preservedOutbox[0].id, "sync_action_001");
  });

  test("3. Student B immediately onboards with a clean slate without leakage", () => {
    // Assert clean slate verification
    assert.equal(storage.getItem("disha_student_id"), null);
    assert.equal(storage.getItem("disha_student_nickname"), null);
    assert.equal(storage.getItem("disha_top_match"), null);
    assert.equal(storage.getItem("disha_consent_receipt"), null);

    // Student B completes their own independent onboarding
    const studentBId = "std_b_112233";
    storage.setItem("disha_student_id", studentBId);
    storage.setItem("disha_student_nickname", "पूजा कदम (Pooja K.)");
    storage.setItem("disha_student_profile", JSON.stringify({
      grade_level: 10,
      district: "Satara",
      primary_interests: ["nursing", "healthcare"]
    }));
    storage.setItem("disha_top_match", JSON.stringify({
      id: "opp_gnm_nursing",
      title: "General Nursing & Midwifery (GNM)"
    }));
    storage.setItem("disha_consent_receipt", "disha_rcpt_fedcba9876543210");
    storage.setItem("disha_consent_canonical", "दीपक कदम|DPDP_V1.0|2026-10-13T10:15:00.000Z");
    storage.setItem("disha_guardian_consent", "true");
    storage.setItem("disha_guardian_name", "दीपक कदम");

    // Verify Student B context has zero leakage from Student A
    assert.equal(storage.getItem("disha_student_id"), "std_b_112233");
    assert.equal(storage.getItem("disha_student_nickname"), "पूजा कदम (Pooja K.)");
    assert.equal(storage.getItem("disha_guardian_name"), "दीपक कदम");
    assert.notEqual(storage.getItem("disha_consent_receipt"), "disha_rcpt_0123456789abcdef");

    const topMatch = JSON.parse(storage.getItem("disha_top_match"));
    assert.equal(topMatch.id, "opp_gnm_nursing");
    assert.notEqual(topMatch.id, "opp_solar_surya_mitra");
  });
});
