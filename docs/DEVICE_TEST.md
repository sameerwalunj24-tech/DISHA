# Disha Field Device Test Kit
================================

This document provides a field-tested, numbered checklist to validate Disha on real low-end Android smartphones (Android 9–14, 2GB–3GB RAM, Chrome / Samsung Internet / Firefox) over HTTPS.

---

## 1. Prerequisites for Real Device Testing

1. **HTTPS Connection:**
   Service Workers and the `MediaRecorder` API require a secure context (HTTPS) on remote mobile devices.
   - Run a tunnel (e.g. `ngrok http 5173` or `cloudflared tunnel --url http://localhost:5173`)
   - Or deploy to your staging HTTPS domain (see [DEPLOY.md](DEPLOY.md)).
2. **Target Device:**
   Representative low-end rural smartphone (e.g. Redmi 9A, Realme C11, Samsung Galaxy M02, JioPhone Next, Poco C31).
3. **Data Pre-requisite:**
   Ensure `ENVIRONMENT="development"` or `"demo"` if using demo OTPs on-screen.

---

## 2. Numbered Device Test Checklist

### Test 1: PWA Installation & Standalone Mode
1. Open the HTTPS URL in mobile Chrome.
2. Observe the install banner at the top: *"दिशा ॲप इन्स्टॉल करा / Install Disha App"*.
3. Tap **इन्स्टॉल (Install)** or use Chrome Menu > **Add to Home screen**.
4. Confirm installation. Go to phone home screen.
5. **Verification:**
   - [ ] Disha icon appears with crisp circular/adaptive mask (maskable icon).
   - [ ] Tapping icon launches in standalone mode (no browser address bar).
   - [ ] Splash screen displays solar orange theme (`#f97316`) and navy background (`#0f172a`).

### Test 2: Airplane Mode & Offline App Shell
1. Launch installed Disha app.
2. Swipe down quick settings and turn on **Airplane Mode** (all Wi-Fi and mobile data disabled).
3. Close the app completely from Recent Apps, then re-launch from home screen.
4. **Verification:**
   - [ ] App launches smoothly without *"No Internet"* dinosaur screen.
   - [ ] Navigation tiles (Discover, My Path, Opportunities, Facilitator) are clickable.
   - [ ] If visiting an un-cached route, the styled trilingual `/offline.html` page appears with the option to return to cached App Shell.

### Test 3: Offline Voice Notes Recording
1. While still in **Airplane Mode**, tap **शोध (Discover)**.
2. Select grade and confirm Guardian Consent checkbox:
   - *"पालकांची संमती आहे (Guardian consent given)"*
3. Reach the career interests question.
4. Tap the microphone button **व्हॉईस नोट रेकॉर्ड करा (Record Voice Note)**.
5. Grant browser microphone permission if prompted.
6. Speak a short answer in Marathi or Hindi (e.g. *"मला सौर ऊर्जा तंत्रज्ञान आणि मोटार वाइंडिंग शिकायचे आहे"*).
7. Tap **थांबवा (Stop Recording)**.
8. **Verification:**
   - [ ] Notice appears: **"Saved - will be processed when online"** (सेव्ह झाले - ऑनलाइन झाल्यावर प्रक्रिया केली जाईल).
   - [ ] Answer input displays recorded placeholder note.
   - [ ] Item is stored in IndexedDB outbox store (`sync_outbox`) with type `voice_note` and `status: pending`.

### Test 4: Reconnection, Auto-Sync & Audio Deletion
1. Turn off **Airplane Mode** (re-enable Wi-Fi or mobile data).
2. Observe the sync indicator icon in the header transitioning from offline (gray/amber) to online (green).
3. The sync engine automatically pushes pending outbox items to `/api/v1/sync`.
4. **Verification:**
   - [ ] Voice note is synced to the server.
   - [ ] Server transcribes the spoken answer using configured Speech Provider (Mock/Sarvam).
   - [ ] Student profile interests are updated with the transcribed text.
   - [ ] **Privacy Check:** Raw audio bytes are immediately deleted from client memory and server payload. No audio file remains on disk.

### Test 5: Shared-Device Mode & Clean Session Handoff
1. Tap Facilitator login, enter phone number, enter OTP, and open an existing Cohort.
2. Tap **"सामायिक डिव्हाइस मोड सुरू करा (Start Shared-Device Mode)"**.
3. Hand the phone to Student A:
   - Student A completes Discover quiz and views their Pathway.
4. Student A taps **"Next Student (पुढील विद्यार्थी)"**.
5. **Verification:**
   - [ ] Student A's cached profile, matched opportunities, and pathway are completely wiped from browser storage (`localStorage` and IndexedDB).
   - [ ] Screen returns cleanly to Discover for Student B.
   - [ ] Student B starts with a blank slate; no data from Student A leaks across sessions.

### Test 6: Facilitator Portal & Talent Radar
1. Login as Facilitator.
2. Open Cohort Roster.
3. **Verification:**
   - [ ] Roster displays student nicknames / roll numbers (no full names or sensitive demographic fields).
   - [ ] Talent Radar tags appear (e.g. *Rising Talent*, *High Match*, *Needs Support*) with clear plain-language rationale.
   - [ ] Facilitator can recommend an opportunity to a student.
   - [ ] Facilitator can export anonymized CSV (counts below 5 masked as `<5`).

### Test 7: PWA Hardening & "Update Available" Prompt
1. Keep the app open on the phone.
2. On server, trigger a new build/deployment with updated service worker cache version (`sw.js`).
3. Return to the phone screen or trigger background check.
4. **Verification:**
   - [ ] A non-intrusive prompt appears: **"नवीन आवृत्ती उपलब्ध आहे / Update Available"**.
   - [ ] Tapping **"रिफ्रेश करा / Refresh"** sends `SKIP_WAITING` and immediately activates the new version without requiring manual browser cache clearing.

---

## 3. Real Device Test Record Sheet

Record your field test results in the table below:

| # | Device Model | Android Version | RAM / Chipset | Browser & Version | PWA Install | Airplane Mode | Voice Note | Sync & Audio Deletion | Shared Device | Facilitator & Radar | SW Update Prompt | Overall Pass/Fail | Tester & Date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Xiaomi Redmi 9A | Android 10 (Go) | 2GB / Helio G25 | Chrome 122 | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] PASS [ ] FAIL | |
| 2 | Realme C11 | Android 11 | 2GB / SC9863A | Chrome 124 | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] PASS [ ] FAIL | |
| 3 | Samsung Galaxy M02 | Android 10 | 3GB / MT6739W | Samsung Internet 24 | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] PASS [ ] FAIL | |
| 4 | JioPhone Next | Android 11 (Pragati OS) | 2GB / QM215 | Chrome 120 | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] Pass [ ] Fail | [ ] PASS [ ] FAIL | |

---

## 4. Troubleshooting Device Issues

1. **Microphone permission denied:**
   - Chrome on Android: Tap the lock icon in the address bar > Permissions > Microphone > Allow.
2. **Service worker does not update:**
   - Chrome requires HTTPS to register and update service workers. Inspect `chrome://inspect` on PC via USB debugging.
3. **Audio format issues on older Android versions:**
   - Older Android webviews support `audio/webm;codecs=opus` or fallback `audio/mp4`. The Disha recorder automatically checks `MediaRecorder.isTypeSupported()`.
