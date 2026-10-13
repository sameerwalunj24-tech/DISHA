import React, { useState, useEffect } from "react";
import { Compass, Route, Award, Mic, MicOff, ChevronRight, Volume2, Sparkles, Users, BookOpen } from "lucide-react";
import { useI18n } from "../i18n";
import { voiceService } from "../services/voice";

interface StudentHomeProps {
  onSelectTile: (tileKey: "discover" | "pathway" | "opportunities" | "marketplace") => void;
  onOpenJoinCohort?: () => void;
  joinedCohortName?: string | null;
}

export const StudentHome: React.FC<StudentHomeProps> = ({ onSelectTile, onOpenJoinCohort, joinedCohortName }) => {
  const { language, t } = useI18n();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [partialTranscript, setPartialTranscript] = useState<string>("");

  // Check local storage for completed discovery data
  const [savedProfile, setSavedProfile] = useState<any>(() => {
    try {
      const raw = localStorage.getItem("disha_student_profile");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [savedTopMatch, setSavedTopMatch] = useState<any>(() => {
    try {
      const raw = localStorage.getItem("disha_top_match");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [studentNickname] = useState<string>(() => {
    return localStorage.getItem("disha_student_nickname") || "";
  });

  // Re-check profile on mount / focus
  useEffect(() => {
    const checkSaved = () => {
      try {
        const pRaw = localStorage.getItem("disha_student_profile");
        if (pRaw) setSavedProfile(JSON.parse(pRaw));
        const mRaw = localStorage.getItem("disha_top_match");
        if (mRaw) setSavedTopMatch(JSON.parse(mRaw));
      } catch {}
    };
    checkSaved();
    window.addEventListener("focus", checkSaved);
    return () => window.removeEventListener("focus", checkSaved);
  }, []);

  const handleToggleVoice = async () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      setPartialTranscript("");
      return;
    }

    setIsListening(true);
    setPartialTranscript("");
    setTranscript("");

    const langCode = language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";

    await voiceService.startListening({
      language: langCode,
      onPartial: (partial) => {
        setPartialTranscript(partial);
      },
      onFinal: (finalText) => {
        setIsListening(false);
        setPartialTranscript("");
        setTranscript(finalText);
        // Automatically speak back audio confirmation
        voiceService.speak(finalText, langCode);
      },
      onError: (err) => {
        console.error("Voice error:", err);
        setIsListening(false);
        setPartialTranscript("");
      }
    });
  };

  const handleSpeakTile = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    const langCode = language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";
    voiceService.speak(text, langCode);
  };

  return (
    <div className="main-container" style={{ paddingBottom: 80 }}>
      {/* Personalized Hero Card OR Default Greeting Card */}
      {savedProfile ? (
        <section className="personalized-hero" aria-label="Personalized Learner Hero">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{
                  background: "rgba(249,115,22,0.2)",
                  color: "#fdba74",
                  border: "1px solid rgba(249,115,22,0.4)",
                  padding: "2px 8px",
                  borderRadius: 9999,
                  fontSize: "0.72rem",
                  fontWeight: 800
                }}>
                  🎓 विद्यार्थी प्रोफाईल
                </span>
                <span style={{ color: "#94a3b8", fontSize: "0.76rem" }}>
                  इयत्ता {savedProfile.grade_level || "10"} वी • {savedProfile.district || "सातारा"}, {savedProfile.state || "महाराष्ट्र"}
                </span>
              </div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>
                {language === "mr" && `स्वागत आहे, ${studentNickname || "विद्यार्थी"}! 👋`}
                {language === "hi" && `स्वागत है, ${studentNickname || "विद्यार्थी"}! 👋`}
                {language === "en" && `Welcome, ${studentNickname || "Learner"}! 👋`}
              </h2>
            </div>
            <button
              onClick={() => onSelectTile("discover")}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "#cbd5e1",
                padding: "5px 12px",
                borderRadius: 9999,
                fontSize: "0.74rem",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
              title="पुन्हा शोध घ्या"
            >
              बदला ↺
            </button>
          </div>

          {/* Top Match Spotlight */}
          {savedTopMatch && (
            <div style={{
              background: "rgba(15,23,42,0.7)",
              border: "1px solid rgba(56,189,248,0.3)",
              borderRadius: 14,
              padding: "12px 14px",
              marginTop: 12,
              marginBottom: 14
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  ★ सर्वोत्तम मॅच (Top Recommendation)
                </span>
                <span style={{
                  background: "rgba(16,185,129,0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16,185,129,0.3)",
                  padding: "2px 8px",
                  borderRadius: 9999,
                  fontSize: "0.7rem",
                  fontWeight: 800
                }}>
                  {savedTopMatch.score ? `${savedTopMatch.score}% मॅच` : "९५% मॅच"}
                </span>
              </div>
              <strong style={{ color: "#fff", fontSize: "0.95rem", display: "block" }}>
                {savedTopMatch.opportunity?.title || "PM National Apprenticeship (Solar PV Tech)"}
              </strong>
              <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                {savedTopMatch.opportunity?.provider || "कौशल्य विकास व उद्योजकता मंत्रालय"}
              </span>
            </div>
          )}

          {/* Direct CTA Button */}
          <button
            onClick={() => onSelectTile("pathway")}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "13px 16px",
              fontSize: "0.92rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 14px rgba(249,115,22,0.4)"
            }}
          >
            <span>
              {language === "mr" && "माझा ३० दिवसांचा मार्ग सुरू ठेवा (Resume My Path)"}
              {language === "hi" && "मेरा 30 दिनों का मार्ग जारी रखें (Resume My Path)"}
              {language === "en" && "Resume My 30-Day Path"}
            </span>
            →
          </button>
        </section>
      ) : (
        <section className="greeting-card" aria-label="Welcome Card">
          <h2>{t.greeting}</h2>
          <p>{t.subGreeting}</p>
        </section>
      )}

      {/* Cohort Status / Join Card */}
      <div style={{
        background: "rgba(14, 165, 233, 0.08)",
        border: "1px solid rgba(14, 165, 233, 0.25)",
        borderRadius: 14,
        padding: "10px 14px",
        marginBottom: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={18} style={{ color: "#38bdf8" }} />
          <span style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>
            {joinedCohortName ? (
              <span><strong>वर्ग:</strong> {joinedCohortName}</span>
            ) : (
              <span>
                {language === "mr" && "शिक्षकांनी दिलेला वर्ग कोड आहे का?"}
                {language === "hi" && "क्या आपके पास शिक्षक का समूह कोड है?"}
                {language === "en" && "Have a teacher's class join code?"}
              </span>
            )}
          </span>
        </div>
        {!joinedCohortName && onOpenJoinCohort && (
          <button
            onClick={onOpenJoinCohort}
            style={{
              background: "rgba(14, 165, 233, 0.2)",
              border: "1px solid #38bdf8",
              color: "#38bdf8",
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {language === "mr" ? "सामील व्हा" : language === "hi" ? "शामिल हों" : "Join Class"}
          </button>
        )}
      </div>

      {/* 3 Core Big Tiles */}
      <section className="tiles-grid" aria-label="Main Navigation Tiles">
        {/* Tile 1: Discover */}
        <button
          className="action-tile tile-discover"
          onClick={() => onSelectTile("discover")}
          aria-label={t.tiles.discover.title}
        >
          <div className="tile-icon-box">
            <Compass />
          </div>
          <div className="tile-content">
            <div className="tile-header-row">
              <span className="tile-title">{t.tiles.discover.title}</span>
              {!savedProfile ? (
                <span className="start-here-badge">
                  १. प्रथम हे करा (Start Here)
                </span>
              ) : (
                <span className="tile-tag">{t.tiles.discover.tag}</span>
              )}
            </div>
            <p className="tile-subtitle">{t.tiles.discover.subtitle}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              role="button"
              tabIndex={0}
              className="voice-preview-btn"
              onClick={(e) => handleSpeakTile(e, `${t.tiles.discover.title}. ${t.tiles.discover.subtitle}`)}
              title="Listen in your language"
              style={{ color: "#fdba74", padding: 6 }}
            >
              <Volume2 size={20} />
            </span>
            <ChevronRight className="tile-arrow" size={24} />
          </div>
        </button>

        {/* Tile 2: My Path */}
        <button
          className="action-tile tile-pathway"
          onClick={() => onSelectTile("pathway")}
          aria-label={t.tiles.pathway.title}
        >
          <div className="tile-icon-box">
            <Route />
          </div>
          <div className="tile-content">
            <div className="tile-header-row">
              <span className="tile-title">{t.tiles.pathway.title}</span>
              <span className="tile-tag">{t.tiles.pathway.tag}</span>
            </div>
            <p className="tile-subtitle">{t.tiles.pathway.subtitle}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              role="button"
              tabIndex={0}
              className="voice-preview-btn"
              onClick={(e) => handleSpeakTile(e, `${t.tiles.pathway.title}. ${t.tiles.pathway.subtitle}`)}
              title="Listen in your language"
              style={{ color: "#7dd3fc", padding: 6 }}
            >
              <Volume2 size={20} />
            </span>
            <ChevronRight className="tile-arrow" size={24} />
          </div>
        </button>

        {/* Tile 3: Opportunities */}
        <button
          className="action-tile tile-opportunities"
          onClick={() => onSelectTile("opportunities")}
          aria-label={t.tiles.opportunities.title}
        >
          <div className="tile-icon-box">
            <Award />
          </div>
          <div className="tile-content">
            <div className="tile-header-row">
              <span className="tile-title">{t.tiles.opportunities.title}</span>
              <span className="tile-tag">{t.tiles.opportunities.tag}</span>
            </div>
            <p className="tile-subtitle">{t.tiles.opportunities.subtitle}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              role="button"
              tabIndex={0}
              className="voice-preview-btn"
              onClick={(e) => handleSpeakTile(e, `${t.tiles.opportunities.title}. ${t.tiles.opportunities.subtitle}`)}
              title="Listen in your language"
              style={{ color: "#6ee7b7", padding: 6 }}
            >
              <Volume2 size={20} />
            </span>
            <ChevronRight className="tile-arrow" size={24} />
          </div>
        </button>

        {/* Tile 4: Marketplace Training Modules */}
        <button
          className="action-tile tile-marketplace"
          onClick={() => onSelectTile("marketplace")}
          aria-label="कौशल्य प्रशिक्षण कोर्सेस"
          style={{
            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)",
            border: "1.5px solid rgba(56, 189, 248, 0.3)"
          }}
        >
          <div className="tile-icon-box" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
            <BookOpen />
          </div>
          <div className="tile-content">
            <div className="tile-header-row">
              <span className="tile-title" style={{ color: "#fff" }}>
                {language === "mr" ? "कौशल्य कोर्सेस" : language === "hi" ? "कौशल कोर्सेज" : "Skill Courses"}
              </span>
              <span className="tile-tag" style={{ background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8" }}>
                {language === "mr" ? "मार्गदर्शक" : language === "hi" ? "मार्गदर्शक" : "Mentors"}
              </span>
            </div>
            <p className="tile-subtitle">
              {language === "mr" ? "स्थानिक शिक्षक व तंत्रज्ञांचे प्रात्यक्षिक कोर्सेस" : language === "hi" ? "स्थानीय शिक्षकों के व्यावहारिक कोर्सेज" : "Facilitator practical courses & workshops"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ChevronRight className="tile-arrow" size={24} style={{ color: "#38bdf8" }} />
          </div>
        </button>
      </section>

      {/* Voice Assistant Floating Action Card */}
      <section className={`voice-bar ${isListening ? "listening" : ""}`} aria-label="Voice Interaction Bar">
        <div className="voice-btn-container">
          <button
            className={`mic-button ${isListening ? "active" : ""}`}
            onClick={handleToggleVoice}
            aria-label={isListening ? "Stop listening" : t.tapToSpeak}
            title={t.tapToSpeak}
          >
            {isListening ? <MicOff /> : <Mic />}
          </button>
        </div>

        <p className="voice-status-text">
          {isListening ? t.listening : t.tapToSpeak}
        </p>

        {/* Live Partial or Final Transcript Feedback */}
        {(partialTranscript || transcript) && (
          <div className="voice-feedback-box" role="status" aria-live="polite">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Sparkles size={16} style={{ color: "#f97316" }} />
              <strong style={{ fontSize: "0.85rem", color: "#f8fafc" }}>
                {partialTranscript ? "ऐकत आहे..." : t.mockSpokenPrefix}
              </strong>
            </div>
            <p>"{partialTranscript || transcript}"</p>
          </div>
        )}
      </section>
    </div>
  );
};
