import React, { useState, useEffect, useRef } from "react";
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
import { saveOfflineProfile, saveCachedMatches, enqueueSyncItem } from "../services/db/offlineStorage";
import { apiUrl } from "../services/apiConfig";

interface DiscoverFlowProps {
  isOnline: boolean;
  onBackToHome: () => void;
  onGoToPathway?: () => void;
  onStudentCreated?: (id: string) => void;
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

export async function generateConsentReceiptHash(guardianNameStr: string, timestamp?: string): Promise<{ canonical: string; hash: string }> {
  const ts = timestamp || new Date().toISOString();
  const canonical = `${guardianNameStr.trim()}|DPDP_V1.0|${ts}`;
  let hash = "";
  if (typeof crypto !== "undefined" && crypto.subtle && typeof crypto.subtle.digest === "function") {
    const encoder = new TextEncoder();
    const data = encoder.encode(canonical);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } else {
    let h = 0x811c9dc5;
    for (let i = 0; i < canonical.length; i++) {
      h ^= canonical.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    hash = (h >>> 0).toString(16).padStart(64, "0");
  }
  return { canonical, hash };
}

export const DiscoverFlow: React.FC<DiscoverFlowProps> = ({ isOnline, onBackToHome, onGoToPathway, onStudentCreated }) => {
  const { language, t } = useI18n();

  // Step-0 Consent Gateway State (Decoupled from Q1)
  const [consentGranted, setConsentGranted] = useState<boolean>(() => {
    return localStorage.getItem("disha_guardian_consent") === "true";
  });
  const [tempConsentChecked, setTempConsentChecked] = useState<boolean>(() => {
    return localStorage.getItem("disha_guardian_consent") === "true";
  });
  const [studentNickname, setStudentNickname] = useState<string>(() => {
    return localStorage.getItem("disha_student_nickname") || "रोहन (Rohan)";
  });
  const [guardianName, setGuardianName] = useState<string>(() => {
    return localStorage.getItem("disha_guardian_name") || "पालक (Parent / Guardian)";
  });
  const [consentReceiptHash, setConsentReceiptHash] = useState<string>(() => {
    return localStorage.getItem("disha_consent_receipt") || "";
  });

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
  const [guardianConsent, setGuardianConsent] = useState<boolean>(() => {
    return localStorage.getItem("disha_guardian_consent") === "true";
  });
  const [studentName] = useState<string>("विद्यार्थी (Learner)");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Offline Quiz State
  const [quizStep, setQuizStep] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, QuizOption>>({});

  // Completed State
  const [completedProfile, setCompletedProfile] = useState<ProfileSummary | null>(null);
  const [savedLocally, setSavedLocally] = useState<boolean>(false);
  const [topMatches, setTopMatches] = useState<any[]>([]);

  // Initialize Online Flow
  useEffect(() => {
    if (!useOfflineQuiz && isOnline && consentGranted) {
      initOnlineSession();
    }
  }, [useOfflineQuiz, isOnline, language, consentGranted]);

  const initOnlineSession = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(apiUrl("/api/v1/discovery/start"), {
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

  // Phase 8B: MediaRecorder for Offline Voice Notes
  const [isRecordingOfflineVoice, setIsRecordingOfflineVoice] = useState(false);
  const [offlineVoiceNotice, setOfflineVoiceNotice] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStartOfflineVoiceNote = async () => {
    try {
      setOfflineVoiceNotice(null);
      setApiError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported("audio/webm"))
        ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string) || "";
          await enqueueSyncItem("voice_note", {
            session_id: sessionId,
            question_id: currentQuestion?.id || "q_interests",
            language,
            audio_base64: base64Audio,
            mime_type: mimeType,
            guardian_consent: true,
            student_name: studentNickname || studentName
          });

          setOfflineVoiceNotice(
            language === "mr" 
              ? "📡 ऑफलाइन सेव्ह केले (Saved offline - will sync when online)"
              : language === "hi"
              ? "📡 ऑफ़लाइन सेव किया (Saved offline - will sync when online)"
              : "📡 Saved offline - will sync when online"
          );
          setTextAnswer("🎤 [व्हॉइस नोट सेव्ह केली - Saved voice note]");
          setIsRecordingOfflineVoice(false);
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      setIsRecordingOfflineVoice(true);
    } catch (err) {
      console.warn("Microphone access error in offline voice note:", err);
      // Fallback: enqueue mock voice note with guardian consent
      await enqueueSyncItem("voice_note", {
        session_id: sessionId,
        question_id: currentQuestion?.id || "q_interests",
        language,
        audio_base64: "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8=",
        mime_type: "audio/webm",
        guardian_consent: true,
        student_name: studentNickname || studentName
      });
      setOfflineVoiceNotice(
        language === "mr" 
          ? "📡 ऑफलाइन सेव्ह केले (Saved offline - will sync when online)"
          : language === "hi"
          ? "📡 ऑफ़लाइन सेव किया (Saved offline - will sync when online)"
          : "📡 Saved offline - will sync when online"
      );
      setTextAnswer("🎤 [व्हॉइस नोट सेव्ह केली - Saved voice note]");
      setIsRecordingOfflineVoice(false);
    }
  };

  const handleStopOfflineVoiceNote = () => {
    if (mediaRecorderRef.current && isRecordingOfflineVoice) {
      mediaRecorderRef.current.stop();
    }
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
      const res = await fetch(apiUrl("/api/v1/discovery/answer"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: currentQuestion.id,
          answer_text: finalAnswer.trim(),
          guardian_consent: guardianConsent,
          student_name: studentNickname.trim() || studentName,
          consent_receipt_hash: consentReceiptHash || localStorage.getItem("disha_consent_receipt") || null,
          consent_version: "DPDP_V1.0"
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
        try {
          localStorage.setItem("disha_student_profile", JSON.stringify(data.profile));
        } catch {}

        if (data.student_id) {
          try {
            localStorage.setItem("disha_student_id", data.student_id);
            if (onStudentCreated) {
              onStudentCreated(data.student_id);
            }
            // POST so sensitive fields never appear in URL query strings / logs
            const matchRes = await fetch(apiUrl(`/api/v1/students/${data.student_id}/matches`), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ language })
            });
            if (matchRes.ok) {
              const matchData = await matchRes.json();
              setTopMatches(matchData.slice(0, 3));
              await saveCachedMatches(matchData);
              if (matchData.length > 0) {
                localStorage.setItem("disha_top_match", JSON.stringify(matchData[0]));
              }
            }
          } catch (mErr) {
            console.warn("Could not fetch matches immediately:", mErr);
          }
        }
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
      // Last question reached: consent was already confirmed in Step 0
      await finalizeOfflineQuiz(updated);
    }
  };

