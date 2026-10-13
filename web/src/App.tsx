import React, { useState, useEffect } from "react";
import { I18nProvider, useI18n } from "./i18n";
import { Header } from "./components/Header";
import { StudentHome } from "./components/StudentHome";
import { FacilitatorPortal } from "./components/FacilitatorPortal";
import { JoinCohortModal } from "./components/JoinCohortModal";
import { DiscoverFlow } from "./components/DiscoverFlow";
import { OpportunitiesScreen } from "./components/OpportunitiesScreen";
import { MyPathScreen } from "./components/MyPathScreen";
import { Download, X } from "lucide-react";

import { useSyncStatus } from "./services/sync/useSyncStatus";
import { clearStudentBrowserSession } from "./services/db/offlineStorage";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DishaMain: React.FC = () => {
  const { t } = useI18n();
  const { isOnline } = useSyncStatus();
  const [isFacilitatorPortalOpen, setIsFacilitatorPortalOpen] = useState(false);
  const [isJoinCohortOpen, setIsJoinCohortOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [selectedScreen, setSelectedScreen] = useState<"home" | "discover" | "pathway" | "opportunities">("home");

  // Shared-Device Mode State
  const [sharedDeviceCohort, setSharedDeviceCohort] = useState<{ id: string; name: string; joinCode: string } | null>(() => {
    try {
      const saved = localStorage.getItem("disha_shared_device_cohort");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [joinedCohortName, setJoinedCohortName] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem("disha_joined_cohort");
      return saved ? JSON.parse(saved).name : null;
    } catch {
      return null;
    }
  });

  const [studentId, setStudentId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("disha_student_id") || null;
    } catch {
      return null;
    }
  });

  // Listen for sync service updating student ID after offline upload
  useEffect(() => {
    const handleStudentIdUpdate = (e: any) => {
      const newId = e.detail?.studentId;
      if (newId) setStudentId(newId);
    };

    window.addEventListener("disha_student_id_updated", handleStudentIdUpdate);
    return () => window.removeEventListener("disha_student_id_updated", handleStudentIdUpdate);
  }, []);

  // Capture PWA installation prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
        setShowInstallBanner(false);
      }
    } else {
      alert("दिशा ॲप इन्स्टॉल करण्यासाठी ब्राऊझरच्या मेन्यूमधून 'Add to Home screen' निवडा.");
    }
  };

  const handleTileSelect = (tileKey: "discover" | "pathway" | "opportunities") => {
    setSelectedScreen(tileKey);
  };

  // Next Student handler in Shared-Device Mode: cleans up student state, cached profile, matches and pathway
  const handleNextStudent = async () => {
    try {
      await clearStudentBrowserSession(studentId);
    } catch (e) {
      console.warn("Error clearing student browser session:", e);
    }
    setStudentId(null);
    setSelectedScreen("discover");
  };

  const handleStartSharedDeviceMode = (cohort: { id: string; name: string; joinCode: string }) => {
    setSharedDeviceCohort(cohort);
    try {
      localStorage.setItem("disha_shared_device_cohort", JSON.stringify(cohort));
    } catch {}
    setIsFacilitatorPortalOpen(false);
    setSelectedScreen("discover");
  };

  const handleExitSharedDeviceMode = () => {
    setSharedDeviceCohort(null);
    try {
      localStorage.removeItem("disha_shared_device_cohort");
    } catch {}
  };

  const handleStudentCreated = async (newId: string) => {
    setStudentId(newId);
    if (sharedDeviceCohort) {
      try {
        await fetch("http://127.0.0.1:8000/api/v1/cohorts/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            join_code: sharedDeviceCohort.joinCode,
            student_id: newId,
            nickname: `विद्यार्थी (${newId.slice(0, 6)})`
          })
        });
      } catch (err) {
        console.warn("Auto-cohort join in shared mode failed:", err);
      }
    }
  };

  return (
    <>
      <Header
        isOnline={isOnline}
        onOpenFacilitatorModal={() => setIsFacilitatorPortalOpen(true)}
        onOpenJoinCohortModal={() => setIsJoinCohortOpen(true)}
      />

      {/* Shared-Device Mode Active Banner */}
      {sharedDeviceCohort && (
        <div style={{
          background: "linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)",
          borderBottom: "2px solid #f97316",
          padding: "10px 16px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          position: "sticky",
          top: 56,
          zIndex: 900
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: "#f97316", color: "#fff", padding: "3px 8px", borderRadius: 6, fontSize: "0.74rem", fontWeight: 800 }}>
              📱 सामायिक डिव्हाइस
            </span>
            <span style={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.86rem" }}>
              {sharedDeviceCohort.name} <span style={{ color: "#fdba74", fontFamily: "monospace" }}>({sharedDeviceCohort.joinCode})</span>
            </span>
            {studentId && (
              <span style={{ color: "#94a3b8", fontSize: "0.76rem" }}>
                • चालू विद्यार्थी: {studentId.slice(0, 8)}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleNextStudent}
              style={{
                background: "#f97316",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                boxShadow: "0 2px 6px rgba(249,115,22,0.4)"
              }}
            >
              पुढील विद्यार्थी (Next Student) →
            </button>
            <button
              onClick={handleExitSharedDeviceMode}
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#cbd5e1",
                border: "none",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: "0.78rem",
                cursor: "pointer"
              }}
            >
              सत्र संपवा
            </button>
          </div>
        </div>
      )}

      {/* PWA Install Banner (dismissible) */}
      {showInstallBanner && (
        <div style={{ padding: "8px 16px 0 16px", maxWidth: 640, margin: "0 auto", width: "100%" }}>
          <div className="install-banner">
            <div className="install-text">
              <h4>{t.pwa.installTitle}</h4>
              <p>{t.pwa.installDesc}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button className="install-btn" onClick={handleInstallClick}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Download size={13} />
                  {t.pwa.installBtn}
                </span>
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
                aria-label="Dismiss banner"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedScreen === "home" ? (
        <StudentHome
          onSelectTile={handleTileSelect}
          onOpenJoinCohort={() => setIsJoinCohortOpen(true)}
          joinedCohortName={joinedCohortName}
        />
      ) : selectedScreen === "discover" ? (
        <DiscoverFlow
          isOnline={isOnline}
          onBackToHome={() => setSelectedScreen("home")}
          onGoToPathway={() => setSelectedScreen("pathway")}
          onStudentCreated={handleStudentCreated}
        />
      ) : selectedScreen === "opportunities" ? (
        <OpportunitiesScreen
          isOnline={isOnline}
          studentId={studentId}
          onBackToHome={() => setSelectedScreen("home")}
        />
      ) : selectedScreen === "pathway" ? (
        <MyPathScreen
          isOnline={isOnline}
          studentId={studentId}
          onBackToHome={() => setSelectedScreen("home")}
          onGoToOpportunities={() => setSelectedScreen("opportunities")}
        />
      ) : (
        <StudentHome
          onSelectTile={handleTileSelect}
          onOpenJoinCohort={() => setIsJoinCohortOpen(true)}
          joinedCohortName={joinedCohortName}
        />
      )}

      <FacilitatorPortal
        isOpen={isFacilitatorPortalOpen}
        onClose={() => setIsFacilitatorPortalOpen(false)}
        isOnline={isOnline}
        onStartSharedDeviceMode={handleStartSharedDeviceMode}
      />

      <JoinCohortModal
        isOpen={isJoinCohortOpen}
        onClose={() => setIsJoinCohortOpen(false)}
        studentId={studentId}
        onJoinedSuccess={(cohortName) => setJoinedCohortName(cohortName)}
      />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <DishaMain />
    </I18nProvider>
  );
};

export default App;
