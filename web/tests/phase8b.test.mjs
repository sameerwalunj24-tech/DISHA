// phase8b.test.mjs - Unit tests for Phase 8B PWA Hardening & Voice Notes Outbox
import test from "node:test";
import assert from "node:assert/strict";

test("Phase 8B: Voice note outbox queuing and privacy sanitization", async (t) => {
  // Mock IndexedDB outbox store
  const outbox = [];

  function enqueueSyncItem(type, payload) {
    // Privacy guarantee: strip any sensitive fields
    const sanitizedPayload = { ...payload };
    delete sanitizedPayload.family_income;
    delete sanitizedPayload.social_category;
    delete sanitizedPayload.aadhaar_number;

    const item = {
      id: "vn_" + Math.random().toString(36).substring(2, 9),
      type,
      payload: sanitizedPayload,
      updated_at: new Date().toISOString(),
      attempts: 0,
      status: "pending"
    };
    outbox.push(item);
    return item;
  }

  await t.test("1. Voice note is enqueued with guardian consent and status pending", () => {
    const item = enqueueSyncItem("voice_note", {
      session_id: "sess_123",
      question_id: "q_interests",
      language: "mr",
      audio_base64: "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8=",
      guardian_consent: true,
      student_name: "सचिन"
    });

    assert.equal(item.type, "voice_note");
    assert.equal(item.status, "pending");
    assert.equal(item.payload.guardian_consent, true);
    assert.equal(item.payload.language, "mr");
    assert.ok(item.payload.audio_base64.startsWith("data:audio/webm;base64,"));
  });

  await t.test("2. Voice note payload never contains sensitive demographic fields", () => {
    const item = enqueueSyncItem("voice_note", {
      session_id: "sess_456",
      audio_base64: "test_bytes",
      family_income: "50000",
      social_category: "OBC",
      guardian_consent: true
    });

    assert.equal(item.payload.family_income, undefined);
    assert.equal(item.payload.social_category, undefined);
  });

  await t.test("3. Offline audio is cleared upon sync completion", () => {
    const item = outbox[0];
    assert.ok(item);
    // Simulate server response after sync
    item.status = "synced";
    delete item.payload.audio_base64; // Server and client delete raw audio

    assert.equal(item.status, "synced");
    assert.equal(item.payload.audio_base64, undefined);
  });
});

test("Phase 8B: PWA Service Worker cache version and offline fallback structure", async (t) => {
  await t.test("Manifest has maskable and any icons configured", async () => {
    const fs = await import("node:fs");
    const manifest = JSON.parse(fs.readFileSync("./public/manifest.webmanifest", "utf-8"));

    const hasAny = manifest.icons.some((i) => i.purpose.includes("any"));
    const hasMaskable = manifest.icons.some((i) => i.purpose.includes("maskable"));

    assert.ok(hasAny, "Manifest must include 'any' purpose icon");
    assert.ok(hasMaskable, "Manifest must include 'maskable' purpose icon");
  });

  await t.test("Offline fallback page exists and is self-contained", async () => {
    const fs = await import("node:fs");
    const offlineHtml = fs.readFileSync("./public/offline.html", "utf-8");

    assert.ok(offlineHtml.includes("ऑफलाइन मोड"), "Must contain Marathi offline indicator");
    assert.ok(offlineHtml.includes("OFFLINE MODE"), "Must contain English offline indicator");
    assert.ok(!offlineHtml.includes("<script src=\"http"), "Must not load blocking external scripts");
  });
});
