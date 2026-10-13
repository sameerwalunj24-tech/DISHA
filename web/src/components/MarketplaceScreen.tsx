import React, { useState, useEffect } from "react";
import {
  ArrowLeft, BookOpen, CheckCircle2, ShoppingBag,
  CreditCard, Volume2
} from "lucide-react";
import { useI18n } from "../i18n";
import { voiceService } from "../services/voice";

interface ModuleStep {
  step_number: number;
  title: string;
  content: string;
  practical_task?: string;
}

interface TrainingModule {
  id: string;
  facilitator_id: string;
  facilitator_name: string;
  title: string;
  description?: string;
  language: string;
  price_type: "FREE" | "ONE_TIME" | "MONTHLY";
  price_inr: number;
  steps_count: number;
  steps: ModuleStep[];
  created_at: string;
}

interface MarketplaceScreenProps {
  isOnline: boolean;
  studentId: string | null;
  onBackToHome: () => void;
}

export const MarketplaceScreen: React.FC<MarketplaceScreenProps> = ({
  isOnline,
  studentId,
  onBackToHome
}) => {
  const { language } = useI18n();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [enrolledModuleIds, setEnrolledModuleIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"ALL" | "MY_MODULES">("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected module for reading / learning
  const [activeReadingModule, setActiveReadingModule] = useState<TrainingModule | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Mock Payment Modal state
  const [purchasingModule, setPurchasingModule] = useState<TrainingModule | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  useEffect(() => {
    loadModules();
  }, [studentId, isOnline]);

  const loadModules = async () => {
    setIsLoading(true);
    // 1. Load enrolled from cache
    try {
      const savedEnrolled = localStorage.getItem(`disha_enrolled_${studentId}`);
      if (savedEnrolled) {
        setEnrolledModuleIds(new Set(JSON.parse(savedEnrolled)));
      }
    } catch {}

    if (!isOnline) {
      // Offline fallback: load cached modules
      try {
        const cached = localStorage.getItem("disha_cached_marketplace_modules");
        if (cached) setModules(JSON.parse(cached));
      } catch {}
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/modules");
      if (res.ok) {
        const data: TrainingModule[] = await res.json();
        setModules(data);
        localStorage.setItem("disha_cached_marketplace_modules", JSON.stringify(data));
      }

      if (studentId) {
        const myRes = await fetch(`http://127.0.0.1:8000/api/v1/students/${studentId}/modules`);
        if (myRes.ok) {
          const myData = await myRes.json();
          const enrolledIds = new Set<string>(myData.map((item: any) => item.module_id));
          setEnrolledModuleIds(enrolledIds);
          localStorage.setItem(`disha_enrolled_${studentId}`, JSON.stringify(Array.from(enrolledIds)));
        }
      }
    } catch (err) {
      console.warn("Could not load marketplace modules:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnrollMockPayment = async () => {
    if (!purchasingModule || !studentId) return;

    setIsProcessingPayment(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/modules/${purchasingModule.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          payment_method: "MOCK_UPI"
        })
      });

      if (!res.ok) throw new Error("Payment failed");
      const _enrollData = await res.json();
      void _enrollData;

      // Cache downloaded module for offline access
      const updatedEnrolled = new Set(enrolledModuleIds).add(purchasingModule.id);
      setEnrolledModuleIds(updatedEnrolled);
      localStorage.setItem(`disha_enrolled_${studentId}`, JSON.stringify(Array.from(updatedEnrolled)));
      localStorage.setItem(`disha_module_offline_${purchasingModule.id}`, JSON.stringify(purchasingModule));

      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        setPurchasingModule(null);
        setActiveReadingModule(purchasingModule);
        setActiveStepIndex(0);
      }, 1500);
    } catch (err) {
      console.warn("Enrollment error:", err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSpeakText = (text: string) => {
    const langCode = language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";
    voiceService.speak(text, langCode);
  };

  // VIEW 1: MODULE READER (OFFLINE ENABLED)
  if (activeReadingModule) {
    const steps = activeReadingModule.steps || [];
    const currentStep = steps[activeStepIndex] || {
      step_number: 1,
      title: activeReadingModule.title,
      content: activeReadingModule.description || "माहिती उपलब्ध नाही."
    };

    return (
      <main className="main-container" style={{ paddingBottom: 60 }}>
        {/* Back Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button
            onClick={() => setActiveReadingModule(null)}
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}
          >
            <ArrowLeft size={16} /> सर्व कोर्सेस (All Modules)
          </button>
          <span style={{ fontSize: "0.75rem", background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)", padding: "3px 8px", borderRadius: 9999, fontWeight: 700 }}>
            ✓ ऑफलाइन उपलब्ध (Downloaded)
          </span>
        </div>

        {/* Reader Card */}
        <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-subtle)", borderRadius: 18, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "#fdba74", fontWeight: 700, textTransform: "uppercase" }}>
                पाठ {activeStepIndex + 1} / {steps.length}
              </span>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", margin: "4px 0" }}>
                {currentStep.title}
              </h2>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
                मार्गदर्शक: <strong style={{ color: "#e2e8f0" }}>{activeReadingModule.facilitator_name}</strong>
              </p>
            </div>
            <button
              onClick={() => handleSpeakText(`${currentStep.title}. ${currentStep.content}. ${currentStep.practical_task || ""}`)}
              style={{ background: "rgba(249,115,22,0.15)", border: "none", color: "#f97316", padding: 8, borderRadius: 10, cursor: "pointer" }}
              title="माहिती ऐका (Listen Aloud)"
            >
              <Volume2 size={18} />
            </button>
          </div>

          {/* Lesson Content */}
          <div style={{ background: "rgba(15,23,42,0.6)", borderRadius: 12, padding: "14px 16px", marginBottom: 16, lineHeight: 1.6, fontSize: "0.92rem", color: "#e2e8f0" }}>
            {currentStep.content}
          </div>

          {/* Practical Task */}
          {currentStep.practical_task && (
            <div style={{ background: "rgba(56,189,248,0.1)", borderLeft: "3px solid #38bdf8", borderRadius: "0 8px 8px 0", padding: "10px 14px", marginBottom: 20 }}>
              <span style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 800 }}>
                ⚙️ प्रात्यक्षिक कृती (Practical Task):
              </span>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.86rem", color: "#bae6fd" }}>
                {currentStep.practical_task}
              </p>
            </div>
          )}

          {/* Step Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <button
              disabled={activeStepIndex === 0}
              onClick={() => setActiveStepIndex(activeStepIndex - 1)}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: activeStepIndex === 0 ? "#64748b" : "#fff",
                cursor: activeStepIndex === 0 ? "not-allowed" : "pointer",
                fontWeight: 600
              }}
            >
              ← मागील पाठ
            </button>
            <button
              disabled={activeStepIndex >= steps.length - 1}
              onClick={() => setActiveStepIndex(activeStepIndex + 1)}
              className="submit-btn"
              style={{
                flex: 1,
                padding: "10px 14px",
                opacity: activeStepIndex >= steps.length - 1 ? 0.4 : 1,
                cursor: activeStepIndex >= steps.length - 1 ? "not-allowed" : "pointer"
              }}
            >
              पुढील पाठ →
            </button>
          </div>
        </div>
      </main>
    );
  }

  // VIEW 2: MODULE CATALOG & MY MODULES
  const displayedModules = activeTab === "MY_MODULES"
    ? modules.filter(m => enrolledModuleIds.has(m.id))
    : modules;

  return (
    <main className="main-container" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button
          onClick={onBackToHome}
          style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}
        >
          <ArrowLeft size={16} /> मुख्य पान (Home)
        </button>
        <span style={{ fontSize: "0.78rem", color: "#38bdf8", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
          <ShoppingBag size={14} /> कौशल्य मार्केटप्लेस
        </span>
      </div>

      {/* Greeting Card */}
      <section className="greeting-card" style={{ borderTop: "4px solid #38bdf8", marginBottom: 16 }}>
        <h2>
          {language === "mr" && "मार्गदर्शक कौशल्य प्रशिक्षण कोर्सेस"}
          {language === "hi" && "मार्गदर्शक कौशल प्रशिक्षण कोर्सेज"}
          {language === "en" && "Facilitator Skill Training Modules"}
        </h2>
        <p style={{ margin: "4px 0 0 0", fontSize: "0.84rem", color: "#94a3b8" }}>
          स्थानिक शिक्षक व तंत्रज्ञांनी तयार केलेले प्रात्यक्षिक कोर्सेस. एकदा डाऊनलोड केल्यावर पूर्णपणे ऑफलाइन शिकता येते.
        </p>
        <div style={{ marginTop: 8, padding: "6px 12px", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 8, fontSize: "0.76rem", color: "#7dd3fc", display: "inline-block" }}>
          💡 सर्व खरेदी ही सिम्युलेटेड मॉक पेमेंट (Mock Payment) आहे. कोणतेही खरे बँक व्यवहार किंवा पैसे आकारले जात नाहीत. (Simulated mock transactions only).
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={() => setActiveTab("ALL")}
            style={{
              padding: "6px 14px",
              borderRadius: 9999,
              border: "none",
              background: activeTab === "ALL" ? "#38bdf8" : "rgba(255,255,255,0.08)",
              color: activeTab === "ALL" ? "#000" : "#cbd5e1",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer"
            }}
          >
            सर्व कोर्सेस ({modules.length})
          </button>
          <button
            onClick={() => setActiveTab("MY_MODULES")}
            style={{
              padding: "6px 14px",
              borderRadius: 9999,
              border: "none",
              background: activeTab === "MY_MODULES" ? "#38bdf8" : "rgba(255,255,255,0.08)",
              color: activeTab === "MY_MODULES" ? "#000" : "#cbd5e1",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer"
            }}
          >
            माझे कोर्सेस ({enrolledModuleIds.size})
          </button>
        </div>
      </section>

      {/* Modules List */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
          कोर्सेस लोड होत आहेत...
        </div>
      ) : displayedModules.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, background: "rgba(255,255,255,0.03)", borderRadius: 16, color: "#94a3b8" }}>
          {activeTab === "MY_MODULES" ? "तुम्ही अजून कोणताही कोर्स घेतलेला नाही." : "सध्या कोणतेही कोर्सेस उपलब्ध नाहीत."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {displayedModules.map((m) => {
            const isEnrolled = enrolledModuleIds.has(m.id);
            const isFree = m.price_type === "FREE" || m.price_inr === 0;

            return (
              <div
                key={m.id}
                style={{
                  background: "var(--bg-card)",
                  border: isEnrolled ? "1.5px solid rgba(16,185,129,0.4)" : "1.5px solid var(--border-subtle)",
                  borderRadius: 16,
                  padding: 16,
                  boxShadow: isEnrolled ? "0 0 12px rgba(16,185,129,0.15)" : "none"
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{
                      background: isFree ? "rgba(16,185,129,0.15)" : "rgba(249,115,22,0.15)",
                      color: isFree ? "#34d399" : "#fdba74",
                      padding: "2px 8px",
                      borderRadius: 9999,
                      fontSize: "0.72rem",
                      fontWeight: 800
                    }}>
                      {isFree ? "मोफत (FREE)" : `₹${m.price_inr} • ${m.price_type === "MONTHLY" ? "महिना" : "एकदाच"}`}
                    </span>
                    <span style={{ background: "rgba(255,255,255,0.08)", color: "#cbd5e1", padding: "2px 8px", borderRadius: 9999, fontSize: "0.72rem" }}>
                      {m.steps_count || (m.steps ? m.steps.length : 1)} पाठ
                    </span>
                  </div>

                  {isEnrolled && (
                    <span style={{ color: "#34d399", fontSize: "0.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={13} /> नोंदणीकृत (Enrolled)
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff", margin: "6px 0 4px 0" }}>
                  {m.title}
                </h3>
                <p style={{ margin: "0 0 10px 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                  मार्गदर्शक: <strong style={{ color: "#e2e8f0" }}>{m.facilitator_name}</strong>
                </p>

                {m.description && (
                  <p style={{ margin: "0 0 12px 0", fontSize: "0.84rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                    {m.description}
                  </p>
                )}

                {/* Action CTA */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {isEnrolled ? (
                    <button
                      onClick={() => {
                        setActiveReadingModule(m);
                        setActiveStepIndex(0);
                      }}
                      className="submit-btn"
                      style={{ padding: "8px 18px", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <BookOpen size={14} /> अभ्यास सुरू करा (Learn Now) →
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (!studentId) {
                          alert(language === "mr" ? "कृपया आधी करिअर शोध (Discover) पूर्ण करा." : "Please complete Discover first.");
                          return;
                        }
                        setPurchasingModule(m);
                      }}
                      style={{
                        background: isFree ? "rgba(16,185,129,0.2)" : "#f97316",
                        border: isFree ? "1px solid #10b981" : "none",
                        color: isFree ? "#34d399" : "#fff",
                        padding: "8px 18px",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      {isFree ? "मोफत नोंदणी करा (Enroll Free) →" : `खरेदी करा (Mock Pay ₹${m.price_inr}) →`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MOCK PAYMENT MODAL */}
      {purchasingModule && (
        <div className="modal-backdrop" onClick={() => setPurchasingModule(null)} role="dialog" aria-modal="true">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <div style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8", width: 48, height: 48, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <CreditCard size={24} />
              </div>
              <h3 style={{ margin: "4px 0", fontSize: "1.1rem" }}>
                मॉक पेमेंट (Mock Payment - Simulated)
              </h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                डेमो मोड: कोणतेही खरे पैसे कापले जाणार नाहीत (Mock Payment Demo)
              </p>
            </div>

            {/* Price breakdown card */}
            <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.85rem" }}>
                <span style={{ color: "#94a3b8" }}>कोर्सचे नाव:</span>
                <strong style={{ color: "#fff" }}>{purchasingModule.title}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.85rem" }}>
                <span style={{ color: "#94a3b8" }}>एकूण मॉक किंमत (Mock Price):</span>
                <strong style={{ color: "#f97316", fontSize: "1.05rem" }}>₹{purchasingModule.price_inr}</strong>
              </div>

              {purchasingModule.price_inr > 0 && (
                <div style={{ borderTop: "1px dashed rgba(255,255,255,0.15)", paddingTop: 8, marginTop: 8, fontSize: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", marginBottom: 3 }}>
                    <span>मार्गदर्शक मानधन (88% Mock Payout):</span>
                    <strong style={{ color: "#34d399" }}>₹{(purchasingModule.price_inr * 0.88).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                    <span>दिशा प्लॅटफॉर्म मेंटेनन्स (12% Mock Fee):</span>
                    <strong style={{ color: "#38bdf8" }}>₹{(purchasingModule.price_inr * 0.12).toFixed(2)}</strong>
                  </div>
                </div>
              )}
            </div>

            {paymentSuccess ? (
              <div style={{ textAlign: "center", padding: 12, background: "rgba(16,185,129,0.15)", borderRadius: 10, color: "#34d399", fontWeight: 700 }}>
                ✓ मॉक पेमेंट यशस्वी! (Mock Payment Success - Demo Only) कोर्स ऑफलाइन डाऊनलोड झाला आहे.
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setPurchasingModule(null)}
                  style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#94a3b8", cursor: "pointer" }}
                >
                  रद्द करा
                </button>
                <button
                  onClick={handleEnrollMockPayment}
                  disabled={isProcessingPayment}
                  className="submit-btn"
                  style={{ flex: 2, padding: 12 }}
                >
                  {isProcessingPayment ? "प्रक्रिया सुरू आहे..." : `मॉक पेमेंट करा (Mock Pay ₹${purchasingModule.price_inr}) ✓`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
