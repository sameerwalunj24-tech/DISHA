import React from "react";
import { X, ShieldCheck, Mic, Lock, AlertTriangle, Users, Award, ExternalLink } from "lucide-react";
import { useI18n } from "../i18n";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { language } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 580, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="modal-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "rgba(14, 165, 233, 0.15)", color: "#38bdf8", padding: 8, borderRadius: 10 }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff" }}>
                {language === "mr" && "दिशा - माहिती व गोपनीयता धोरण"}
                {language === "hi" && "दिशा - जानकारी एवं गोपनीयता नीति"}
                {language === "en" && "Disha - About & Privacy Policy"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                {language === "mr" && "पारदर्शकता, मर्यादा आणि डेटा सुरक्षा"}
                {language === "hi" && "पारदर्शिता, सीमाएं और डेटा सुरक्षा"}
                {language === "en" && "Transparency, Limitations & Data Protection"}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Mission Card */}
          <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 14 }}>
            <h4 style={{ margin: "0 0 6px 0", color: "#f97316", fontSize: "0.95rem" }}>
              {language === "mr" && "ध्येय व कार्यपद्धती (Mission)"}
              {language === "hi" && "लक्ष्य और कार्यप्रणाली (Mission)"}
              {language === "en" && "Mission & Philosophy"}
            </h4>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.5 }}>
              {language === "mr" && "दिशा हे ग्रामीण व निमशहरी भागातील विद्यार्थ्यांसाठी तयार केलेले व्हॉईस-फर्स्ट, बहुभाषिक आणि ऑफलाइन-सक्षम करिअर मार्गदर्शक व्यासपीठ आहे. हे दहावी ते पदवीपर्यंतच्या विद्यार्थ्यांना शिष्यवृत्ती, शिकाऊ उमेदवारी आणि कौशल्य योजनांशी जोडते."}
              {language === "hi" && "दिशा ग्रामीण और अर्ध-शहरी छात्रों के लिए एक वॉयस-फर्स्ट, बहुभाषी और ऑफ़लाइन-सक्षम करियर मार्गदर्शन मंच है। यह छात्रों को छात्रवृत्ति, अप्रेंटिसशिप और कौशल योजनाओं से जोड़ता है।"}
              {language === "en" && "Disha is a voice-first, multilingual, offline-first career guidance companion designed for rural and semi-urban students to discover scholarships, apprenticeships, and vocational opportunities."}
            </p>
          </div>

          {/* Honest Disclosures / Limitations Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h4 style={{ margin: 0, color: "#fff", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
              {language === "mr" && "महत्त्वाच्या मर्यादा व पारदर्शकता (Honest Limitations)"}
              {language === "hi" && "महत्वपूर्ण सीमाएं एवं खुलासे (Honest Limitations)"}
              {language === "en" && "Important Limitations & Honest Disclosures"}
            </h4>

            {/* 1. Voice audio processing */}
            <div style={{ background: "rgba(30, 41, 59, 0.5)", borderRadius: 10, padding: 12, borderLeft: "3px solid #38bdf8" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Mic size={14} style={{ color: "#38bdf8" }} />
                <strong style={{ fontSize: "0.82rem", color: "#fff" }}>
                  {language === "mr" ? "आवाज व ऑडिओ प्रक्रिया (Browser Web Speech API)" : language === "hi" ? "आवाज प्रसंस्करण (Web Speech API)" : "Voice Audio Processing"}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.4 }}>
                {language === "mr" && "आवाज ओळखण्यासाठी ब्राऊझरची मूळ Web Speech API वापरली जाते. ऑडिओ डेटा संबंधित ब्राऊझर प्रदात्यामार्फत (उदा. Google Chrome) प्रक्रिया केला जातो. दिशा सर्व्हरवर कोणताही ऑडिओ रेकॉर्ड केला जात नाही."}
                {language === "hi" && "आवाज की पहचान ब्राउज़र के मूल Web Speech API के माध्यम से की जाती है। दिशा सर्वर पर कोई ऑडियो रिकॉर्डिंग नहीं सहेजी जाती है।"}
                {language === "en" && "Speech recognition and synthesis use the browser's native Web Speech API (processed by browser vendor like Google Chrome / WebKit). Disha's servers never record or store raw student audio."}
              </p>
            </div>

            {/* 2. Sample Data Trust */}
            <div style={{ background: "rgba(30, 41, 59, 0.5)", borderRadius: 10, padding: 12, borderLeft: "3px solid #f59e0b" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Award size={14} style={{ color: "#f59e0b" }} />
                <strong style={{ fontSize: "0.82rem", color: "#fff" }}>
                  {language === "mr" ? "संधी डेटा पडताळणी धोरण (Sample Unverified Data)" : language === "hi" ? "अवसर सत्यापन नीति (Sample Unverified Data)" : "Opportunity Data Trust"}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.4 }}>
                {language === "mr" && "डेटाबेस मधील संधी जोपर्यंत मानवी तपासणी अधिकाऱ्याद्वारे प्रत्यक्ष शासन निर्णयाशी पडताळल्या जात नाहीत, तोपर्यंत त्या 'नमुना - अपडताळित (Sample - unverified)' म्हणून दाखवल्या जातात. विद्यार्थ्यांनी अधिकृत संकेतस्थळावर अंतिम पडताळणी करावी."}
                {language === "hi" && "सभी अवसर जब तक किसी मानव सत्यापनकर्ता द्वारा जांचे नहीं जाते, 'नमूना - असत्यापित' के रूप में दिखाए जाते हैं।"}
                {language === "en" && "All opportunities are strictly flagged as 'Sample - unverified' until independently verified by a human reviewer with official source URLs. Students should verify with the official issuing body."}
              </p>
            </div>

            {/* 3. Authentication & Mock Payments */}
            <div style={{ background: "rgba(30, 41, 59, 0.5)", borderRadius: 10, padding: 12, borderLeft: "3px solid #10b981" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Lock size={14} style={{ color: "#10b981" }} />
                <strong style={{ fontSize: "0.82rem", color: "#fff" }}>
                  {language === "mr" ? "प्रोटोटाइप प्रमाणीकरण व मॉक पेमेंट (Prototype Auth & Mock Payments)" : language === "hi" ? "प्रोटोटाइप प्रमाणीकरण और मॉक भुगतान" : "Prototype Auth & Mock Payments"}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.4 }}>
                {language === "mr" && "शिक्षक लॉगिनसाठी विकास मोडमध्ये स्क्रीनवरच OTP दाखवला जातो. कौशल्य मार्केटप्लेस मधील व्यवहार हे पूर्णपणे सिम्युलेटेड (Mock Payment) असून यात कोणतेही खरे पैसे कापले जात नाहीत."}
                {language === "hi" && "डेमो मोड में स्क्रीन पर ही OTP प्रदर्शित होता है। मार्केटप्लेस में केवल आभासी (Mock) भुगतान का उपयोग होता है, कोई वास्तविक बैंक लेनदेन नहीं होता।"}
                {language === "en" && "Facilitator authentication uses prototype OTP (displayed on screen in dev/demo mode). Marketplace transactions use simulated mock payments without real banking gateways."}
              </p>
            </div>

            {/* 4. DPDP & Child Safety Compliance */}
            <div style={{ background: "rgba(30, 41, 59, 0.5)", borderRadius: 10, padding: 12, borderLeft: "3px solid #a855f7" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Users size={14} style={{ color: "#c084fc" }} />
                <strong style={{ fontSize: "0.82rem", color: "#fff" }}>
                  {language === "mr" ? "गोपनीयता व डेटा संरक्षण (Privacy & Data Minimisation)" : language === "hi" ? "डेटा सुरक्षा एवं सहमति (Data Minimisation)" : "Privacy & Data Minimisation"}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.4 }}>
                {language === "mr" && "पालकांची संमती बंधनकारक आहे. विद्यार्थ्यांचे कौटुंबिक उत्पन्न किंवा जात वर्गवारी सर्व्हरवर कधीही साठवली जात नाही. शिक्षकांच्या रोस्टरमध्ये केवळ टोपणनाव किंवा हजेरी क्रमांक वापरला जातो."}
                {language === "hi" && "अभिभावक की सहमति अनिवार्य है। पारिवारिक आय या जाति वर्ग सर्वर पर कभी नहीं भेजे जाते। रोस्टर में केवल उपनाम का उपयोग होता है।"}
                {language === "en" && "Guardian consent is strictly mandatory. Sensitive fields (family income, caste/social category, bank details) are stripped on client before sync and never stored on server."}
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center", paddingTop: 8 }}>
            <button
              onClick={onClose}
              className="submit-btn"
              style={{ width: "100%", padding: "10px", fontSize: "0.88rem" }}
            >
              {language === "mr" ? "समजले, बंद करा" : language === "hi" ? "समझ गया, बंद करें" : "I Understand • Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
