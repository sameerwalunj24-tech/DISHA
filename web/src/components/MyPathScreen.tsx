import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowLeft,
  Volume2,
  VolumeX,
  CheckCircle2,
  Circle,
  ExternalLink,
  Lock,
  Clock,
  Calendar,
  Layers,
  Award,
  Shield,
  Wrench,
  Zap,
  Sun,
  BatteryCharging,
  Gauge,
  FileText,
  Heart,
  Sprout,
  Monitor,
  Activity,
  Compass,
  DollarSign,
  Target,
  Check
} from "lucide-react";

import { useI18n } from "../i18n";
import type { Language } from "../i18n";
import { voiceService } from "../services/voice";
import {
  savePathwayProgress,
  getPathwayProgress,
  saveCachedPathway,
  getCachedPathway,
  getOfflineProfiles
} from "../services/db/offlineStorage";
import { DEFAULT_OFFLINE_PATHWAYS } from "../data/defaultPathways";
import type {
  PathwayData,
  PathwayStep,
  PathwayMilestone,
  MultiLingualText
} from "../data/defaultPathways";

interface MyPathScreenProps {
  isOnline: boolean;
  studentId: string | null;
  onBackToHome: () => void;
  onGoToOpportunities?: () => void;
}

export const MyPathScreen: React.FC<MyPathScreenProps> = ({
  isOnline,
  studentId,
  onBackToHome,
  onGoToOpportunities
}) => {
  const { language } = useI18n();
  const [activeStage, setActiveStage] = useState<"next_30_days" | "months_3_to_6" | "years_1_to_2">("next_30_days");
  const [pathway, setPathway] = useState<PathwayData | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [syncStatus, setSyncStatus] = useState<"pending_sync" | "synced">("pending_sync");
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOfflineLoaded, setIsOfflineLoaded] = useState<boolean>(false);

  // Helper for multilingual text
  const getText = (obj?: MultiLingualText | null): string => {
    if (!obj) return "";
    return obj[language as Language] || obj.mr || obj.en || "";
  };

  // Render icon based on name
  const renderStepIcon = (iconName: string, isDone: boolean) => {
    const color = isDone ? "#10b981" : "#f97316";
    const size = 20;

    switch (iconName) {
      case "Shield": return <Shield size={size} style={{ color }} />;
      case "Wrench": return <Wrench size={size} style={{ color }} />;
      case "Zap": return <Zap size={size} style={{ color }} />;
      case "Sun": return <Sun size={size} style={{ color }} />;
      case "BatteryCharging": return <BatteryCharging size={size} style={{ color }} />;
      case "Gauge": return <Gauge size={size} style={{ color }} />;
      case "FileText": return <FileText size={size} style={{ color }} />;
      case "Award": return <Award size={size} style={{ color }} />;
      case "Heart": return <Heart size={size} style={{ color }} />;
      case "Sprout": return <Sprout size={size} style={{ color }} />;
      case "Monitor": return <Monitor size={size} style={{ color }} />;
      case "Activity": return <Activity size={size} style={{ color }} />;
      case "Compass": return <Compass size={size} style={{ color }} />;
      case "DollarSign": return <DollarSign size={size} style={{ color }} />;
      case "Target": return <Target size={size} style={{ color }} />;
      default: return <Sparkles size={size} style={{ color }} />;
    }
  };

  // Load Pathway data and saved progress
  useEffect(() => {
    let isMounted = true;

    async function loadPathwayAndProgress() {
      setIsLoading(true);

      // 1. Load saved ticks from IndexedDB first (works offline and online)
      const progressKey = studentId || "current_student";
      const savedProgress = await getPathwayProgress(progressKey);
      if (savedProgress && savedProgress.completed_step_ids) {
        setCompletedSteps(new Set(savedProgress.completed_step_ids));
        setSyncStatus(savedProgress.sync_status === "synced" ? "synced" : "pending_sync");
      }

      // 2. Try fetching from backend if online & studentId is known
      let loadedData: PathwayData | null = null;

      if (isOnline && studentId) {
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/v1/students/${studentId}/pathway`);
          if (res.ok) {
            const apiData = await res.json();
            loadedData = apiData;
            // Cache to IndexedDB for subsequent offline use
            await saveCachedPathway(apiData, `student_${studentId}`);
            await saveCachedPathway(apiData, "latest_pathway");
            setIsOfflineLoaded(false);
          }
        } catch (err) {
          console.warn("Could not fetch pathway from API, checking local cache:", err);
        }
      }

      // 3. If API didn't return data (offline or no studentId yet), load from IndexedDB cache
      if (!loadedData) {
        const cached = await getCachedPathway(studentId ? `student_${studentId}` : "latest_pathway");
        if (cached) {
          loadedData = cached;
          setIsOfflineLoaded(true);
        }
      }

      // 4. If still no pathway, select from default templates using profile or default to electrical_solar / general_explore
      if (!loadedData) {
        // Inspect offline profiles to pick appropriate template
        const profiles = await getOfflineProfiles();
        let chosenCluster = "electrical_solar";

        if (profiles && profiles.length > 0) {
          const latestProfile = profiles[profiles.length - 1].profile;
          const interestsStr = (latestProfile.primary_interests || []).join(" ").toLowerCase();
          const skillsStr = (latestProfile.practical_skills || []).join(" ").toLowerCase();
          const combined = interestsStr + " " + skillsStr;

          if (combined.includes("farm") || combined.includes("agri") || combined.includes("dairy") || combined.includes("शेती") || combined.includes("दूध")) {
            chosenCluster = "agriculture_dairy";
          } else if (combined.includes("health") || combined.includes("nurse") || combined.includes("hospital") || combined.includes("आरोग्य")) {
            chosenCluster = "healthcare";
          } else if (combined.includes("comp") || combined.includes("digit") || combined.includes("bank") || combined.includes("संगणक")) {
            chosenCluster = "it_digital";
          } else if (combined.includes("solar") || combined.includes("electric") || combined.includes("सोलर") || combined.includes("वीज")) {
            chosenCluster = "electrical_solar";
          } else {
            chosenCluster = "general_explore";
          }
        }

        loadedData = DEFAULT_OFFLINE_PATHWAYS[chosenCluster] || DEFAULT_OFFLINE_PATHWAYS.electrical_solar;
        setIsOfflineLoaded(true);
      }

      if (isMounted) {
        setPathway(loadedData);
        setIsLoading(false);
      }
    }

    loadPathwayAndProgress();

    return () => {
      isMounted = false;
      voiceService.cancelSpeech();
    };
  }, [isOnline, studentId]);

  // Toggle step completion and persist in IndexedDB
  const handleToggleStep = async (stepId: string) => {
    const updated = new Set(completedSteps);
    if (updated.has(stepId)) {
      updated.delete(stepId);
    } else {
      updated.add(stepId);
    }
    setCompletedSteps(updated);

    // Save progress into IndexedDB marked pending_sync
    const progressKey = studentId || "current_student";
    const status: "pending_sync" = "pending_sync";
    setSyncStatus(status);

    await savePathwayProgress({
      pathway_key: progressKey,
      completed_step_ids: Array.from(updated),
      sync_status: status,
      updated_at: new Date().toISOString()
    });
  };

  // Read aloud helper using WebSpeechVoiceAdapter
  const handleReadAloud = (id: string, text: string) => {
    if (isSpeakingId === id) {
      voiceService.cancelSpeech();
      setIsSpeakingId(null);
    } else {
      setIsSpeakingId(id);
      const langCode = language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";
      voiceService.speak(text, langCode);
      // Auto-clear speaking indicator after 6 seconds
      setTimeout(() => {
        setIsSpeakingId(null);
      }, 6000);
    }
  };

  // Calculate 30-day progress
  const all30DaySteps: PathwayStep[] = [];
  if (pathway?.stages?.next_30_days?.weeks) {
    pathway.stages.next_30_days.weeks.forEach((w) => {
      if (w.steps) {
        w.steps.forEach((s) => all30DaySteps.push(s));
      }
    });
  }

  const totalSteps = all30DaySteps.length || 1;
  const completedCount = all30DaySteps.filter((s) => completedSteps.has(s.id)).length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  // SVG Ring calculation
  const ringRadius = 42;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  if (isLoading) {
    return (
      <main className="main-container" style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "#f97316", fontSize: "1.1rem" }}>
          {language === "mr" && "तुमचा ३० दिवसांचा मार्ग तयार होत आहे..."}
          {language === "hi" && "आपका ३० दिनों का मार्ग तैयार हो रहा है..."}
          {language === "en" && "Loading your personalized 30-day pathway..."}
        </p>
      </main>
    );
  }

  return (
    <main className="main-container" style={{ paddingBottom: 80 }}>
      {/* Top Header Card */}
      <div
        className="greeting-card"
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          marginBottom: 16
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "#f97316", color: "#fff", padding: 8, borderRadius: 12 }}>
              <Sparkles size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "#fff" }}>
                {language === "mr" && "माझा मार्ग - ३० दिवसांची वैयक्तिक योजना"}
                {language === "hi" && "मेरा मार्ग - ३० दिनों की व्यक्तिगत योजना"}
                {language === "en" && "My Pathway - 30-Day Action Plan"}
              </h1>
              <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>
                {pathway ? getText(pathway.title) : "लोड होत आहे..."}
              </p>
            </div>
          </div>

          <button
            onClick={onBackToHome}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#fff",
              padding: "6px 14px",
              borderRadius: 9999,
              cursor: "pointer",
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <ArrowLeft size={14} />
            {language === "mr" && "मागे जा"}
            {language === "hi" && "पीछे"}
            {language === "en" && "Back"}
          </button>
        </div>

        {/* Progress & Sync Status Banner */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 16,
            background: "rgba(15, 23, 42, 0.6)",
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            alignItems: "center"
          }}
        >
          {/* Progress Ring */}
          <div style={{ position: "relative", width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="96" height="96" style={{ transform: "rotate(-90deg)" }}>
              <circle
                cx="48"
                cy="48"
                r={ringRadius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="8"
              />
              <circle
                cx="48"
                cy="48"
                r={ringRadius}
                fill="transparent"
                stroke="#10b981"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            <div style={{ position: "absolute", textAlign: "center" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#10b981" }}>
                {progressPercent}%
              </span>
              <div style={{ fontSize: "0.62rem", color: "#94a3b8" }}>
                {completedCount}/{totalSteps}
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>
                {language === "mr" && "३० दिवसांचे प्रगती चक्र (Progress Tracker)"}
                {language === "hi" && "३० दिनों का प्रगति चक्र (Progress Tracker)"}
                {language === "en" && "30-Day Practical Progress"}
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: 9999,
                  background: syncStatus === "synced" ? "rgba(16, 185, 129, 0.2)" : "rgba(249, 115, 22, 0.2)",
                  color: syncStatus === "synced" ? "#34d399" : "#fb923c",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <Check size={11} />
                {syncStatus === "synced"
                  ? (language === "mr" ? "सिंक झाले" : language === "hi" ? "सिंक हुआ" : "Synced")
                  : (language === "mr" ? "ऑफलाइन सेव्ह (सिंक प्रलंबित)" : language === "hi" ? "ऑफलाइन सेव (सिंक पेंडिंग)" : "Saved on Device")}
              </span>
              {isOfflineLoaded && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    background: "rgba(59, 130, 246, 0.2)",
                    color: "#60a5fa",
                    fontWeight: 600
                  }}
                >
                  ✈️ {language === "mr" ? "ऑफलाइन कॅश" : language === "hi" ? "ऑफलाइन कैश" : "Offline Cache"}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.4 }}>
              {language === "mr" && "दररोज १५ मिनिटे सराव करा आणि पूर्ण झालेल्या पायरीवर टिक करा. तुमची प्रगती इंटरनेट नसतानाही फोनमध्ये सुरक्षित राहते."}
              {language === "hi" && "रोज़ १५ मिनट अभ्यास करें और पूरे हुए चरण पर टिक करें। आपकी प्रगति बिना इंटरनेट के भी फोन में सुरक्षित रहती है।"}
              {language === "en" && "Spend ~15 minutes a day and tick off steps as you go. Your ticks are saved locally in IndexedDB and survive reload & airplane mode."}
            </p>
          </div>
        </div>

        {/* Stage Timeline Navigation Tabs */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={() => setActiveStage("next_30_days")}
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: 10,
              border: activeStage === "next_30_days" ? "2px solid #f97316" : "1px solid rgba(255, 255, 255, 0.1)",
              background: activeStage === "next_30_days" ? "rgba(249, 115, 22, 0.18)" : "rgba(255, 255, 255, 0.05)",
              color: activeStage === "next_30_days" ? "#fff" : "#94a3b8",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6
            }}
          >
            <Clock size={15} style={{ color: "#f97316" }} />
            {language === "mr" && "१) पुढील ३० दिवस"}
            {language === "hi" && "१) अगले ३० दिन"}
            {language === "en" && "1) Next 30 Days"}
          </button>

          <button
            onClick={() => setActiveStage("months_3_to_6")}
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: 10,
              border: activeStage === "months_3_to_6" ? "2px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.1)",
              background: activeStage === "months_3_to_6" ? "rgba(59, 130, 246, 0.18)" : "rgba(255, 255, 255, 0.05)",
              color: activeStage === "months_3_to_6" ? "#fff" : "#94a3b8",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6
            }}
          >
            <Calendar size={15} style={{ color: "#3b82f6" }} />
            {language === "mr" && "२) ३-६ महिने"}
            {language === "hi" && "२) ३-६ महीने"}
            {language === "en" && "2) 3-6 Months"}
          </button>

          <button
            onClick={() => setActiveStage("years_1_to_2")}
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: 10,
              border: activeStage === "years_1_to_2" ? "2px solid #10b981" : "1px solid rgba(255, 255, 255, 0.1)",
              background: activeStage === "years_1_to_2" ? "rgba(16, 185, 129, 0.18)" : "rgba(255, 255, 255, 0.05)",
              color: activeStage === "years_1_to_2" ? "#fff" : "#94a3b8",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6
            }}
          >
            <Award size={15} style={{ color: "#10b981" }} />
            {language === "mr" && "३) १-२ वर्षे"}
            {language === "hi" && "३) १-२ वर्ष"}
            {language === "en" && "3) 1-2 Years"}
          </button>
        </div>
      </div>

      {/* STAGE 1: NEXT 30 DAYS (Week by Week Checklist) */}
      {activeStage === "next_30_days" && pathway?.stages?.next_30_days && (
        <section aria-label="30 Day Micro Steps">
          {pathway.stages.next_30_days.weeks.map((week) => (
            <div
              key={`week_${week.week_number}`}
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: "16px",
                marginBottom: 16
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: 8 }}>
                <div style={{ background: "rgba(249, 115, 22, 0.2)", color: "#f97316", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.85rem" }}>
                  {week.week_number}
                </div>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "#fff" }}>
                  {getText(week.title)}
                </h2>
              </div>

              {/* Steps inside the week */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {week.steps.map((step) => {
                  const isDone = completedSteps.has(step.id);
                  const isSpeaking = isSpeakingId === step.id;

                  return (
                    <div
                      key={step.id}
                      style={{
                        background: isDone ? "rgba(16, 185, 129, 0.08)" : "rgba(30, 41, 59, 0.6)",
                        border: isDone ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: 12,
                        padding: "14px",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        {/* Interactive Tick Checkbox */}
                        <button
                          onClick={() => handleToggleStep(step.id)}
                          aria-label={isDone ? "Mark as incomplete" : "Mark as completed"}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            marginTop: 2,
                            color: isDone ? "#10b981" : "#64748b"
                          }}
                        >
                          {isDone ? (
                            <CheckCircle2 size={24} style={{ color: "#10b981" }} />
                          ) : (
                            <Circle size={24} />
                          )}
                        </button>

                        {/* Step Content */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {renderStepIcon(step.icon, isDone)}
                              <h3 style={{
                                fontSize: "0.98rem",
                                fontWeight: 700,
                                margin: 0,
                                color: isDone ? "#34d399" : "#fff",
                                textDecoration: isDone ? "line-through" : "none"
                              }}>
                                {getText(step.title)}
                              </h3>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: "0.72rem", background: "rgba(255,255,255,0.08)", color: "#cbd5e1", padding: "2px 8px", borderRadius: 9999 }}>
                                ⏱️ {step.estimated_minutes || 15} {language === "mr" ? "मि." : language === "hi" ? "मिनट" : "mins"}
                              </span>

                              {/* Voice Read Aloud Button */}
                              <button
                                onClick={() => handleReadAloud(step.id, `${getText(step.title)}. ${getText(step.description)}. ${getText(step.practical_action)}`)}
                                aria-label="Read aloud"
                                style={{
                                  background: isSpeaking ? "#f97316" : "rgba(255, 255, 255, 0.08)",
                                  border: "none",
                                  borderRadius: "50%",
                                  width: 28,
                                  height: 28,
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer"
                                }}
                              >
                                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                              </button>
                            </div>
                          </div>

                          <p style={{ margin: "4px 0 8px", fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.45 }}>
                            {getText(step.description)}
                          </p>

                          {/* Practical Action Box */}
                          {step.practical_action && (
                            <div
                              style={{
                                background: "rgba(249, 115, 22, 0.1)",
                                borderLeft: "3px solid #f97316",
                                padding: "6px 10px",
                                borderRadius: 6,
                                marginBottom: 8,
                                fontSize: "0.8rem",
                                color: "#fdba74"
                              }}
                            >
                              <strong>
                                {language === "mr" && "💡 प्रत्यक्ष काम: "}
                                {language === "hi" && "💡 व्यावहारिक कार्य: "}
                                {language === "en" && "💡 Hands-on task: "}
                              </strong>
                              {getText(step.practical_action)}
                            </div>
                          )}

                          {/* Link verification enforcement */}
                          <div>
                            {step.resource_url ? (
                              <a
                                href={step.resource_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: "0.75rem",
                                  color: "#38bdf8",
                                  textDecoration: "underline"
                                }}
                              >
                                <ExternalLink size={12} />
                                {language === "mr" && "अधिकृत पोर्टलवर पहा (Official Portal) ↗"}
                                {language === "hi" && "आधिकारिक पोर्टल पर देखें ↗"}
                                {language === "en" && "Visit Official Portal ↗"}
                              </a>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: "0.72rem",
                                  color: "#94a3b8",
                                  background: "rgba(255, 255, 255, 0.05)",
                                  padding: "2px 8px",
                                  borderRadius: 4
                                }}
                              >
                                <Lock size={11} />
                                {language === "mr" && "दुवा लवकरच उपलब्ध (Link coming soon)"}
                                {language === "hi" && "लिंक जल्द ही उपलब्ध (Link coming soon)"}
                                {language === "en" && "Link coming soon (Verification pending)"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* STAGE 2: 3-6 MONTHS (Milestones & Injected Schemes) */}
      {activeStage === "months_3_to_6" && pathway?.stages?.months_3_to_6 && (
        <section aria-label="3 to 6 Months Milestones">
          <div
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: 16,
              padding: "16px",
              marginBottom: 16
            }}
          >
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 14px", color: "#60a5fa", display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={18} />
              {getText(pathway.stages.months_3_to_6.title)}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {pathway.stages.months_3_to_6.milestones.map((m: PathwayMilestone) => {
                const isSpeaking = isSpeakingId === m.id;

                return (
                  <div
                    key={m.id}
                    style={{
                      background: m.is_opportunity_milestone ? "rgba(59, 130, 246, 0.12)" : "rgba(30, 41, 59, 0.6)",
                      border: m.is_opportunity_milestone ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 12,
                      padding: "14px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Target size={18} style={{ color: m.is_opportunity_milestone ? "#60a5fa" : "#f97316" }} />
                        <h3 style={{ fontSize: "0.98rem", fontWeight: 700, margin: 0, color: "#fff" }}>
                          {getText(m.title)}
                        </h3>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {m.deadline && (
                          <span style={{ fontSize: "0.72rem", background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", padding: "2px 8px", borderRadius: 9999, fontWeight: 600 }}>
                            📅 {m.deadline}
                          </span>
                        )}

                        <button
                          onClick={() => handleReadAloud(m.id, `${getText(m.title)}. ${getText(m.description)}`)}
                          aria-label="Read aloud"
                          style={{
                            background: isSpeaking ? "#3b82f6" : "rgba(255, 255, 255, 0.08)",
                            border: "none",
                            borderRadius: "50%",
                            width: 26,
                            height: 26,
                            color: "#fff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                        </button>
                      </div>
                    </div>

                    <p style={{ margin: "4px 0 10px", fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.45 }}>
                      {getText(m.description)}
                    </p>

                    <div>
                      {m.resource_url ? (
                        <a
                          href={m.resource_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "#60a5fa", textDecoration: "underline" }}
                        >
                          <ExternalLink size={12} />
                          {language === "mr" && "अधिकृत पोर्टलवर थेट अर्ज करा ↗"}
                          {language === "hi" && "आधिकारिक पोर्टल पर सीधे आवेदन करें ↗"}
                          {language === "en" && "Apply on Official Portal ↗"}
                        </a>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "#94a3b8" }}>
                          <Lock size={11} />
                          {language === "mr" && "दुवा लवकरच उपलब्ध (Link coming soon)"}
                          {language === "hi" && "लिंक जल्द ही उपलब्ध"}
                          {language === "en" && "Link coming soon"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {onGoToOpportunities && (
              <div style={{ marginTop: 14, textAlign: "right" }}>
                <button
                  onClick={onGoToOpportunities}
                  style={{
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.35)",
                    color: "#93c5fd",
                    padding: "8px 14px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 600
                  }}
                >
                  {language === "mr" && "सर्व संधी व योजना पहा →"}
                  {language === "hi" && "सभी अवसर एवं योजनाएं देखें →"}
                  {language === "en" && "View All Opportunities & Schemes →"}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* STAGE 3: 1-2 YEARS (Livelihood & Independence) */}
      {activeStage === "years_1_to_2" && pathway?.stages?.years_1_to_2 && (
        <section aria-label="1 to 2 Years Long-Term Goals">
          <div
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: 16,
              padding: "16px",
              marginBottom: 16
            }}
          >
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 14px", color: "#34d399", display: "flex", alignItems: "center", gap: 8 }}>
              <Award size={18} />
              {getText(pathway.stages.years_1_to_2.title)}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {pathway.stages.years_1_to_2.milestones.map((m: PathwayMilestone) => (
                <div
                  key={m.id}
                  style={{
                    background: "rgba(30, 41, 59, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 12,
                    padding: "14px"
                  }}
                >
                  <h3 style={{ fontSize: "0.98rem", fontWeight: 700, margin: "0 0 6px", color: "#fff" }}>
                    {getText(m.title)}
                  </h3>
                  <p style={{ margin: "4px 0 10px", fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.45 }}>
                    {getText(m.description)}
                  </p>
                  <div>
                    {m.resource_url ? (
                      <a
                        href={m.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "#34d399", textDecoration: "underline" }}
                      >
                        <ExternalLink size={12} />
                        {language === "mr" && "अधिकृत पोर्टल ↗"}
                        {language === "hi" && "आधिकारिक पोर्टल ↗"}
                        {language === "en" && "Official Portal ↗"}
                      </a>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "#94a3b8" }}>
                        <Lock size={11} />
                        {language === "mr" && "दुवा लवकरच उपलब्ध (Link coming soon)"}
                        {language === "hi" && "लिंक जल्द ही उपलब्ध"}
                        {language === "en" && "Link coming soon"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Alternative Non-STEM / Vocational Pathway Card */}
      {pathway?.vocational_alternative && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(20, 83, 45, 0.3), rgba(15, 23, 42, 0.8))",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: 16,
            padding: "16px",
            marginTop: 16
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Layers size={18} style={{ color: "#4ade80" }} />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "#86efac" }}>
              {language === "mr" && "पर्यायी व्यावसायिक मार्ग (Vocational Option)"}
              {language === "hi" && "वैकल्पिक व्यावसायिक मार्ग (Vocational Option)"}
              {language === "en" && "Alternative Vocational / Hands-on Pathway"}
            </h3>
          </div>

          <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "4px 0 6px", color: "#fff" }}>
            {getText(pathway.vocational_alternative.title)}
          </h4>
          <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.45 }}>
            {getText(pathway.vocational_alternative.description)}
          </p>

          <div>
            {pathway.vocational_alternative.resource_url ? (
              <a
                href={pathway.vocational_alternative.resource_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "#4ade80", textDecoration: "underline" }}
              >
                <ExternalLink size={12} />
                {language === "mr" && "अधिकृत पोर्टलवर पहा ↗"}
                {language === "hi" && "आधिकारिक पोर्टल पर देखें ↗"}
                {language === "en" && "Visit Official Portal ↗"}
              </a>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "#94a3b8" }}>
                <Lock size={11} />
                {language === "mr" && "दुवा लवकरच उपलब्ध (Link coming soon)"}
                {language === "hi" && "लिंक जल्द ही उपलब्ध"}
                {language === "en" && "Link coming soon"}
              </span>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
