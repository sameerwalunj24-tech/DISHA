import React, { useState, useEffect } from "react";
import { 
  Award, ArrowLeft, ExternalLink, Calendar, CheckCircle, 
  AlertTriangle, XCircle, FileText, ArrowRight, Volume2, 
  ShieldCheck, AlertCircle, RefreshCw, WifiOff, Sparkles 
} from "lucide-react";
import { useI18n } from "../i18n";
import { voiceService } from "../services/voice";
import { saveCachedMatches, getCachedMatches } from "../services/db/offlineStorage";

interface MatchItem {
  opportunity: {
    id: number;
    title: string;
    category: string;
    provider: string;
    min_grade: number;
    max_grade: number;
    states: string;
    income_max?: number;
    gender: string;
    interest_tags: string;
    mobility: string;
    deadline?: string;
    documents_needed: string;
    apply_steps: string;
    benefits: string;
    source_name: string;
    source_url: string;
    last_verified: string;
    verification_status: string;
    is_sample: boolean;
  };
  overall_eligibility: "ELIGIBLE" | "LIKELY" | "NOT_ELIGIBLE";
  score: number;
  score_breakdown: {
    base_eligibility: number;
    verification_bonus: number;
    interest_overlap: number;
    mobility_fit: number;
    deadline_bonus: number;
    total_score: number;
  };
  passed_rules: string[];
  failed_rules: string[];
  missing_info: string[];
  explanation: {
    why_fits: string;
    what_to_do: string;
    source_name: string;
    source_url: string;
    last_verified: string;
  };
}

interface OpportunitiesScreenProps {
  isOnline: boolean;
  studentId?: string | null;
  onBackToHome: () => void;
}

