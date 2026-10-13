import React, { useState, useEffect } from "react";
import { I18nProvider, useI18n } from "./i18n";
import { Header } from "./components/Header";
import { StudentHome } from "./components/StudentHome";
import { FacilitatorModal } from "./components/FacilitatorModal";
import { DiscoverFlow } from "./components/DiscoverFlow";
import { OpportunitiesScreen } from "./components/OpportunitiesScreen";
import { MyPathScreen } from "./components/MyPathScreen";
import { Download, X } from "lucide-react";

import { useSyncStatus } from "./services/sync/useSyncStatus";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DishaMain: React.FC = () => {
  const { t } = useI18n();
  const { isOnline } = useSyncStatus();
  const [isFacilitatorModalOpen, setIsFacilitatorModalOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [selectedScreen, setSelectedScreen] = useState<"home" | "discover" | "pathway" | "opportunities">("home");
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

  return (
    <>
      <Header
        isOnline={isOnline}
        onOpenFacilitatorModal={() => setIsFacilitatorModalOpen(true)}
      />

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
        <StudentHome onSelectTile={handleTileSelect} />
      ) : selectedScreen === "discover" ? (
        <DiscoverFlow
          isOnline={isOnline}
          onBackToHome={() => setSelectedScreen("home")}
          onGoToPathway={() => setSelectedScreen("pathway")}
          onStudentCreated={(id) => setStudentId(id)}
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
        <StudentHome onSelectTile={handleTileSelect} />
      )}

      <FacilitatorModal
        isOpen={isFacilitatorModalOpen}
        onClose={() => setIsFacilitatorModalOpen(false)}
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