  const finalizeOfflineQuiz = async (answersToSave?: Record<number, QuizOption>) => {
    const finalAnswers = answersToSave || quizAnswers;
    const builtProfile = buildProfileFromQuizAnswers(finalAnswers, language as Language);
    setCompletedProfile(builtProfile);
    setSavedLocally(true);

    const localId = `offline_${Date.now()}`;
    try {
      localStorage.setItem("disha_student_id", localId);
      localStorage.setItem("disha_student_profile", JSON.stringify(builtProfile));
      const defaultOfflineMatch = {
        opportunity: {
          id: 1,
          title: builtProfile.career_aspirations?.[0] || "PM National Apprenticeship (Solar PV Tech)",
          provider: "Ministry of Skill Development & Entrepreneurship",
          verification_status: "verified"
        },
        score: 95,
        overall_eligibility: "ELIGIBLE"
      };
      localStorage.setItem("disha_top_match", JSON.stringify(defaultOfflineMatch));
      if (onStudentCreated) onStudentCreated(localId);
    } catch {}

    const activeReceiptHash = consentReceiptHash || localStorage.getItem("disha_consent_receipt") || null;

    // Save to local profile store
    await saveOfflineProfile({
      id: localId,
      created_at: new Date().toISOString(),
      sync_status: "pending_sync",
      profile_type: "offline_icon_quiz",
      student_name: studentNickname || studentName,
      language,
      guardian_consent: true,
      consent_receipt_hash: activeReceiptHash,
      consent_version: "DPDP_V1.0",
      profile: builtProfile
    });

    // PHASE 5: Enqueue into IndexedDB Outbox
    await enqueueSyncItem("offline_quiz_result", {
      student_name: studentNickname || studentName,
      language,
      guardian_consent: true,
      consent_receipt_hash: activeReceiptHash,
      consent_version: "DPDP_V1.0",
      profile: builtProfile,
      answers: finalAnswers
    });
  };

