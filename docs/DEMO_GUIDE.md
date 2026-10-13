# 🚀 Disha: Master End-to-End Live Demonstration Script

This master demo script guides you step-by-step through presenting Disha to judges and evaluators, highlighting every major architectural capability and winning feature.

---

## 🔑 Quick Demo Credentials & Access Points

| Resource | Value / Access |
| :--- | :--- |
| **Live Public HTTPS URL** | [https://determines-fabrics-operational-shortly.trycloudflare.com](https://determines-fabrics-operational-shortly.trycloudflare.com) |
| **Local URL** | [http://localhost:5173](http://localhost:5173) |
| **Backend API URL** | [http://localhost:8000/docs](http://localhost:8000/docs) (Interactive Swagger Docs) |
| **Facilitator Demo Phone** | `9876543210` |
| **Facilitator Demo OTP** | `123456` |
| **Demo Student Nickname** | `Rohan` / `Sneha` (No full legal names required) |
| **Offline Test Trigger** | Turn phone to **Airplane Mode** |

---

## 🎬 Act 1: The First Impression & Multilingual PWA (45 Seconds)

### Goal
Prove that Disha feels like a native mobile app and breaks language literacy barriers.

### Steps:
1. **Show the QR Code on Screen**:
   - Have the judge scan the QR code with their mobile phone camera.
2. **Install to Home Screen**:
   - Point out the **Add to Home screen** prompt.
   - Tap Install — open Disha directly from the phone app drawer.
   - Point out that there is **zero browser address bar**, giving a 100% native feel.
3. **Toggle Languages**:
   - Tap the language toggle in the top-right corner: switch from **English** to **मराठी (Marathi)** and **हिंदी (Hindi)**.
   - Notice the complete UI dynamically adapts (headings, cards, button labels, and spoken audio prompts).
4. **Speaker Audio Readout**:
   - Tap the audio speaker icon on any card to show automatic multilingual speech synthesis (Web Speech / Sarvam / Bhashini adapter).

---

## 🎬 Act 2: Voice-Driven Discovery & Deterministic Matching (90 Seconds)

### Goal
Show how rural youth express their interests via voice and receive verified, hallucination-free opportunities.

### Steps:
1. Tap **"सुरू करा" / "Start Discovery"**.
2. **Answer Discovery Questions**:
   - Question 1 (Education): Select **10th Pass** or **12th Science/Vocational**.
   - Question 2 (Interest Domain): Select **Solar & Renewable Energy / तंत्रज्ञान (Technology)**.
   - Question 3 (Preferred Work Setting): Select **Field & Hands-on Work**.
3. **Voice Input Option**:
   - Tap the **Microphone (Mic)** button to show speech recognition listening in Marathi/Hindi.
4. **Guardian Consent & Privacy Check**:
   - Point out the mandatory checkbox: *"I confirm parental/guardian consent to save profile"* (compliant with DPDP Act 2023).
   - Enter a simple nickname: `Rohan` (notice Disha strictly refuses to ask for Aadhaar or full legal names).
5. **View Top Matched Opportunities**:
   - Tap **Submit**.
   - The system displays verified opportunities with **Match Percentages (e.g., 95% Match: PM National Apprenticeship - Solar PV Technician)**.
   - **Point to the "Verified" badge**: Explain that every single opportunity is grounded in official government gazettes/portals, never hallucinated by an LLM.

---

## 🎬 Act 3: Stepwise Actionable Pathways (45 Seconds)

### Goal
Show how Disha transforms overwhelming schemes into bite-sized, actionable milestones.

### Steps:
1. Tap on the matched card: **PM National Apprenticeship Promotion Scheme (Solar PV Tech)**.
2. The **My Path (माझा मार्ग)** screen loads.
3. Walk the judge through the 4 milestones:
   - **Step 1: Document Readiness** (Mark sheet, domicile certificate).
   - **Step 2: NAPS Portal Registration**.
   - **Step 3: Verification at nearest ITI Node**.
   - **Step 4: Stipend Onboarding (₹8,000/month)**.
4. Tap the checkmark on Step 1 to show interactive milestone progress updating.

---

## 🎬 Act 4: The "Airplane Mode" Offline Resilience Test (60 Seconds) — *The Winning Moment!*

### Goal
Prove that Disha continues working even in rural areas with zero cellular reception.

### Steps:
1. **Turn ON Airplane Mode** on the phone in front of the judge.
2. Point to the UI:
   - Disha immediately shows an **"Offline (ऑफलाइन)"** status pill.
3. **Perform an Action While Offline**:
   - Check off Step 2 on the pathway or submit an answer.
   - Show the alert: *"Saved locally in outbox — will sync when online"*.
   - View previously loaded opportunities and courses: they render instantly from IndexedDB cache.
4. **Turn Airplane Mode OFF**:
   - Watch the offline pill switch back to **"Online (ऑनलाइन)"**.
   - The sync outbox automatically transmits the queued items to the server without any user re-typing.

---

## 🎬 Act 5: Facilitator Portal & The "Talent Radar" (60 Seconds)

### Goal
Show how teachers and NGO workers manage cohorts of students and unlock talent insights.

### Steps:
1. Tap the **"शिक्षक / Facilitator"** icon in the header.
2. Enter the demo phone number: `9876543210`.
3. Tap **Send OTP**. The demo OTP `123456` appears on screen.
4. Enter `123456` and tap **Verify OTP**.
5. **View the Facilitator Dashboard**:
   - **Cohorts List**: E.g., *"Pune Rural Batch A"*, *"Satara ITI Group"*.
   - **Join Code**: Show the short 6-letter code (`BAT789`) that students use on their own phones to join.
   - **Talent Radar**: Highlight cards showing regional talent distribution:
     - *Solar PV Specialists: 8 students*
     - *Organic Agri-Tech: 5 students*
     - *Digital Services: 12 students*
6. **Shared-Device Mode**:
   - Tap **"Start Shared-Device Session"**.
   - Show the **"Next Student"** button: explain that clicking it instantly purges the previous student's profile, matches, and tokens from browser storage, preventing privacy leakage between village peers.
7. **Privacy-Preserving CSV Export**:
   - Tap **"Export Roster CSV"**.
   - Explain **k-Anonymity**: Any category with fewer than 5 students is automatically suppressed to protect individual student identities.

---

## 🎬 Act 6: Sustainable Community Marketplace (45 Seconds)

### Goal
Show financial sustainability and grassroots monetization without real payment risks.

### Steps:
1. Tap on the **Marketplace (बाजार)** tab.
2. View community vocational modules created by local facilitators (e.g., *"Solar Panel Maintenance Practical Course"*).
3. Point out the transparent pricing:
   - Course Price: `₹199`
   - Platform Revenue (12%): `₹23.88` (2388 paise)
   - Facilitator Payout (88%): `₹175.12` (17512 paise)
4. Tap **"Enroll with Mock Payment"**:
   - Emphasize the clear *"Mock payment (Demo)"* badge — no real credit card or bank details are requested.
   - The student gains immediate offline-accessible course steps.

---

## 🎯 30-Second Closing Pitch Summary for Judges

> *"Judges, Disha bridges India's rural opportunity divide by uniting three essential pillars:
> 1. **Accessibility**: Voice-first multilingual guidance in Marathi, Hindi, and English that works on low-cost phones.
> 2. **Trust & Reliability**: Zero-hallucination deterministic matching paired with verified official data and strict DPDP-compliant data minimisation.
> 3. **Resilience**: An offline-first PWA that never fails in connectivity blackouts, backed by an NGO Talent Radar and a grassroots 12/88 marketplace.
> You can test it right now on your personal phones via the live HTTPS link!"*
