import React, { useState, useEffect } from "react";
import {
  X, Users, Plus, FileSpreadsheet,
  Award, TrendingUp, HelpCircle, Sparkles, LogOut,
  ChevronRight, Smartphone, CheckCircle2, ArrowLeft, Send
} from "lucide-react";
import { useI18n } from "../i18n";
import { enqueueSyncItem } from "../services/db/offlineStorage";

interface FacilitatorPortalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onStartSharedDeviceMode?: (cohort: { id: string; name: string; joinCode: string }) => void;
}

interface FacilitatorProfile {
  id: string;
  name: string;
  phone_number: string;
  role: string;
  organization?: string;
  state: string;
  preferred_language: string;
}

interface CohortItem {
  id: string;
  facilitator_id: string;
  name: string;
  description?: string;
  join_code: string;
  student_count: number;
  created_at: string;
}

interface RadarFlag {
  code: string;
  title: string;
  color: string;
  reason: string;
}

interface RosterMember {
  member_id: string;
  student_id: string;
  nickname: string;
  grade: number;
  primary_interests: string[];
  career_cluster: string;
  profile_status: string;
  pathway_progress_pct: number;
  completed_steps: number;
  total_steps: number;
  last_activity: string;
  radar_flags: RadarFlag[];
}

interface CohortSummary {
  cohort_id: string;
  cohort_name: string;
  join_code: string;
  total_students: number;
  completed_profiles: number;
  top_interest_clusters: Array<{ cluster: string; count: number; label: string }>;
  upcoming_deadlines: Array<{ opportunity_id: string; title: string; deadline: string; days_remaining: number; relevant_student_count: number }>;
}

