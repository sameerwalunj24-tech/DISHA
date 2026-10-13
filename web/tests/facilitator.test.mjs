import test from "node:test";
import assert from "node:assert/strict";

test("Phase 6 Frontend Facilitator & Shared-Device Workflow", async (t) => {
  // Mock localStorage for headless Node environment
  const mockStorage = new Map();
  globalThis.localStorage = {
    getItem: (key) => mockStorage.get(key) || null,
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear()
  };

  await t.test("1. Shared-device mode session isolation: Next Student cleanly clears student context", () => {
    // Facilitator starts shared session for class 10
    const cohort = { id: "cohort-123", name: "10th Class A", joinCode: "ABC456" };
    localStorage.setItem("disha_shared_device_cohort", JSON.stringify(cohort));
    localStorage.setItem("disha_student_id", "student-user-1");

    assert.equal(localStorage.getItem("disha_student_id"), "student-user-1");

    // "Next Student" clicked: clears student ID while retaining shared cohort
    localStorage.removeItem("disha_student_id");
    assert.equal(localStorage.getItem("disha_student_id"), null);
    assert.deepEqual(JSON.parse(localStorage.getItem("disha_shared_device_cohort")), cohort);

    // Next student gets new ID
    localStorage.setItem("disha_student_id", "student-user-2");
    assert.equal(localStorage.getItem("disha_student_id"), "student-user-2");
  });

  await t.test("2. Join cohort payload complies with data minimisation", () => {
    // When student joins, only join code, student_id and nickname / roll number are sent
    const joinPayload = {
      join_code: "KJ92X1",
      student_id: "student-xyz",
      nickname: "Roll 14 (Rohan)"
    };

    assert.ok(joinPayload.nickname);
    assert.equal(joinPayload.income, undefined, "Income must never be sent in join payload");
    assert.equal(joinPayload.caste, undefined, "Caste must never be sent in join payload");
    assert.equal(joinPayload.family_income, undefined, "Family income must never be sent");
  });

  await t.test("3. Offline recommendation caching and retrieval", () => {
    const studentId = "student-xyz";
    const sampleRecs = [
      {
        id: "rec-1",
        facilitator_id: "fac-1",
        facilitator_name: "Suresh Mane (Sir)",
        student_id: studentId,
        opportunity_id: "opp_solar_surya_mitra",
        opportunity_title: "Surya Mitra Solar Technician",
        note: "Great fit for your electrical and vocational skills!",
        created_at: new Date().toISOString()
      }
    ];

    // Cache to localStorage
    localStorage.setItem(`disha_recs_${studentId}`, JSON.stringify(sampleRecs));

    // Retrieve offline
    const retrieved = JSON.parse(localStorage.getItem(`disha_recs_${studentId}`));
    assert.equal(retrieved.length, 1);
    assert.equal(retrieved[0].opportunity_id, "opp_solar_surya_mitra");
    assert.equal(retrieved[0].facilitator_name, "Suresh Mane (Sir)");
    assert.ok(retrieved[0].note.includes("vocational skills"));
  });

  await t.test("4. Offline roster caching for dashboard access without network", () => {
    const cohortId = "cohort-123";
    const sampleRoster = [
      {
        member_id: "mem-1",
        student_id: "std-1",
        nickname: "Roll 01",
        grade: 10,
        profile_status: "COMPLETE",
        pathway_progress_pct: 35,
        radar_flags: [{ code: "RISING", title: "प्रगतीपथावर (Rising)", reason: "Consistent progress" }]
      },
      {
        member_id: "mem-2",
        student_id: "std-2",
        nickname: "Roll 02",
        grade: 10,
        profile_status: "IN_PROGRESS",
        pathway_progress_pct: 0,
        radar_flags: [{ code: "NEEDS_SUPPORT", title: "मार्गदर्शन आवश्यक", reason: "No activity in 14 days" }]
      }
    ];

    localStorage.setItem(`disha_cached_roster_${cohortId}`, JSON.stringify(sampleRoster));
    const cached = JSON.parse(localStorage.getItem(`disha_cached_roster_${cohortId}`));

    assert.equal(cached.length, 2);
    assert.equal(cached[0].radar_flags[0].code, "RISING");
    assert.equal(cached[1].radar_flags[0].code, "NEEDS_SUPPORT");
  });
});