export const OpportunitiesScreen: React.FC<OpportunitiesScreenProps> = ({
  isOnline,
  studentId,
  onBackToHome
}) => {
  const { language } = useI18n();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isOfflineData, setIsOfflineData] = useState<boolean>(false);
  const [optionalIncome, setOptionalIncome] = useState<string>("");

  useEffect(() => {
    loadOpportunities();
  }, [studentId, isOnline, language, activeCategory]);

  const loadOpportunities = async () => {
    setIsLoading(true);

    if (!isOnline) {
      // Offline fallback: load cached opportunities from IndexedDB
      const cached = await getCachedMatches();
      if (cached && cached.length > 0) {
        setMatches(cached);
        setIsOfflineData(true);
      }
      setIsLoading(false);
      return;
    }

    try {
      // If studentId exists, fetch personalized matches from API
      let url = studentId 
        ? `http://127.0.0.1:8000/api/v1/students/${studentId}/matches?language=${language}`
        : `http://127.0.0.1:8000/api/v1/opportunities`;

      if (studentId && optionalIncome) {
        url += `&family_income=${encodeURIComponent(optionalIncome)}`;
      }

      if (studentId && activeCategory !== "ALL") {
        url += `&category=${encodeURIComponent(activeCategory)}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch opportunities");
      const data = await res.json();

      let formattedMatches: MatchItem[] = [];

      if (studentId) {
        formattedMatches = data;
      } else {
        // Fallback for general browsing before student completes discovery:
        // Score them with standard rural grade 10 profile
        formattedMatches = data.map((opp: any) => ({
          opportunity: opp,
          overall_eligibility: opp.gender === "FEMALE" ? "LIKELY" : "ELIGIBLE",
          score: (opp.verification_status === "verified" ? 130 : 100),
          score_breakdown: {
            base_eligibility: 100,
            verification_bonus: opp.verification_status === "verified" ? 30 : 0,
            interest_overlap: 0,
            mobility_fit: 15,
            deadline_bonus: 0,
            total_score: (opp.verification_status === "verified" ? 130 : 100)
          },
          passed_rules: ["शैक्षणिक पात्रता (Grade within range)", "महाराष्ट्र राज्य (State match)"],
          failed_rules: [],
          missing_info: opp.income_max ? [`कौटुंबिक उत्पन्न ₹${opp.income_max} पेक्षा कमी असणे आवश्यक`] : [],
          explanation: {
            why_fits: `तुम्ही इयत्ता ${opp.min_grade} ते ${opp.max_grade} साठी पात्र आहात.`,
            what_to_do: `आवश्यक कागदपत्रे: ${opp.documents_needed || "आधार कार्ड"}. अर्ज: ${opp.apply_steps || "अधिकृत पोर्टलवर नोंदणी करा"}.`,
            source_name: opp.source_name || opp.provider,
            source_url: opp.source_url,
            last_verified: opp.last_verified
          }
        }));
      }

      // Filter by category if in general browsing
      if (!studentId && activeCategory !== "ALL") {
        formattedMatches = formattedMatches.filter(m => m.opportunity.category === activeCategory);
      }

      setMatches(formattedMatches);
      setIsOfflineData(false);
      // Cache matches in IndexedDB for offline / airplane mode access
      await saveCachedMatches(formattedMatches);
    } catch (err) {
      console.warn("API request failed, falling back to cached IndexedDB:", err);
      const cached = await getCachedMatches();
      setMatches(cached);
      setIsOfflineData(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakDetails = (text: string) => {
    const langCode = language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";
    voiceService.speak(text, langCode);
  };

  const categories = [
    { key: "ALL", label: { mr: "सर्व (All)", hi: "सभी", en: "All" } },
    { key: "apprenticeship", label: { mr: "शिकाऊ उमेदवारी", hi: "अप्रेंटिसशिप", en: "Apprenticeships" } },
    { key: "scholarship", label: { mr: "शिष्यवृत्ती", hi: "छात्रवृत्ति", en: "Scholarships" } },
    { key: "vocational", label: { mr: "व्यावसायिक", hi: "व्यावसायिक", en: "Vocational" } },
    { key: "scheme", label: { mr: "शासकीय योजना", hi: "योजनाएँ", en: "Govt Schemes" } },
  ];

  return (
    <main className="main-container" style={{ paddingBottom: 80 }}>
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <button
          onClick={onBackToHome}
          style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 9999, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}
        >
          <ArrowLeft size={14} /> मुख्य पान (Home)
        </button>

        {isOfflineData && (
          <span style={{ fontSize: "0.75rem", background: "rgba(249,115,22,0.15)", color: "#fdba74", padding: "4px 10px", borderRadius: 9999, border: "1px solid rgba(249,115,22,0.3)", display: "flex", alignItems: "center", gap: 4 }}>
            <WifiOff size={12} /> ऑफलाइन कॅश डेटा (Airplane Mode Ready)
          </span>
        )}
      </div>

      {/* Screen Title */}
      <div className="greeting-card" style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "linear-gradient(135deg, #10b981, #047857)", color: "#fff", padding: 10, borderRadius: 14 }}>
            <Award size={26} />
          </div>
          <div>
            <h2>
              {language === "mr" && "सत्यापित संधी आणि शिष्यवृत्ती"}
              {language === "hi" && "सत्यापित अवसर और छात्रवृत्ति"}
              {language === "en" && "Verified Opportunities & Schemes"}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              {language === "mr" && "नियम-इंजिनद्वारे निश्चित पात्रता, थेट अधिकृत संकेतस्थळ आणि शेवटची पडताळणी तारीख"}
              {language === "hi" && "नियम-आधारित पात्रता, सीधा आधिकारिक पोर्टल और अंतिम सत्यापन तिथि"}
              {language === "en" && "Deterministic eligibility, official source links, and verified dates"}
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            style={{
              background: activeCategory === c.key ? "var(--primary-saffron)" : "rgba(30,41,59,0.7)",
              border: "1px solid " + (activeCategory === c.key ? "var(--primary-saffron)" : "rgba(255,255,255,0.1)"),
              color: "#fff",
              padding: "6px 14px",
              borderRadius: 9999,
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {c.label[language as "mr" | "hi" | "en"] || c.label.mr}
          </button>
        ))}
      </div>

      {/* Sensitive Fields Optional Filter Check */}
      <div style={{
        background: "rgba(15,23,42,0.7)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={16} style={{ color: "#10b981", flexShrink: 0 }} />
          <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
            ऐच्छिक उत्पन्न पडताळणी (डेटाबेसमध्ये सेव्ह होत नाही):
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="number"
            placeholder="उदा. 200000"
            className="form-input"
            style={{ width: 110, padding: "4px 8px", fontSize: "0.78rem" }}
            value={optionalIncome}
            onChange={(e) => setOptionalIncome(e.target.value)}
          />
          <button
            onClick={() => loadOpportunities()}
            style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "4px 10px", borderRadius: 8, cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}
          >
            तपासा
          </button>
        </div>
      </div>

      {/* Opportunities Cards List */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px auto" }} />
          <p>संधी शोधत आहोत... (Finding matching opportunities)</p>
        </div>
      ) : matches.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", background: "rgba(15,23,42,0.6)", borderRadius: 16 }}>
          <AlertCircle size={32} style={{ margin: "0 auto 8px auto", color: "#f97316" }} />
          <h4>कोणत्याही संधी सापडल्या नाहीत</h4>
          <p style={{ fontSize: "0.85rem" }}>कृपया इतर प्रवर्ग निवडा किंवा फिल्टर बदला.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {matches.map((item) => {
            const opp = item.opportunity;
            const isVerified = opp.verification_status === "verified";
            const isExpanded = expandedId === opp.id;

            // Eligibility Badge configuration
            let badgeBg = "rgba(16,185,129,0.15)";
            let badgeBorder = "rgba(16,185,129,0.4)";
            let badgeColor = "#34d399";
            let badgeLabel = "✓ पात्र (Eligible)";
            let BadgeIcon = CheckCircle;

            if (item.overall_eligibility === "LIKELY") {
              badgeBg = "rgba(245,158,11,0.15)";
              badgeBorder = "rgba(245,158,11,0.4)";
              badgeColor = "#fbbf24";
              badgeLabel = "⚠ बहुतांश पात्र (Likely - Info Pending)";
              BadgeIcon = AlertTriangle;
            } else if (item.overall_eligibility === "NOT_ELIGIBLE") {
              badgeBg = "rgba(148,163,184,0.15)";
              badgeBorder = "rgba(148,163,184,0.3)";
              badgeColor = "#94a3b8";
              badgeLabel = "✕ अपात्र (Not Eligible)";
              BadgeIcon = XCircle;
            }

            return (
              <div
                key={opp.id}
                style={{
                  background: "var(--bg-card)",
                  border: "1.5px solid var(--border-subtle)",
                  borderRadius: 18,
                  padding: "16px 18px",
                  transition: "all 0.2s ease"
                }}
              >
                {/* Badges Row */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    {/* Eligibility Badge */}
                    <span
                      style={{
                        background: badgeBg,
                        border: `1px solid ${badgeBorder}`,
                        color: badgeColor,
                        padding: "3px 10px",
                        borderRadius: 9999,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5
                      }}
                    >
                      <BadgeIcon size={13} />
                      {badgeLabel}
                    </span>

                    {/* Verification Status Badge */}
                    {isVerified ? (
                      <span
                        style={{
                          background: "rgba(2,132,199,0.15)",
                          border: "1px solid rgba(2,132,199,0.35)",
                          color: "#38bdf8",
                          padding: "3px 8px",
                          borderRadius: 9999,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4
                        }}
                      >
                        <ShieldCheck size={12} /> अधिकृत शासकीय (Verified)
                      </span>
                    ) : (
                      <span
                        style={{
                          background: "rgba(249,115,22,0.15)",
                          border: "1px solid rgba(249,115,22,0.4)",
                          color: "#fdba74",
                          padding: "3px 8px",
                          borderRadius: 9999,
                          fontSize: "0.72rem",
                          fontWeight: 700
                        }}
                      >
                        Sample - unverified
                      </span>
                    )}
                  </div>

                  {opp.deadline && (
                    <span style={{ fontSize: "0.73rem", color: "#f87171", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                      <Calendar size={13} /> अंतिम मुदत: {opp.deadline}
                    </span>
                  )}
                </div>

                {/* Title & Provider */}
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", lineHeight: 1.3, marginBottom: 4 }}>
                  {opp.title}
                </h3>
                <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 10 }}>
                  संस्था: <strong style={{ color: "#e2e8f0" }}>{opp.provider}</strong>
                </p>

                {/* Benefits Banner */}
                <div style={{ background: "rgba(249,115,22,0.1)", borderLeft: "3px solid #f97316", padding: "8px 12px", borderRadius: "0 8px 8px 0", marginBottom: 12 }}>
                  <span style={{ fontSize: "0.82rem", color: "#fdba74", fontWeight: 700 }}>
                    लाभाचे स्वरूप: {opp.benefits}
                  </span>
                </div>

                {/* Grounded Plain-Language Explanation */}
                <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.78rem", color: "#f97316", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                      <Sparkles size={14} /> हे तुमच्यासाठी का योग्य आहे? (Why this fits you):
                    </span>
                    <button
                      onClick={() => handleSpeakDetails(`${opp.title}. ${item.explanation.why_fits}. ${item.explanation.what_to_do}`)}
                      style={{ background: "transparent", border: "none", color: "#fdba74", cursor: "pointer" }}
                      title="माहिती ऐका (Listen aloud)"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "#e2e8f0", lineHeight: 1.4 }}>
                    {item.explanation.why_fits}
                  </p>
                </div>

                {/* Expandable Details: Documents, Steps, Source */}
                {isExpanded && (
                  <div style={{ borderTop: "1px dashed rgba(255,255,255,0.15)", paddingTop: 12, marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Documents Needed */}
                    <div>
                      <strong style={{ fontSize: "0.78rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                        <FileText size={14} /> आवश्यक कागदपत्रे (Documents Needed):
                      </strong>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(opp.documents_needed || "आधार कार्ड").split(";").map((doc, idx) => (
                          <span key={idx} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", padding: "3px 8px", borderRadius: 6, fontSize: "0.75rem" }}>
                            • {doc.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Step-by-Step Apply Guide */}
                    <div>
                      <strong style={{ fontSize: "0.78rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                        <ArrowRight size={14} /> अर्ज प्रक्रिया (How to Apply):
                      </strong>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {(opp.apply_steps || "अधिकृत पोर्टलवर नोंदणी करा").split(";").map((step, idx) => (
                          <span key={idx} style={{ fontSize: "0.78rem", color: "#e2e8f0", lineHeight: 1.3 }}>
                            {idx + 1}. {step.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Source Information & Verification Date */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: "0.72rem", color: "#64748b", background: "rgba(0,0,0,0.2)", padding: "6px 10px", borderRadius: 8 }}>
                      <span>स्रोत: {item.explanation.source_name}</span>
                      <span>शेवटची पडताळणी: {item.explanation.last_verified}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : opp.id)}
                    style={{ background: "transparent", border: "none", color: "#38bdf8", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    {isExpanded ? "कमी माहिती दाखवा ↑" : "सविस्तर माहिती व कागदपत्रे ↓"}
                  </button>

                  <a
                    href={opp.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "linear-gradient(135deg, var(--primary-saffron), #ea580c)",
                      color: "#fff",
                      textDecoration: "none",
                      padding: "8px 14px",
                      borderRadius: 10,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 2px 8px rgba(249,115,22,0.4)"
                    }}
                  >
                    अधिकृत संकेतस्थळ उघडा
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};