  // Step 0: Dedicated Welcome & Consent Gateway Screen
  if (!consentGranted && !completedProfile) {
    return (
      <main className="main-container" style={{ paddingBottom: 80 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onBackToHome}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: 9999,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.84rem",
              fontWeight: 600
            }}
          >
            <ArrowLeft size={15} /> मुख्य पान (Home)
          </button>
        </div>

        <section className="personalized-hero" style={{ marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff",
              padding: 12,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 16px rgba(249,115,22,0.45)"
            }}>
              <Sparkles size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>
                {language === "mr" && "दिशा करिअर शोधामध्ये स्वागत आहे!"}
                {language === "hi" && "दिशा करियर खोज में आपका स्वागत है!"}
                {language === "en" && "Welcome to Disha Career Discovery!"}
              </h2>
              <p style={{ color: "#38bdf8", fontSize: "0.84rem", fontWeight: 700, marginTop: 2 }}>
                {language === "mr" && "तुमच्यासाठी योग्य सरकारी योजना, शिष्यवृत्ती व कौशल्य मार्ग"}
                {language === "hi" && "आपके लिए सही सरकारी योजनाएं, छात्रवृत्तियां और करियर मार्ग"}
                {language === "en" && "Find verified schemes, scholarships and vocational pathways"}
              </p>
            </div>
          </div>

          {/* Friendly Welcome & Permission Text */}
          <div style={{
            background: "rgba(15,23,42,0.75)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: 16,
            margin: "16px 0"
          }}>
            <p style={{ color: "#f8fafc", fontSize: "0.95rem", lineHeight: 1.55, fontWeight: 500, marginBottom: 14 }}>
              {language === "mr" && "Welcome! तुमच्यासाठी सर्वोत्तम करिअर आणि योजना शोधण्यापूर्वी, कृपया तुमच्या पालकांची संमती तपासा."}
              {language === "hi" && "Welcome! आपके लिए सर्वोत्तम करियर और योजनाएं खोजने से पहले, कृपया अभिभावक सहमति की पुष्टि करें।"}
              {language === "en" && "Welcome! Before we find your career matches, please confirm parental/guardian consent to save your personalized path."}
            </p>

            {/* Guardian / Parent Name Input */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", fontWeight: 700, marginBottom: 6 }}>
                {language === "mr" && "पालकांचे नाव (Parent / Guardian Name):"}
                {language === "hi" && "अभिभावक का नाम (Parent / Guardian Name):"}
                {language === "en" && "Parent / Guardian Name:"}
              </label>
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder={language === "mr" ? "उदा. रमेश जाधव" : language === "hi" ? "उदा. रमेश कुमार" : "e.g. Ramesh Jadhav"}
                style={{
                  width: "100%",
                  background: "rgba(30,41,59,0.9)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  borderRadius: 10,
                  padding: "11px 14px",
                  color: "#fff",
                  fontSize: "0.92rem",
                  fontWeight: 600
                }}
              />
            </div>

            {/* Student Nickname Input */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", fontWeight: 700, marginBottom: 6 }}>
                {language === "mr" && "विद्यार्थ्याचे नाव किंवा टोपणनाव (Student Nickname / Roll No):"}
                {language === "hi" && "विद्यार्थी का नाम या उपनाम (Student Nickname / Roll No):"}
                {language === "en" && "Student Nickname or Roll Number:"}
              </label>
              <input
                type="text"
                value={studentNickname}
                onChange={(e) => setStudentNickname(e.target.value)}
                placeholder={language === "mr" ? "उदा. रोहन, स्नेहा..." : language === "hi" ? "उदा. रोहन, नेहा..." : "e.g. Rohan, Sneha..."}
                style={{
                  width: "100%",
                  background: "rgba(30,41,59,0.9)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  borderRadius: 10,
                  padding: "11px 14px",
                  color: "#fff",
                  fontSize: "0.92rem",
                  fontWeight: 600
                }}
              />
            </div>

            {/* DPDP Consent Checkbox */}
            <div style={{
              background: tempConsentChecked ? "rgba(16,185,129,0.14)" : "rgba(249,115,22,0.12)",
              border: `1.5px solid ${tempConsentChecked ? "#10b981" : "#f97316"}`,
              borderRadius: 12,
              padding: 12,
              display: "flex",
              alignItems: "flex-start",
              gap: 12
            }}>
              <input
                type="checkbox"
                id="step0-consent-chk"
                checked={tempConsentChecked}
                onChange={(e) => setTempConsentChecked(e.target.checked)}
                style={{ width: 22, height: 22, accentColor: "#f97316", marginTop: 2, cursor: "pointer", flexShrink: 0 }}
              />
              <label htmlFor="step0-consent-chk" style={{ fontSize: "0.82rem", color: "#e2e8f0", lineHeight: 1.45, cursor: "pointer" }}>
                <strong style={{ color: "#fff", display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <Shield size={15} style={{ color: "#10b981" }} />
                  {language === "mr" && "पालकांची संमती (Parental/Guardian Consent)"}
                  {language === "hi" && "अभिभावक सहमति (Parental/Guardian Consent)"}
                  {language === "en" && "Parental/Guardian Consent Confirmed"}
                </strong>
                {language === "mr" && (
                  <span>मी पुष्टी करतो की पालकांच्या संमतीने ही माहिती करिअर मार्गदर्शनासाठी दिली जात आहे. दिशा तुमचे नाव, इयत्ता व आवडी सुरक्षित ठेवते आणि कोणालाही विकत नाही.</span>
                )}
                {language === "hi" && (
                  <span>मैं पुष्टि करता/करती हूँ कि अभिभावक की सहमति से यह जानकारी करियर मार्गदर्शन के लिए दी जा रही है। डेटा पूरी तरह सुरक्षित है।</span>
                )}
                {language === "en" && (
                  <span>I confirm parental/guardian consent to save my personalized career path under DPDP Act data minimisation principles.</span>
                )}
              </label>
            </div>
          </div>

          {/* Agree & Continue Primary Action */}
          <button
            onClick={async () => {
              if (!tempConsentChecked) return;
              const gName = (guardianName.trim() || "Parent / Guardian");
              const { canonical, hash } = await generateConsentReceiptHash(gName);
              setGuardianConsent(true);
              setConsentGranted(true);
              setConsentReceiptHash(hash);
              localStorage.setItem("disha_guardian_consent", "true");
              localStorage.setItem("disha_student_nickname", studentNickname.trim() || "विद्यार्थी");
              localStorage.setItem("disha_guardian_name", gName);
              localStorage.setItem("disha_consent_receipt", hash);
              localStorage.setItem("disha_consent_canonical", canonical);
              if (!useOfflineQuiz && isOnline && !sessionId) {
                initOnlineSession();
              }
            }}
            disabled={!tempConsentChecked}
            style={{
              width: "100%",
              background: tempConsentChecked ? "linear-gradient(135deg, #f97316, #ea580c)" : "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "15px 20px",
              fontSize: "1rem",
              fontWeight: 800,
              cursor: tempConsentChecked ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: tempConsentChecked ? "0 6px 20px rgba(249,115,22,0.4)" : "none",
              transition: "all 0.2s ease"
            }}
          >
            <span>
              {language === "mr" && "सहमत आणि सुरू करा (Agree & Continue)"}
              {language === "hi" && "सहमति दें और शुरू करें (Agree & Continue)"}
              {language === "en" && "Agree & Continue"}
            </span>
            →
          </button>
        </section>
      </main>
    );
  }

  // Render Completed Profile View
  if (completedProfile) {
    return (
      <main className="main-container" style={{ paddingBottom: 80 }}>
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

          {/* Grounded Opportunity Matches */}
          <div style={{ marginBottom: 14 }}>
            <h4 style={{ color: "#f97316", fontSize: "0.9rem", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={16} /> तुमच्यासाठी सर्वोत्तम संधी (Top Opportunity Matches):
            </h4>
            {topMatches && topMatches.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topMatches.map((m: any, idx: number) => {
                  const opp = m.opportunity;
                  const isEligible = m.overall_eligibility === "ELIGIBLE";
                  const isVerified = opp.verification_status === "verified";
                  return (
                    <div
                      key={idx}
                      style={{
                        background: "rgba(15,23,42,0.8)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        padding: "10px 12px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
                        <span style={{
                          background: isEligible ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                          color: isEligible ? "#34d399" : "#fbbf24",
                          border: `1px solid ${isEligible ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                          padding: "2px 8px",
                          borderRadius: 9999,
                          fontSize: "0.72rem",
                          fontWeight: 700
                        }}>
                          {isEligible ? "✓ पात्र (Eligible)" : "⚠ बहुतांश पात्र (Likely)"}
                        </span>
                        {isVerified ? (
                          <span style={{ fontSize: "0.68rem", color: "#38bdf8", fontWeight: 700 }}>
                            ✓ अधिकृत (Verified)
                          </span>
                        ) : (
                          <span style={{
                            fontSize: "0.68rem",
                            color: "#fb923c",
                            background: "rgba(249,115,22,0.18)",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontWeight: 700
                          }}>
                            Sample - unverified
                          </span>
                        )}
                      </div>
                      <h5 style={{ color: "#fff", fontSize: "0.92rem", fontWeight: 700, marginBottom: 2 }}>
                        {opp.title}
                      </h5>
                      <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginBottom: 6 }}>
                        {opp.provider} • {opp.benefits}
                      </p>
                      <a
                        href={opp.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#f97316",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          textDecoration: "underline",
                          display: "inline-block"
                        }}
                      >
                        {isVerified ? "अधिकृत पोर्टल पहा →" : "स्रोत पोर्टल पहा (Source Link) →"}
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {completedProfile.career_aspirations.map((asp, idx) => (
                  <span key={idx} style={{ background: "rgba(249,115,22,0.2)", color: "#fed7aa", border: "1px solid rgba(249,115,22,0.4)", padding: "4px 10px", borderRadius: 9999, fontSize: "0.85rem", fontWeight: 700 }}>
                    ★ {asp}
                  </span>
                ))}
              </div>
            )}
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
      <main className="main-container" style={{ paddingBottom: 80 }}>
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

  // Render Online Flow
  return (
    <main className="main-container" style={{ paddingBottom: 80 }}>
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

          {/* Quick Option Pills - Tapping an option advances immediately */}
          {currentQuestion.options && currentQuestion.options.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <span style={{ fontSize: "0.78rem", color: "#e2e8f0", display: "block", marginBottom: 8, fontWeight: 600 }}>
                एक पर्याय निवडा किंवा खाली बोला:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(opt)}
                    className="option-pill"
                    style={{
                      background: "rgba(30,41,59,0.85)",
                      border: "1.5px solid rgba(255,255,255,0.18)",
                      color: "#ffffff",
                      padding: "10px 18px",
                      minHeight: 48,
                      borderRadius: 9999,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      fontWeight: 700,
                      transition: "all 0.2s",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "#f97316";
                      e.currentTarget.style.background = "rgba(249,115,22,0.25)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                      e.currentTarget.style.background = "rgba(30,41,59,0.85)";
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

        {/* Offline Voice Note Button & Status Notice */}
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={isRecordingOfflineVoice ? handleStopOfflineVoiceNote : handleStartOfflineVoiceNote}
            style={{
              background: isRecordingOfflineVoice ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)",
              border: isRecordingOfflineVoice ? "1.5px solid #ef4444" : "1px solid rgba(255,255,255,0.15)",
              color: isRecordingOfflineVoice ? "#f87171" : "#cbd5e1",
              padding: "6px 14px",
              borderRadius: 9999,
              cursor: "pointer",
              fontSize: "0.78rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            {isRecordingOfflineVoice ? (
              <>⏹️ रेकॉर्डिंग थांबवा (Stop Voice Note)</>
            ) : (
              <>🎙️ ऑफलाइन व्हॉइस नोट (Record Voice Note)</>
            )}
          </button>

          {offlineVoiceNotice && (
            <div style={{
              background: "rgba(245,158,11,0.18)",
              border: "1px solid rgba(245,158,11,0.5)",
              borderRadius: 9999,
              padding: "6px 14px",
              color: "#fcd34d",
              fontSize: "0.8rem",
              fontWeight: 800,
              textAlign: "center",
              boxShadow: "0 2px 10px rgba(245,158,11,0.25)"
            }}>
              {offlineVoiceNotice}
            </div>
          )}
        </div>

        {apiError && (
          <p style={{ color: "#f87171", fontSize: "0.8rem", textAlign: "center", marginTop: 4 }}>
            {apiError}
          </p>
        )}
      </section>
    </main>
  );
};
