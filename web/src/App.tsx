import React, { useState, useEffect } from "react";
import { I18nProvider, useI18n } from "./i18n";
import { Header } from "./components/Header";
import { StudentHome } from "./components/StudentHome";
import { FacilitatorPortal } from "./components/FacilitatorPortal";
import { JoinCohortModal } from "./components/JoinCohortModal";
import { DiscoverFlow } from "./components/DiscoverFlow";
import { OpportunitiesScreen } from "./components/OpportunitiesScreen";
import { MyPathScreen } from "./components/MyPathScreen";
import { MarketplaceScreen } from "./components/MarketplaceScreen";
import { AboutModal } from "./components/AboutModal";
import { BottomNav } from "./components/BottomNav";
import { OutboxDrawer } from "./components/OutboxDrawer";
import { Download, X, RefreshCw } from "lucide-react";

import { useSyncStatus } from "./services/sync/useSyncStatus";
import { syncService } from "./services/sync/syncService";
import { clearStudentBrowserSession } from "./services/db/offlineStorage";
import { voiceService } from "./services/voice";
import { apiUrl } from "./services/apiConfig";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DishaMain: React.FC = () => {
  const { language, t } = useI18n();
  const { isOnline, isSyncing, pendingCount } = useSyncStatus();
  const [isFacilitatorPortalOpen, setIsFacilitatorPortalOpen] = useState(false);
  const [isJoinCohortOpen, setIsJoinCohortOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [selectedScreen, setSelectedScreen] = useState<"home" | "discover" | "pathway" | "opportunities" | "marketplace">("home");
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isOutboxDrawerOpen, setIsOutboxDrawerOpen] = useState<boolean>(false);

  // Active Speech State Event Listeners
  useEffect(() => {
    const handleSpeechStart = () => setIsSpeaking(true);
    const handleSpeechEnd = () => setIsSpeaking(false);

    window.addEventListener("disha_speech_start", handleSpeechStart);
    window.addEventListener("disha_speech_end", handleSpeechEnd);

    return () => {
      window.removeEventListener("disha_speech_start", handleSpeechStart);
      window.removeEventListener("disha_speech_end", handleSpeechEnd);
    };
  }, []);

  const handleStopSpeech = () => {
    voiceService.cancelSpeech();
    setIsSpeaking(false);
  };

  // Outdoor Sunlight Mode Theme State
  const [theme, setTheme] = useState<"dark" | "sunlight">(() => {
    try {
      const saved = localStorage.getItem("disha_theme");
      return saved === "sunlight" ? "sunlight" : "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("disha_theme", theme);
    } catch {}
    if (theme === "sunlight") {
      document.body.classList.add("theme-sunlight");
    } else {
      document.body.classList.remove("theme-sunlight");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "sunlight" : "dark"));
  };

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

  // Listen for outbox sync completion event
  useEffect(() => {
    let timer: number | null = null;
    const handleSyncCompleted = () => {
      const msg = language === "mr"
        ? "✓ माहिती सिंक झाली (Synced with server)"
        : language === "hi"
        ? "✓ जानकारी सिंक हो गई (Synced with server)"
        : "✓ Synced with server";
      setSyncToast(msg);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setSyncToast(null), 3500);
    };

    window.addEventListener("disha_sync_completed", handleSyncCompleted);
    return () => {
      window.removeEventListener("disha_sync_completed", handleSyncCompleted);
      if (timer) window.clearTimeout(timer);
    };
  }, [language]);

  // Capture PWA installation prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  // Listen for Service Worker update available
  useEffect(() => {
    const handleSwUpdate = (e: any) => {
      if (e.detail?.waitingWorker) {
        setWaitingWorker(e.detail.waitingWorker);
      }
      setSwUpdateAvailable(true);
    };

    window.addEventListener("disha_sw_update_available", handleSwUpdate);
    return () => window.removeEventListener("disha_sw_update_available", handleSwUpdate);
  }, []);

  const handleApplyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };

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

  const handleTileSelect = (tileKey: "discover" | "pathway" | "opportunities" | "marketplace") => {
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
        await fetch(apiUrl("/api/v1/cohorts/join"), {
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
    <div className={`disha-app-root ${theme === "sunlight" ? "theme-sunlight" : ""}`} style={{ minHeight: "100vh" }}>
      <Header
        isOnline={isOnline}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenOutboxDrawer={() => setIsOutboxDrawerOpen(true)}
        onOpenFacilitatorModal={() => setIsFacilitatorPortalOpen(true)}
        onOpenJoinCohortModal={() => setIsJoinCohortOpen(true)}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
      />

      {/* Outbox Sync Success Confirmation Banner */}
      {syncToast && (
        <div style={{
          position: "sticky",
          top: 56,
          zIndex: 999,
          background: "#16a34a",
          color: "#ffffff",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontSize: "0.9rem",
          fontWeight: 700,
          boxShadow: "0 4px 12px rgba(22, 163, 74, 0.4)"
        }}>
          <span>{syncToast}</span>
        </div>
      )}

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

      {/* PWA Update Available Prompt Banner */}
      {swUpdateAvailable && (
        <div style={{ padding: "8px 16px 0 16px", maxWidth: 640, margin: "0 auto", width: "100%" }}>
          <div style={{
            background: "linear-gradient(135deg, #1e293b, #0f172a)",
            border: "1px solid #38bdf8",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            boxShadow: "0 4px 12px rgba(56, 189, 248, 0.15)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RefreshCw size={18} color="#38bdf8" />
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>
                  नवीन आवृत्ती उपलब्ध आहे / Update Available
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  नवीन फीचर्ससाठी ॲप अपडेट करा / Refresh to get the latest updates.
                </div>
              </div>
            </div>
            <button
              onClick={handleApplyUpdate}
              style={{
                background: "#38bdf8",
                color: "#0f172a",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              रिफ्रेश करा / Refresh
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
      ) : selectedScreen === "marketplace" ? (
        <MarketplaceScreen
          isOnline={isOnline}
          studentId={studentId}
          onBackToHome={() => setSelectedScreen("home")}
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

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Floating Active Speech Waveform Indicator */}
      {isSpeaking && (
        <div
          className="active-speech-indicator"
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 74,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 90,
            background: "var(--bg-card)",
            border: "1.5px solid var(--primary-saffron)",
            borderRadius: 9999,
            padding: "8px 14px 8px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4), var(--shadow-glow)",
            maxWidth: "92vw"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="audio-waveform-bars" aria-hidden="true">
              <span className="wave-bar bar-1" />
              <span className="wave-bar bar-2" />
              <span className="wave-bar bar-3" />
              <span className="wave-bar bar-4" />
            </div>
            <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap" }}>
              {language === "mr" ? "🔊 बोलत आहे..." : language === "hi" ? "🔊 बोल रहा है..." : "🔊 Speaking..."}
            </span>
          </div>

          <button
            onClick={handleStopSpeech}
            style={{
              minWidth: 44,
              minHeight: 44,
              padding: "6px 14px",
              borderRadius: 9999,
              backgroundColor: "rgba(239, 68, 68, 0.18)",
              border: "1.5px solid #ef4444",
              color: "#f87171",
              fontSize: "0.82rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              touchAction: "manipulation",
              transition: "all 0.15s ease"
            }}
            title={language === "mr" ? "आवाज थांबवा" : language === "hi" ? "आवाज़ रोकें" : "Stop Speaking"}
            aria-label="Stop audio speech playback"
          >
            <span>{language === "mr" ? "थांबवा (Stop)" : language === "hi" ? "रोकें (Stop)" : "Stop"}</span>
          </button>
        </div>
      )}

      {/* Interactive Outbox Sync Status Drawer */}
      <OutboxDrawer
        isOpen={isOutboxDrawerOpen}
        onClose={() => setIsOutboxDrawerOpen(false)}
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        onTriggerSync={() => syncService.triggerSync()}
      />

      <BottomNav
        activeScreen={selectedScreen}
        onSelectScreen={(screen) => setSelectedScreen(screen)}
      />
    </div>
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