export const FacilitatorPortal: React.FC<FacilitatorPortalProps> = ({
  isOpen,
  onClose,
  isOnline,
  onStartSharedDeviceMode
}) => {
  const { language } = useI18n();

  // Auth State
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem("disha_facilitator_token") || null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState<FacilitatorProfile | null>(() => {
    try {
      const saved = localStorage.getItem("disha_facilitator_profile");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login form state
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("सुरेश माने (शिक्षक)");
  const [role, setRole] = useState("TEACHER");
  const [organization, setOrganization] = useState("जि. प. शाळा");
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cohort view state
  const [cohorts, setCohorts] = useState<CohortItem[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<CohortItem | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [summary, setSummary] = useState<CohortSummary | null>(null);
  const [isLoadingCohort, setIsLoadingCohort] = useState(false);

  // Create cohort modal
  const [showCreateCohort, setShowCreateCohort] = useState(false);
  const [newCohortName, setNewCohortName] = useState("");
  const [newCohortDesc, setNewCohortDesc] = useState("");

  // Recommend modal
  const [recommendStudent, setRecommendStudent] = useState<RosterMember | null>(null);
  const [selectedOppId, setSelectedOppId] = useState("opp_solar_surya_mitra");
  const [selectedOppTitle, setSelectedOppTitle] = useState("सूर्य मित्र सौर ऊर्जा तंत्रज्ञ प्रशिक्षण");
  const [recommendNote, setRecommendNote] = useState("तुमच्या प्रात्यक्षिक कौशल्याशी हे जुळते. लगेच अर्ज करा.");
  const [recommendSuccess, setRecommendSuccess] = useState(false);

  // Active Radar tooltip
  const [activeReason, setActiveReason] = useState<{ studentName: string; flag: RadarFlag } | null>(null);

  useEffect(() => {
    if (token) {
      loadCohorts();
    }
  }, [token]);

  if (!isOpen) return null;

  // 1. API: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setIsSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/facilitator/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phone.trim(),
          name: name.trim(),
          role,
          organization: organization.trim()
        })
      });

      if (!res.ok) throw new Error("OTP request failed");
      const data = await res.json();
      setOtpSent(true);
      setDemoOtp(data.demo_otp);
      setEnteredOtp(data.demo_otp); // Pre-fill for instant frictionless testing
    } catch (err: any) {
      setAuthError(err.message || "Failed to request OTP. Make sure server is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. API: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredOtp.trim()) return;

    setIsSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/facilitator/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phone.trim(),
          otp: enteredOtp.trim()
        })
      });

      if (!res.ok) throw new Error("Invalid OTP entered");
      const data = await res.json();
      setToken(data.access_token);
      setProfile(data.facilitator);
      localStorage.setItem("disha_facilitator_token", data.access_token);
      localStorage.setItem("disha_facilitator_profile", JSON.stringify(data.facilitator));
    } catch (err: any) {
      setAuthError(err.message || "Invalid OTP code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setProfile(null);
    setSelectedCohort(null);
    setCohorts([]);
    localStorage.removeItem("disha_facilitator_token");
    localStorage.removeItem("disha_facilitator_profile");
  };

  // 3. API: Load Cohorts
  const loadCohorts = async () => {
    if (!token) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/facilitator/cohorts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCohorts(data);
        localStorage.setItem("disha_cached_cohorts", JSON.stringify(data));
      } else {
        const cached = localStorage.getItem("disha_cached_cohorts");
        if (cached) setCohorts(JSON.parse(cached));
      }
    } catch {
      const cached = localStorage.getItem("disha_cached_cohorts");
      if (cached) setCohorts(JSON.parse(cached));
    }
  };

  // 4. API: Create Cohort
  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim() || !token) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/facilitator/cohorts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCohortName.trim(),
          description: newCohortDesc.trim() || undefined
        })
      });
      if (res.ok) {
        const created = await res.json();
        setCohorts((prev) => [created, ...prev]);
        setShowCreateCohort(false);
        setNewCohortName("");
        setNewCohortDesc("");
        handleSelectCohort(created);
      }
    } catch (err) {
      console.warn("Could not create cohort:", err);
    }
  };

  // 5. API: Load Cohort Roster & Summary
  const handleSelectCohort = async (cohort: CohortItem) => {
    setSelectedCohort(cohort);
    setIsLoadingCohort(true);
    try {
      const [rosterRes, summaryRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/v1/facilitator/cohorts/${cohort.id}/roster?language=${language}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`http://127.0.0.1:8000/api/v1/facilitator/cohorts/${cohort.id}/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (rosterRes.ok) {
        const rData = await rosterRes.json();
        setRoster(rData);
        localStorage.setItem(`disha_cached_roster_${cohort.id}`, JSON.stringify(rData));
      }
      if (summaryRes.ok) {
        const sData = await summaryRes.json();
        setSummary(sData);
      }
    } catch {
      // Fallback to cache
      const cached = localStorage.getItem(`disha_cached_roster_${cohort.id}`);
      if (cached) setRoster(JSON.parse(cached));
    } finally {
      setIsLoadingCohort(false);
    }
  };

  // 6. Action: Recommend Opportunity
  const handleSendRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommendStudent || !token) return;

    try {
      if (isOnline) {
        const res = await fetch("http://127.0.0.1:8000/api/v1/facilitator/recommend", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            student_id: recommendStudent.student_id,
            opportunity_id: selectedOppId,
            opportunity_title: selectedOppTitle,
            note: recommendNote
          })
        });
        if (!res.ok) throw new Error("Failed to send recommendation");
      } else {
        // Enqueue to offline sync outbox
        await enqueueSyncItem("recommendation", {
          student_id: recommendStudent.student_id,
          opportunity_id: selectedOppId,
          opportunity_title: selectedOppTitle,
          note: recommendNote,
          facilitator_id: profile?.id
        });
      }

      setRecommendSuccess(true);
      setTimeout(() => {
        setRecommendSuccess(false);
        setRecommendStudent(null);
      }, 1800);
    } catch (err) {
      console.warn("Recommendation error:", err);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: selectedCohort ? 820 : 540, maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Top Header */}
        <div className="modal-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", padding: 8, borderRadius: 10 }}>
              <Users size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                {language === "mr" && "मार्गदर्शक व शिक्षक पोर्टल"}
                {language === "hi" && "शिक्षक एवं मार्गदर्शक पोर्टल"}
                {language === "en" && "Facilitator & Teacher Portal"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                {profile ? `${profile.name} • ${profile.organization || "दिशा"}` : "विद्यार्थी गट व्यवस्थापन व टॅलेंट रडार"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {profile && (
              <button
                onClick={handleLogout}
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "4px 8px", borderRadius: 8, cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 4 }}
                title="लॉगआउट"
              >
                <LogOut size={13} /> लॉगआउट
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* VIEW 1: AUTHENTICATION (PHONE + DEMO OTP) */}
        {!token ? (
          <div style={{ padding: "16px 0" }}>
            {!otpSent ? (
              <form onSubmit={handleRequestOtp}>
                <h4 style={{ color: "#fff", marginBottom: 6 }}>
                  {language === "mr" && "शिक्षक / मार्गदर्शक लॉगिन"}
                  {language === "hi" && "शिक्षक / मार्गदर्शक लॉगिन"}
                  {language === "en" && "Facilitator Login"}
                </h4>
                <p style={{ color: "#cbd5e1", fontSize: "0.82rem", marginBottom: 16 }}>
                  {language === "mr" && "आपल्या मोबाईल क्रमांकावर पडताळणी OTP पाठवला जाईल."}
                  {language === "hi" && "आपके मोबाइल नंबर पर सत्यापन OTP भेजा जाएगा।"}
                  {language === "en" && "A prototype OTP will be provided on screen."}
                </p>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label htmlFor="fac-name">नाव (Your Name)</label>
                  <input
                    id="fac-name"
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label htmlFor="fac-phone">मोबाईल क्रमांक (Mobile Number)</label>
                  <input
                    id="fac-phone"
                    type="tel"
                    className="form-input"
                    placeholder="उदा. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={10}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label htmlFor="fac-org">शाळा / संस्था (School or Organization)</label>
                  <input
                    id="fac-org"
                    type="text"
                    className="form-input"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label htmlFor="fac-role">भूमिका (Role)</label>
                  <select
                    id="fac-role"
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="TEACHER">शाळा/कॉलेज शिक्षक (School Teacher)</option>
                    <option value="NGO_LEAD">NGO / कौशल्य संस्था प्रतिनिधी (NGO Partner)</option>
                    <option value="VILLAGE_VOLUNTEER">ग्रामपंचायत / समुदाय स्वयंसेवक (Village Volunteer)</option>
                  </select>
                </div>

                {authError && (
                  <p style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: 12 }}>
                    ⚠ {authError}
                  </p>
                )}

                <button type="submit" className="submit-btn" disabled={isSubmitting} style={{ width: "100%" }}>
                  {isSubmitting ? "OTP पाठवत आहे..." : "OTP मिळवा (Send OTP) →"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 12, padding: 12, marginBottom: 16, textAlign: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: 700, textTransform: "uppercase" }}>
                    डिमॉन्स्ट्रेशन OTP (Demo Mode)
                  </span>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", letterSpacing: 4, margin: "4px 0" }}>
                    {demoOtp || "123456"}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>
                    SMS ऐवजी स्क्रीनवर दाखवलेला हाच कोड खाली टाका.
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label htmlFor="fac-otp">६-अंकी OTP टाका (Enter 6-digit OTP)</label>
                  <input
                    id="fac-otp"
                    type="text"
                    className="form-input"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    maxLength={6}
                    style={{ letterSpacing: 4, textAlign: "center", fontSize: "1.2rem", fontWeight: 700 }}
                    required
                  />
                </div>

                {authError && (
                  <p style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: 12 }}>
                    ⚠ {authError}
                  </p>
                )}

                <button type="submit" className="submit-btn" disabled={isSubmitting} style={{ width: "100%" }}>
                  {isSubmitting ? "पडताळणी होत आहे..." : "सत्यापित करा व प्रवेश करा (Verify & Login) →"}
                </button>
              </form>
            )}
          </div>
        ) : selectedCohort ? (
          /* VIEW 2: COHORT DASHBOARD & TALENT RADAR ROSTER */
          <div style={{ padding: "16px 0" }}>
            {/* Cohort Nav Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <button
                onClick={() => setSelectedCohort(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}
              >
                <ArrowLeft size={16} /> सर्व गट (All Cohorts)
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                {/* Shared-Device Mode Button */}
                {onStartSharedDeviceMode && (
                  <button
                    onClick={() => {
                      onStartSharedDeviceMode({
                        id: selectedCohort.id,
                        name: selectedCohort.name,
                        joinCode: selectedCohort.join_code
                      });
                      onClose();
                    }}
                    style={{
                      background: "rgba(249,115,22,0.18)",
                      border: "1px solid #f97316",
                      color: "#fdba74",
                      padding: "6px 12px",
                      borderRadius: 9999,
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <Smartphone size={14} /> सामायिक डिव्हाइस सत्र सुरू करा
                  </button>
                )}

                {/* CSV Download Link */}
                <a
                  href={`http://127.0.0.1:8000/api/v1/facilitator/cohorts/${selectedCohort.id}/export.csv`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: 9999,
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    textDecoration: "none"
                  }}
                >
                  <FileSpreadsheet size={14} /> अनामित CSV
                </a>
              </div>
            </div>

            {/* Join Code Banner */}
            <div style={{ background: "rgba(30,41,59,0.8)", border: "1.5px solid rgba(249,115,22,0.4)", borderRadius: 14, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h4 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>{selectedCohort.name}</h4>
                <p style={{ margin: "2px 0 0 0", color: "#94a3b8", fontSize: "0.8rem" }}>
                  विद्यार्थ्यांना खालील कोड देऊन गटात सामील करा:
                </p>
              </div>
              <div style={{ background: "#f97316", color: "#fff", padding: "6px 14px", borderRadius: 8, fontWeight: 900, fontSize: "1.2rem", letterSpacing: 2 }}>
                {selectedCohort.join_code}
              </div>
            </div>

            {/* Summary Cards */}
            {summary && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ background: "rgba(15,23,42,0.6)", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>एकूण विद्यार्थी / प्रोफाईल पूर्ण</span>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
                    {summary.total_students} विद्यार्थी <span style={{ fontSize: "0.85rem", color: "#34d399" }}>({summary.completed_profiles} पूर्ण)</span>
                  </div>
                </div>
                <div style={{ background: "rgba(15,23,42,0.6)", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>सर्वोच्च करिअर कल (Top Cluster)</span>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fdba74" }}>
                    {summary.top_interest_clusters[0]?.label || "सामान्य शोध"}
                  </div>
                </div>
              </div>
            )}

            {/* Roster & Talent Radar Section */}
            <h4 style={{ color: "#fff", fontSize: "0.95rem", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} style={{ color: "#f97316" }} />
              विद्यार्थी यादी व टॅलेंट रडार (Roster & Talent Radar):
            </h4>

            {isLoadingCohort ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>माहिती लोड होत आहे...</p>
            ) : roster.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 20px", background: "rgba(15,23,42,0.4)", borderRadius: 12 }}>
                <Users size={32} style={{ color: "#64748b", margin: "0 auto 8px" }} />
                <p style={{ color: "#cbd5e1", fontSize: "0.9rem" }}>या गटात अजून विद्यार्थी सामील झाले नाहीत.</p>
                <p style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                  विद्यार्थ्यांना कोड द्या: <strong>{selectedCohort.join_code}</strong> किंवा वर दिलेल्या सामायिक डिव्हाइस बटणावर टॅप करा.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {roster.map((student) => (
                  <div
                    key={student.member_id}
                    style={{
                      background: "rgba(15,23,42,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 14,
                      padding: 14
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                      <div>
                        {/* Nickname / Roll number for data minimisation */}
                        <strong style={{ color: "#fff", fontSize: "1rem" }}>{student.nickname}</strong>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginLeft: 8 }}>
                          {student.grade} वी
                        </span>
                        <div style={{ fontSize: "0.78rem", color: "#38bdf8", marginTop: 2 }}>
                          कल: {student.career_cluster.replace("_", " ")}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setRecommendStudent(student);
                          setRecommendSuccess(false);
                        }}
                        style={{
                          background: "rgba(249,115,22,0.2)",
                          border: "1px solid rgba(249,115,22,0.5)",
                          color: "#fdba74",
                          padding: "6px 12px",
                          borderRadius: 9999,
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}
                      >
                        <Award size={13} /> संधी शिफारस करा
                      </button>
                    </div>

                    {/* Pathway Progress Bar */}
                    <div style={{ margin: "8px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8", marginBottom: 3 }}>
                        <span>३० दिवसांचा मार्ग (Pathway Progress)</span>
                        <strong style={{ color: "#34d399" }}>{student.pathway_progress_pct}% ({student.completed_steps}/{student.total_steps} पायऱ्या)</strong>
                      </div>
                      <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 9999, overflow: "hidden" }}>
                        <div style={{ width: `${student.pathway_progress_pct}%`, height: "100%", background: "#10b981", borderRadius: 9999, transition: "width 0.4s ease" }} />
                      </div>
                    </div>

                    {/* Talent Radar Flags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {student.radar_flags.map((flag, fIdx) => {
                        const bg =
                          flag.color === "emerald" ? "rgba(16,185,129,0.18)" :
                          flag.color === "blue" ? "rgba(59,130,246,0.18)" : "rgba(245,158,11,0.18)";
                        const border =
                          flag.color === "emerald" ? "rgba(16,185,129,0.4)" :
                          flag.color === "blue" ? "rgba(59,130,246,0.4)" : "rgba(245,158,11,0.4)";
                        const textCol =
                          flag.color === "emerald" ? "#34d399" :
                          flag.color === "blue" ? "#60a5fa" : "#fbbf24";

                        return (
                          <button
                            key={fIdx}
                            onClick={() => setActiveReason({ studentName: student.nickname, flag })}
                            style={{
                              background: bg,
                              border: `1px solid ${border}`,
                              color: textCol,
                              padding: "4px 10px",
                              borderRadius: 9999,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4
                            }}
                            title="कारण पहा (Click for explanation)"
                          >
                            <TrendingUp size={11} />
                            {flag.title}
                            <HelpCircle size={10} style={{ opacity: 0.7 }} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* VIEW 3: COHORT LISTING & MANAGEMENT */
          <div style={{ padding: "16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h4 style={{ margin: 0, color: "#fff", fontSize: "1rem" }}>
                  {language === "mr" && "माझे विद्यार्थी गट (My Cohorts)"}
                  {language === "hi" && "मेरे छात्र समूह (My Cohorts)"}
                  {language === "en" && "My Cohorts"}
                </h4>
                <p style={{ margin: "2px 0 0 0", color: "#94a3b8", fontSize: "0.78rem" }}>
                  वर्गानुसार विद्यार्थी व्यवस्थापित करा
                </p>
              </div>
              <button
                onClick={() => setShowCreateCohort(true)}
                style={{
                  background: "#f97316",
                  border: "none",
                  color: "#fff",
                  padding: "8px 14px",
                  borderRadius: 9999,
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <Plus size={15} /> नवीन गट जोडा
              </button>
            </div>

            {/* Create Cohort Sub-Form */}
            {showCreateCohort && (
              <form onSubmit={handleCreateCohort} style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(249,115,22,0.5)", borderRadius: 14, padding: 14, marginBottom: 16 }}>
                <h5 style={{ margin: "0 0 10px 0", color: "#fff", fontSize: "0.9rem" }}>नवीन गट तयार करा (Create Cohort)</h5>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label htmlFor="cohort-name">गटाचे नाव (Cohort Name)</label>
                  <input
                    id="cohort-name"
                    type="text"
                    className="form-input"
                    placeholder="उदा. इयत्ता १० वी अ / ITI बॅच"
                    value={newCohortName}
                    onChange={(e) => setNewCohortName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label htmlFor="cohort-desc">वर्णन (Description - Optional)</label>
                  <input
                    id="cohort-desc"
                    type="text"
                    className="form-input"
                    placeholder="उदा. २०२६ बॅच"
                    value={newCohortDesc}
                    onChange={(e) => setNewCohortDesc(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="submit-btn" style={{ flex: 1, padding: "8px 14px", fontSize: "0.82rem" }}>
                    तयार करा व कोड मिळवा
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateCohort(false)}
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: "0.82rem" }}
                  >
                    रद्द करा
                  </button>
                </div>
              </form>
            )}

            {/* List of Cohort Cards */}
            {cohorts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", background: "rgba(15,23,42,0.4)", borderRadius: 12 }}>
                <Users size={32} style={{ color: "#64748b", margin: "0 auto 8px" }} />
                <p style={{ color: "#cbd5e1", fontSize: "0.88rem" }}>अद्याप कोणताही गट तयार केला नाही.</p>
                <p style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
                  पहिला गट तयार करण्यासाठी वरील 'नवीन गट जोडा' बटणावर टॅप करा.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cohorts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCohort(c)}
                    style={{
                      background: "rgba(30,41,59,0.7)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 14,
                      padding: 14,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.borderColor = "#f97316")}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
                  >
                    <div>
                      <strong style={{ color: "#fff", fontSize: "1rem", display: "block" }}>{c.name}</strong>
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                        जॉईन कोड: <strong style={{ color: "#f97316", letterSpacing: 1 }}>{c.join_code}</strong> • {c.student_count} विद्यार्थी
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f97316", fontSize: "0.82rem", fontWeight: 700 }}>
                      डॅशबोर्ड <ChevronRight size={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL OVERLAY: TALENT RADAR EXPLANATION (WHY) */}
        {activeReason && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 16
          }}>
            <div style={{
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 16,
              maxWidth: 420,
              width: "100%",
              padding: 20
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <strong style={{ color: "#fff", fontSize: "1rem" }}>
                  {activeReason.flag.title}
                </strong>
                <button
                  onClick={() => setActiveReason(null)}
                  style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>
              <p style={{ color: "#cbd5e1", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: 16 }}>
                <strong>विद्यार्थी:</strong> {activeReason.studentName}<br />
                <strong>कारण (Why):</strong> {activeReason.flag.reason}
              </p>
              <button
                className="submit-btn"
                style={{ width: "100%", padding: "10px 14px", fontSize: "0.85rem" }}
                onClick={() => setActiveReason(null)}
              >
                समजले (Understood)
              </button>
            </div>
          </div>
        )}

        {/* MODAL OVERLAY: RECOMMEND OPPORTUNITY */}
        {recommendStudent && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 16
          }}>
            <div style={{
              background: "#1e293b",
              border: "1.5px solid #f97316",
              borderRadius: 16,
              maxWidth: 460,
              width: "100%",
              padding: 20
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: 0, color: "#fff", fontSize: "1rem" }}>संधी शिफारस करा (Recommend Opportunity)</h4>
                  <p style={{ margin: "2px 0 0 0", color: "#94a3b8", fontSize: "0.78rem" }}>
                    विद्यार्थी: <strong>{recommendStudent.nickname}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setRecommendStudent(null)}
                  style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              {recommendSuccess ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#34d399" }}>
                  <CheckCircle2 size={40} style={{ margin: "0 auto 8px" }} />
                  <strong>शिफारस यशस्वीरीत्या पाठवली गेली!</strong>
                  <p style={{ color: "#cbd5e1", fontSize: "0.8rem", margin: "4px 0 0 0" }}>
                    विद्यार्थ्याला त्यांच्या संधी यादीत ही शिफारस दिसेल.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendRecommendation}>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label htmlFor="opp-select">संधी निवडा (Select Opportunity)</label>
                    <select
                      id="opp-select"
                      className="form-select"
                      value={selectedOppId}
                      onChange={(e) => {
                        setSelectedOppId(e.target.value);
                        const txt = e.target.options[e.target.selectedIndex].text;
                        setSelectedOppTitle(txt);
                      }}
                    >
                      <option value="opp_solar_surya_mitra">सूर्य मित्र सौर ऊर्जा तंत्रज्ञ प्रशिक्षण (Surya Mitra Skill)</option>
                      <option value="opp_mahadbt_post_matric">महाराष्ट्र पोस्ट-मॅट्रिक शिष्यवृत्ती (MahaDBT Post-Matric)</option>
                      <option value="opp_iti_diesel_mechanic">ITI डिझेल मेकॅनिक राष्ट्रीय शिकाऊ उमेदवारी (Apprenticeship)</option>
                      <option value="opp_pm_vishwakarma">पीएम विश्वकर्मा कारागीर कौशल्य योजना (PM Vishwakarma)</option>
                      <option value="opp_dairy_nddb_vocational">दुग्ध व्यवसाय व डेअरी फार्मिंग प्रशिक्षण (NDDB Dairy)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label htmlFor="rec-note">मार्गदर्शकाची टीप (Facilitator's Note for Student)</label>
                    <textarea
                      id="rec-note"
                      className="form-input"
                      rows={3}
                      value={recommendNote}
                      onChange={(e) => setRecommendNote(e.target.value)}
                      placeholder="उदा. तुझ्या कौशल्याशी हे जुळते. लगेच अर्ज कर."
                      required
                      style={{ resize: "vertical" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" className="submit-btn" style={{ flex: 1, padding: "10px 14px", fontSize: "0.85rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Send size={14} /> शिफारस पाठवा
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecommendStudent(null)}
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}
                    >
                      रद्द करा
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
