import { test, describe } from "node:test";
import assert from "node:assert/strict";

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

// Revenue split logic helper (platform 12%, facilitator 88%)
function calculateRevenueSplit(priceType, priceInr) {
  if (priceType === "free" || priceInr <= 0) {
    return {
      total: 0,
      platformFee: 0,
      facilitatorPayout: 0
    };
  }
  const platformFee = Math.round(priceInr * 0.12 * 100) / 100;
  const facilitatorPayout = Math.round((priceInr - platformFee) * 100) / 100;
  return {
    total: priceInr,
    platformFee,
    facilitatorPayout
  };
}

// Module offline cache helper
function cacheModuleOffline(storage, moduleData) {
  const cacheKey = `disha_offline_module_${moduleData.id}`;
  storage.setItem(cacheKey, JSON.stringify({
    ...moduleData,
    cachedAt: new Date().toISOString()
  }));
}

function getOfflineModule(storage, moduleId) {
  const raw = storage.getItem(`disha_offline_module_${moduleId}`);
  return raw ? JSON.parse(raw) : null;
}

describe("Marketplace & Revenue Split Tests", () => {
  test("revenue split applies exactly 12% platform and 88% facilitator for one-time payment", () => {
    const split = calculateRevenueSplit("one_time", 500);
    assert.equal(split.total, 500);
    assert.equal(split.platformFee, 60); // 12% of 500
    assert.equal(split.facilitatorPayout, 440); // 88% of 500
    assert.equal(split.platformFee + split.facilitatorPayout, 500);
  });

  test("revenue split applies accurately for odd amounts (e.g. 199 INR)", () => {
    const split = calculateRevenueSplit("one_time", 199);
    assert.equal(split.total, 199);
    // 199 * 0.12 = 23.88
    assert.equal(split.platformFee, 23.88);
    // 199 - 23.88 = 175.12
    assert.equal(split.facilitatorPayout, 175.12);
    assert.equal(Number((split.platformFee + split.facilitatorPayout).toFixed(2)), 199);
  });

  test("free modules have zero platform fee and zero facilitator payout", () => {
    const split = calculateRevenueSplit("free", 0);
    assert.equal(split.total, 0);
    assert.equal(split.platformFee, 0);
    assert.equal(split.facilitatorPayout, 0);
  });

  test("mock enrollment allows offline caching and offline retrieval of course steps", () => {
    const storage = new MockStorage();
    const testModule = {
      id: "mod-solar-101",
      title: "सौर पॅनेल तंत्रज्ञान (Solar Installation)",
      language: "mr",
      price_type: "one_time",
      price_inr: 250,
      steps: [
        { step_number: 1, title: "सुरक्षा आणि साधने", content: "हेल्मेट, ग्लोव्ह्ज आणि मल्टीमीटर वापरणे." },
        { step_number: 2, title: "पॅनेल वायरिंग", content: "सिरीज व पॅरालेल जोडणी." }
      ]
    };

    // Cache module offline
    cacheModuleOffline(storage, testModule);

    // Retrieve offline
    const cached = getOfflineModule(storage, "mod-solar-101");
    assert.ok(cached);
    assert.equal(cached.title, "सौर पॅनेल तंत्रज्ञान (Solar Installation)");
    assert.equal(cached.steps.length, 2);
    assert.equal(cached.steps[0].step_number, 1);
    assert.ok(cached.cachedAt);
  });
});
