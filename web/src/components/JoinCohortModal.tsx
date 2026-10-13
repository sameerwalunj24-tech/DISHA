import React, { useState } from "react";
import { X, Users, Shield, CheckCircle2, Send, AlertTriangle } from "lucide-react";
import { useI18n } from "../i18n";
import { apiUrl } from "../services/apiConfig";

interface JoinCohortModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  onJoinedSuccess?: (cohortName: string) => void;
}

export const JoinCohortModal: React.FC<JoinCohortModalProps> = ({
  isOpen,
  onClose,
  studentId,
  onJoinedSuccess
}) => {
  const { language } = useI18n();
  const [joinCode, setJoinCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [joinedCohortName, setJoinedCohortName] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !nickname.trim()) return;

    if (!studentId) {
      setErrorMsg(
        language === "mr" ? "कृपया आधी करिअर शोध (Discover) पूर्ण करा किंवा प्रोफाईल सेव्ह करा."
        : language === "hi" ? "कृपया पहले करियर डिस्कवर पूरा करें।"
        : "Please complete discovery profile first."
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(apiUrl("/api/v1/cohorts/join"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          join_code: joinCode.trim().toUpperCase(),
          student_id: studentId,
          nickname: nickname.trim()
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to join cohort");
      }

      const data = await res.json();
      setJoinedCohortName(data.cohort_name);
      try {
        localStorage.setItem("disha_joined_cohort", JSON.stringify({
          id: data.cohort_id,
          name: data.cohort_name,
          nickname: data.nickname
        }));
      } catch {}

      if (onJoinedSuccess) {
        onJoinedSuccess(data.cohort_name);
      }

      setTimeout(() => {
        onClose();
        setJoinedCohortName(null);
        setJoinCode("");
        setNickname("");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to join cohort");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", padding: 8, borderRadius: 10 }}>
              <Users size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                {language === "mr" && "शिक्षकांच्या वर्गात / गटात सामील व्हा"}
                {language === "hi" && "शिक्षक के समूह में शामिल हों"}
                {language === "en" && "Join Teacher's Cohort"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                शिक्षकांनी दिलेला ६-अंकी कोड टाका
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {joinedCohortName ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#34d399" }}>
            <CheckCircle2 size={48} style={{ margin: "0 auto 10px" }} />
            <h4 style={{ color: "#fff", fontSize: "1.1rem", margin: "0 0 6px 0" }}>
              गटात सामील झाले!
            </h4>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>
              तुम्ही <strong>{joinedCohortName}</strong> गटात यशस्वीरीत्या जोडले गेला आहात.
            </p>
          </div>
        ) : (
          <form onSubmit={handleJoin} style={{ padding: "14px 0 0 0" }}>
            {/* Plain-Language Notice in mr/hi/en */}
            <div style={{
              background: "rgba(15,23,42,0.8)",
              border: "1px solid rgba(249,115,22,0.4)",
              borderRadius: 12,
              padding: 12,
              marginBottom: 14
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Shield size={16} style={{ color: "#10b981", flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.45 }}>
                  <strong style={{ color: "#fff", display: "block", marginBottom: 2 }}>
                    गोपनीयता सूचना (Privacy Notice):
                  </strong>
                  {language === "mr" && (
                    <span>
                      तुमचे शिक्षक तुमची <strong>प्रगती व करिअर आवडी</strong> पाहू शकतात. तुमचे नाव पूर्ण न दाखवता फक्त टोपणनाव/हजेरी क्रमांक दिसेल. संवेदनशील माहिती (उत्पन्न/जात) कधीही सामायिक होत नाही.
                    </span>
                  )}
                  {language === "hi" && (
                    <span>
                      आपके शिक्षक आपकी <strong>प्रगति और रुचियां</strong> देख सकते हैं। आपका पूरा नाम नहीं, केवल उपनाम/रोल नंबर दिखेगा। संवेदनशील जानकारी कभी साझा नहीं होती।
                    </span>
                  )}
                  {language === "en" && (
                    <span>
                      Your teacher can see your <strong>pathway progress and interests</strong>. Only your nickname/roll number appears on the roster. Sensitive info (income/caste) is never shared.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label htmlFor="join-code-input">जॉईन कोड (Join Code - e.g. DSH4A2)</label>
              <input
                id="join-code-input"
                type="text"
                className="form-input"
                placeholder="उदा. DSH4A2"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                style={{ letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" }}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label htmlFor="nickname-input">टोपणनाव किंवा हजेरी क्रमांक (Nickname / Roll Number)</label>
              <input
                id="nickname-input"
                type="text"
                className="form-input"
                placeholder="उदा. रोहन (Roll 12) किंवा Student #101"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={40}
                required
              />
            </div>

            {errorMsg && (
              <p style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} /> {errorMsg}
              </p>
            )}

            <button type="submit" className="submit-btn" disabled={isSubmitting} style={{ width: "100%" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Send size={15} />
                {isSubmitting ? "सामील होत आहे..." : "गटात सामील व्हा (Join Cohort) →"}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
