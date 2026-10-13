import React, { useState, useEffect } from "react";
import { 
  Compass, Mic, MicOff, Send, Volume2, CheckCircle2, 
  Sparkles, ArrowLeft, Shield, WifiOff, Sun, Sprout, 
  Wrench, Laptop, Tractor, Hammer, HeartPulse, Zap, Activity, 
  ShieldAlert, Smartphone, Heart, Lightbulb, Leaf, Book, 
  GraduationCap, Award, Briefcase, MapPin, Building, Home, 
  Navigation, Wifi, ShoppingBag 
} from "lucide-react";
import { useI18n, type Language } from "../i18n";
import { voiceService } from "../services/voice";
import { OFFLINE_QUIZ_QUESTIONS, buildProfileFromQuizAnswers, type QuizOption } from "../data/offlineQuizData";
import { saveOfflineProfile } from "../services/db/offlineStorage";

interface DiscoverFlowProps {
  isOnline: boolean;
  onBackToHome: () => void;
  onGoToPathway?: () => void;
}

interface QuestionDTO {
  id: string;
  order: number;
  key: string;
  icon: string;
  text: string;
  subtext: string;
  options: string[];
}

interface ProfileSummary {
  grade_level: number;
  state: string;
  district: string;
  primary_interests: string[];
  practical_skills: string[];
  career_aspirations: string[];
  is_vocational_recommended: boolean;
  mobility_preference: string;
  family_livelihood_context?: string;
  confidence_score?: number;
}

const ICON_MAP: Record<string, React.FC<any>> = {
  Sun, Sprout, Wrench, Laptop, Tractor, Hammer, HeartPulse, Zap,
  Activity, ShieldAlert, Smartphone, Heart, Lightbulb, Leaf, Book,
  GraduationCap, Award, Briefcase, MapPin, Building, Home, Navigation,
  Wifi, ShoppingBag
};

