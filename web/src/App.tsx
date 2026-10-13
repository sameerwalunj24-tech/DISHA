import React, { useState, useEffect } from "react";
import { I18nProvider, useI18n } from "./i18n";
import { Header } from "./components/Header";
import { StudentHome } from "./components/StudentHome";
import { FacilitatorModal } from "./components/FacilitatorModal";
import { DiscoverFlow } from "./components/DiscoverFlow";
import { OpportunitiesScreen } from "./components/OpportunitiesScreen";
import { Download, Sparkles, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DishaMain: React.FC = () => {
  const { t } = useI18n();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isFacilitatorModalOpen, setIsFacilitatorModalOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [selectedScreen, setSelectedScreen] = useState<"home" | "discover" | "pathway" | "opportunities">("home");

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
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
        />
      ) : selectedScreen === "opportunities" ? (
        <OpportunitiesScreen
          isOnline={isOnline}
          studentId={null}
          onBackToHome={() => setSelectedScreen("home")}
        />
      ) : (
        <main className="main-container">
          <div className="greeting-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={22} style={{ color: "#f97316" }} />
                <h2>
                  {selectedScreen === "pathway" && t.tiles.pathway.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedScreen("home")}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: 9999,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600
                }}
              >
                ← मागे जा (Back)
              </button>
            </div>
            <p style={{ marginTop: 10 }}>
              {selectedScreen === "pathway" && (
                "तुमच्यासाठी ३० दिवसांचे टप्पे: १) मूलभूत कौशल्ये, २) प्रात्यक्षिक सराव, ३) पात्रता परीक्षा, ४) नोकरी/अप्रेन्टिसशिप अर्ज."
              )}
            </p>
          </div>
        </main>
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
