import React, { useState, useRef } from "react";
import { Compass, Users, WifiOff, RefreshCw, Check } from "lucide-react";
import { useI18n, LANGUAGE_NAMES } from "../i18n";
import type { Language } from "../i18n";
import { useSyncStatus } from "../services/sync/useSyncStatus";

interface HeaderProps {
  isOnline: boolean;
  onOpenFacilitatorModal: () => void;
  onOpenJoinCohortModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenFacilitatorModal, onOpenJoinCohortModal }) => {
  const { language, setLanguage, t } = useI18n();
  const { isOnline, isDemoOffline, pendingCount, isSyncing, triggerSync, toggleDemoOffline } = useSyncStatus();

  // 5-tap hidden demo mode toggle
  const [tapCount, setTapCount] = useState<number>(0);
  const [demoToast, setDemoToast] = useState<string | null>(null);
  const tapResetTimer = useRef<number | null>(null);

  const handleLogoTap = () => {
    if (tapResetTimer.current) {
      window.clearTimeout(tapResetTimer.current);
    }

    const nextCount = tapCount + 1;
    if (nextCount >= 5) {
      setTapCount(0);
      const isNowOffline = toggleDemoOffline();
      const toastMsg = isNowOffline
        ? (language === "mr" ? "⚡ डेमो मोड: ऑफलाइन सिम्युलेट केले" : language === "hi" ? "⚡ डेमो मोड: ऑफ़लाइन सिम्युलेट किया गया" : "⚡ Demo Mode: Simulated Offline Mode")
        : (language === "mr" ? "🌐 डेमो मोड: ऑनलाईन मोड पुनर्संचयित" : language === "hi" ? "🌐 डेमो मोड: ऑनलाइन मोड पुनर्स्थापित" : "🌐 Demo Mode: Online Mode Restored");
      setDemoToast(toastMsg);
      setTimeout(() => setDemoToast(null), 3500);
    } else {
      setTapCount(nextCount);
      tapResetTimer.current = window.setTimeout(() => {
        setTapCount(0);
      }, 2000);
    }
  };

  // Compute status chip labels in mr / hi / en
  const getStatusChipContent = () => {
    if (!isOnline) {
      // Offline mode (real or simulated)
      let label = "";
      if (pendingCount > 0) {
        if (language === "mr") label = `ऑफलाइन (${pendingCount} प्रलंबित)`;
        else if (language === "hi") label = `ऑफ़लाइन (${pendingCount} लंबित)`;
        else label = `Offline (${pendingCount} pending)`;
      } else {
        if (language === "mr") label = "ऑफलाइन";
        else if (language === "hi") label = "ऑफ़लाइन";
        else label = "Offline";
      }

      return {
        className: "status-pill offline",
        icon: <WifiOff size={13} />,
        label,
        clickable: false
      };
    }

    if (isSyncing) {
      let label = "Syncing...";
      if (language === "mr") label = "सिंक होत आहे...";
      else if (language === "hi") label = "सिंक हो रहा है...";

      return {
        className: "status-pill pending",
        icon: <RefreshCw size={13} className="spin" />,
        label,
        clickable: false
      };
    }

    if (pendingCount > 0) {
      let label = `${pendingCount} pending (Sync now)`;
      if (language === "mr") label = `${pendingCount} प्रलंबित (सिंक करा)`;
      else if (language === "hi") label = `${pendingCount} लंबित (सिंक करें)`;

      return {
        className: "status-pill pending",
        icon: <RefreshCw size={13} />,
        label,
        clickable: true
      };
    }

    // Fully synced online state
    let label = "Synced";
    if (language === "mr") label = "सिंक झाले (Synced)";
    else if (language === "hi") label = "सिंक हुआ (Synced)";

    return {
      className: "status-pill online",
      icon: <Check size={13} />,
      label,
      clickable: false
    };
  };

  const chip = getStatusChipContent();

  return (
    <>
      <header className="app-header">
        <div className="brand-section">
          <div
            className="logo-badge"
            title="Disha Logo (Tap 5 times for offline demo mode)"
            onClick={handleLogoTap}
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            <Compass />
          </div>
          <div className="brand-titles">
            <h1>{t.appName}</h1>
            <p>{t.appTagline}</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Offline / N pending / Synced Status Chip */}
          <div
            className={chip.className}
            title={chip.clickable ? "Tap to sync pending outbox now" : isOnline ? "Synced to server" : "Offline mode"}
            onClick={chip.clickable ? () => triggerSync() : undefined}
            role={chip.clickable ? "button" : undefined}
            tabIndex={chip.clickable ? 0 : undefined}
            style={{ cursor: chip.clickable ? "pointer" : "default" }}
          >
            <span className="status-dot"></span>
            {chip.icon}
            <span>{chip.label}</span>
          </div>

          {/* Trilingual Switcher (Marathi / Hindi / English) */}
          <div className="lang-selector-group" role="group" aria-label="Language Selector">
            {(["mr", "hi", "en"] as Language[]).map((lang) => (
              <button
                key={lang}
                className={`lang-btn ${language === lang ? "active" : ""}`}
                onClick={() => setLanguage(lang)}
                aria-pressed={language === lang}
                title={LANGUAGE_NAMES[lang].label}
              >
                {LANGUAGE_NAMES[lang].nativeName}
              </button>
            ))}
          </div>

          {/* Student Join Cohort Button */}
          {onOpenJoinCohortModal && (
            <button
              className="facilitator-link-btn"
              onClick={onOpenJoinCohortModal}
              style={{
                background: "rgba(14, 165, 233, 0.12)",
                borderColor: "rgba(14, 165, 233, 0.4)",
                color: "#38bdf8"
              }}
              title={language === "mr" ? "शिक्षकांच्या वर्गात सामील व्हा" : language === "hi" ? "समूह में शामिल हों" : "Join Cohort"}
            >
              <Users size={15} />
              <span>{language === "mr" ? "वर्ग कोड" : language === "hi" ? "समूह कोड" : "Join Cohort"}</span>
            </button>
          )}

          {/* Facilitator Portal Button */}
          <button
            className="facilitator-link-btn"
            onClick={onOpenFacilitatorModal}
            title={t.facilitatorLogin}
          >
            <Users size={15} />
            <span>{t.facilitatorLogin}</span>
          </button>
        </div>
      </header>

      {/* Demo Mode Notification Toast */}
      {demoToast && (
        <div style={{
          background: isDemoOffline ? "rgba(249,115,22,0.95)" : "rgba(16,185,129,0.95)",
          color: "#fff",
          padding: "6px 14px",
          textAlign: "center",
          fontSize: "0.82rem",
          fontWeight: 700,
          position: "sticky",
          top: 0,
          zIndex: 9999,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          letterSpacing: 0.3
        }}>
          {demoToast}
        </div>
      )}
    </>
  );
};