export const DiscoverFlow: React.FC<DiscoverFlowProps> = ({ isOnline, onBackToHome, onGoToPathway }) => {
  const { language, t } = useI18n();

  // Mode: online conversational flow vs offline icon quiz
  const [useOfflineQuiz, setUseOfflineQuiz] = useState<boolean>(!isOnline);

  // Online Flow State
  const [sessionId, setSessionId] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [totalQuestions, setTotalQuestions] = useState<number>(7);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionDTO | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [partialVoice, setPartialVoice] = useState<string>("");
  const [guardianConsent, setGuardianConsent] = useState<boolean>(true);
  const [studentName] = useState<string>("विद्यार्थी (Learner)");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Offline Quiz State
  const [quizStep, setQuizStep] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, QuizOption>>({});

  // Completed State
  const [completedProfile, setCompletedProfile] = useState<ProfileSummary | null>(null);
  const [savedLocally, setSavedLocally] = useState<boolean>(false);

  // Initialize Online Flow
  useEffect(() => {
    if (!useOfflineQuiz && isOnline) {
      initOnlineSession();
    }
  }, [useOfflineQuiz, isOnline, language]);

  const initOnlineSession = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/discovery/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language })
      });
      if (!res.ok) throw new Error("Failed to start discovery session");
      const data = await res.json();
      setSessionId(data.session_id);
      setCurrentStep(data.current_step);
      setTotalQuestions(data.total_questions);
      setCurrentQuestion(data.question);
      
      // Read out question aloud
      const langCode = language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";
      voiceService.speak(data.question.text, langCode);
    } catch (err: any) {
      console.warn("Backend API not reachable, switching to offline quiz:", err);
      setUseOfflineQuiz(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakQuestion = () => {
    if (currentQuestion) {
      const langCode = language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";
      voiceService.speak(currentQuestion.text, langCode);
    }
  };

  const handleToggleVoice = async () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      setPartialVoice("");
      return;
    }

    setIsListening(true);
    setPartialVoice("");
    const langCode = language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";

    await voiceService.startListening({
      language: langCode,
      onPartial: (partial) => setPartialVoice(partial),
      onFinal: (finalText) => {
        setIsListening(false);
        setPartialVoice("");
        setTextAnswer(finalText);
      },
      onError: (err) => {
        console.warn("Voice error:", err);
        setIsListening(false);
        setPartialVoice("");
      }
    });
  };

  const handleSelectOption = (opt: string) => {
    setTextAnswer(opt);
    handleSubmitAnswer(opt);
  };

  const handleSubmitAnswer = async (ansToSubmit?: string) => {
    const finalAnswer = ansToSubmit || textAnswer;
    if (!finalAnswer.trim() || !currentQuestion) return;

    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/discovery/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: currentQuestion.id,
          answer_text: finalAnswer.trim(),
          guardian_consent: guardianConsent,
          student_name: studentName
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Error submitting answer");
      }

      const data = await res.json();
      setTextAnswer("");

      if (data.is_complete && data.profile) {
        setCompletedProfile(data.profile);
      } else if (data.next_question) {
        setCurrentStep(data.current_step);
        setCurrentQuestion(data.next_question);
        // Read out next question aloud
        const langCode = language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";
        voiceService.speak(data.next_question.text, langCode);
      }
    } catch (err: any) {
      setApiError(err.message || "Failed to submit answer");
    } finally {
      setIsLoading(false);
    }
  };

  // Offline Quiz Answer Selection
  const handleOfflineQuizSelect = async (option: QuizOption) => {
    const qIndex = quizStep + 1;
    const updated = { ...quizAnswers, [qIndex]: option };
    setQuizAnswers(updated);

    if (quizStep + 1 < OFFLINE_QUIZ_QUESTIONS.length) {
      setQuizStep(quizStep + 1);
    } else {
      // Completed all 8 questions offline
      const builtProfile = buildProfileFromQuizAnswers(updated, language as Language);
      setCompletedProfile(builtProfile);
      setSavedLocally(true);

      // Save to IndexedDB
      await saveOfflineProfile({
        id: `offline_${Date.now()}`,
        created_at: new Date().toISOString(),
        sync_status: "pending_sync",
        profile_type: "offline_icon_quiz",
        student_name: studentName,
        language,
        guardian_consent: guardianConsent,
        profile: builtProfile
      });
    }
  };

  // Render Completed Profile View
  if (completedProfile) {
    return (
      <main className="main-container" style={{ paddingBottom: 60 }}>
        <div className="greeting-card" style={{ borderTop: "4px solid #10b981" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: "#10b981", color: "#fff", padding: 8, borderRadius: "50%" }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2>
                  {language === "mr" && "तुमचा दिशा करिअर प्रोफाईल तयार आहे!"}
                  {language === "hi" && "आपका दिशा करियर प्रोफाइल तैयार है!"}
                  {language === "en" && "Your Disha Career Profile is Ready!"}
                </h2>
                <p style={{ color: "#34d399", fontSize: "0.85rem", fontWeight: 600 }}>
                  {savedLocally ? "✓ ऑफलाइन सेव्ह झाले (सिंक प्रलंबित)" : "✓ डेटाबेसमध्ये यशस्वीरीत्या नोंदवले गेले"}
                </p>
              </div>
            </div>
            <button
              onClick={onBackToHome}
              style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 9999, cursor: "pointer", fontSize: "0.8rem" }}
            >
              ← होम
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "16px 0" }}>
            <div style={{ background: "rgba(15,23,42,0.6)", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>इयत्ता / वर्ग (Grade)</span>
              <strong style={{ color: "#fff", fontSize: "1.1rem" }}>{completedProfile.grade_level} वी / Class {completedProfile.grade_level}</strong>
            </div>
            <div style={{ background: "rgba(15,23,42,0.6)", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>स्थान (Location)</span>
              <strong style={{ color: "#fff", fontSize: "1.1rem" }}>{completedProfile.district}, {completedProfile.state}</strong>
            </div>
          </div>

          {/* Aspirations */}
          <div style={{ marginBottom: 14 }}>
            <h4 style={{ color: "#f97316", fontSize: "0.9rem", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={16} /> शिफारस केलेले करिअर मार्ग (Top Career Paths):
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {completedProfile.career_aspirations.map((asp, idx) => (
                <span key={idx} style={{ background: "rgba(249,115,22,0.2)", color: "#fed7aa", border: "1px solid rgba(249,115,22,0.4)", padding: "4px 10px", borderRadius: 9999, fontSize: "0.85rem", fontWeight: 700 }}>
                  ★ {asp}
                </span>
              ))}
            </div>
          </div>

          {/* Interests & Skills */}
          <div style={{ marginBottom: 14 }}>
            <h4 style={{ color: "#38bdf8", fontSize: "0.9rem", marginBottom: 6 }}>
              तुमची कौशल्ये व आवडी (Interests & Skills):
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {completedProfile.primary_interests.concat(completedProfile.practical_skills).map((item, idx) => (
                <span key={idx} style={{ background: "rgba(2,132,199,0.15)", color: "#bae6fd", border: "1px solid rgba(2,132,199,0.3)", padding: "4px 10px", borderRadius: 9999, fontSize: "0.8rem" }}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Next Steps CTA */}
          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <button
              onClick={onGoToPathway || onBackToHome}
              className="submit-btn"
              style={{ flex: 1, padding: 14, fontSize: "0.95rem" }}
            >
              माझा ३० दिवसांचा मार्ग पहा (View Pathway) →
            </button>
            <button
              onClick={onBackToHome}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "14px 18px", borderRadius: 12, cursor: "pointer", fontWeight: 600 }}
            >
              मुख्य पान
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Render Offline Icon Quiz
  if (useOfflineQuiz) {
    const qData = OFFLINE_QUIZ_QUESTIONS[quizStep];
    return (
      <main className="main-container">
        {/* Header & Mode Switch */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onBackToHome}
            style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 9999, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}
          >
            <ArrowLeft size={14} /> मागे (Back)
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.75rem", background: "rgba(249,115,22,0.15)", color: "#fdba74", padding: "4px 10px", borderRadius: 9999, border: "1px solid rgba(249,115,22,0.3)", display: "flex", alignItems: "center", gap: 4 }}>
              <WifiOff size={12} /> ऑफलाइन आयकॉन क्विझ
            </span>
            {isOnline && (
              <button
                onClick={() => setUseOfflineQuiz(false)}
                style={{ background: "rgba(2,132,199,0.2)", border: "1px solid rgba(2,132,199,0.4)", color: "#7dd3fc", padding: "4px 10px", borderRadius: 9999, fontSize: "0.75rem", cursor: "pointer" }}
              >
                ऑनलाईन बोला →
              </button>
            )}
          </div>
        </div>

        {/* Quiz Question Card */}
        <div className="greeting-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 700 }}>
              प्रश्न {quizStep + 1} / {OFFLINE_QUIZ_QUESTIONS.length}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {OFFLINE_QUIZ_QUESTIONS.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: i === quizStep ? "#f97316" : i < quizStep ? "#10b981" : "rgba(255,255,255,0.2)"
                  }}
                />
              ))}
            </div>
          </div>
          <h2>{qData.title[language as Language] || qData.title.mr}</h2>
          <p>{qData.subtitle[language as Language] || qData.subtitle.mr}</p>

          {/* 4 Big Icon Option Tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
            {qData.options.map((opt) => {
              const IconComp = ICON_MAP[opt.icon] || Compass;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleOfflineQuizSelect(opt)}
                  style={{
                    background: "rgba(30,41,59,0.7)",
                    border: "1.5px solid rgba(255,255,255,0.12)",
                    borderRadius: 16,
                    padding: "16px 12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    textAlign: "center"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "#f97316";
                    e.currentTarget.style.background = "rgba(45,60,88,0.9)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.background = "rgba(30,41,59,0.7)";
                  }}
                >
                  <div style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", padding: 12, borderRadius: 12 }}>
                    <IconComp size={28} />
                  </div>
                  <span style={{ color: "#f8fafc", fontSize: "0.88rem", fontWeight: 700, lineHeight: 1.25 }}>
                    {opt.label[language as Language] || opt.label.mr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // Render Online 7-Question Conversational Flow
  return (
    <main className="main-container">
      {/* Top Navigation & Status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={onBackToHome}
          style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 9999, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}
        >
          <ArrowLeft size={14} /> मुख्य पान (Home)
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setUseOfflineQuiz(true)}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", padding: "4px 10px", borderRadius: 9999, fontSize: "0.75rem", cursor: "pointer" }}
          >
            ऑफलाइन क्विझ वापरा
          </button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
        <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 700 }}>
          प्रश्न {currentStep} / {totalQuestions}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: totalQuestions }).map((_, idx) => (
            <span
              key={idx}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: idx + 1 === currentStep ? "#f97316" : idx + 1 < currentStep ? "#10b981" : "rgba(255,255,255,0.2)",
                boxShadow: idx + 1 === currentStep ? "0 0 8px #f97316" : "none"
              }}
            />
          ))}
        </div>
      </div>

      {/* Current Question Card */}
      {currentQuestion && (
        <section className="greeting-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div>
              <h2>{currentQuestion.text}</h2>
              <p>{currentQuestion.subtext}</p>
            </div>
            <button
              onClick={handleSpeakQuestion}
              style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", color: "#fdba74", padding: 10, borderRadius: "50%", cursor: "pointer", flexShrink: 0 }}
              title="प्रश्न ऐका (Listen Question)"
            >
              <Volume2 size={20} />
            </button>
          </div>

          {/* Quick Option Pills */}
          {currentQuestion.options && currentQuestion.options.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: 8 }}>
                एक पर्याय निवडा किंवा खाली बोला:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(opt)}
                    style={{
                      background: "rgba(30,41,59,0.8)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#f8fafc",
                      padding: "8px 14px",
                      borderRadius: 9999,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      fontWeight: 600,
                      transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "#f97316";
                      e.currentTarget.style.background = "rgba(249,115,22,0.2)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                      e.currentTarget.style.background = "rgba(30,41,59,0.8)";
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Voice Interaction & Input Section */}
      <section className={`voice-bar ${isListening ? "listening" : ""}`}>
        <div className="voice-btn-container">
          <button
            className={`mic-button ${isListening ? "active" : ""}`}
            onClick={handleToggleVoice}
            title={isListening ? "Stop listening" : "माइकवर बोला (Tap to speak)"}
          >
            {isListening ? <MicOff /> : <Mic />}
          </button>
        </div>

        <p className="voice-status-text">
          {isListening ? t.listening : "माइकवर टॅप करून तुमचे उत्तर बोला"}
        </p>

        {partialVoice && (
          <div className="voice-feedback-box">
            <p>"{partialVoice}"</p>
          </div>
        )}

        {/* Fallback Text Input & Submit */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, padding: "10px 14px", fontSize: "0.9rem" }}
            placeholder="किंवा येथे टाईप करा (उदा. १० वी, सोलर, शेती...)"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitAnswer();
            }}
          />
          <button
            onClick={() => handleSubmitAnswer()}
            disabled={!textAnswer.trim() || isLoading}
            style={{
              background: textAnswer.trim() ? "var(--primary-saffron)" : "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "0 16px",
              cursor: textAnswer.trim() ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Send size={18} />
          </button>
        </div>

        {apiError && (
          <p style={{ color: "#f87171", fontSize: "0.8rem", textAlign: "center", marginTop: 4 }}>
            {apiError}
          </p>
        )}
      </section>

      {/* DPDP Act Child-Safe Guardian Consent Checkbox */}
      <div style={{
        background: "rgba(15,23,42,0.8)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: 12,
        display: "flex",
        alignItems: "flex-start",
        gap: 10
      }}>
        <input
          type="checkbox"
          id="guardian-consent-chk"
          checked={guardianConsent}
          onChange={(e) => setGuardianConsent(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: "#f97316", marginTop: 2, cursor: "pointer" }}
        />
        <label htmlFor="guardian-consent-chk" style={{ fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.4, cursor: "pointer" }}>
          <strong style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Shield size={13} style={{ color: "#10b981" }} /> पालकांची संमती (Guardian Consent):
          </strong>{" "}
          माहिती गोपनीयता आणि DPDP कायद्यानुसार करिअर मार्गदर्शनासाठी प्राथमिक प्रोफाइल तयार करण्यास पालकांची संमती आहे.
        </label>
      </div>
    </main>
  );
};
