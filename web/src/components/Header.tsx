import React from "react";
import { Compass, Users, Wifi, WifiOff } from "lucide-react";
import { useI18n, LANGUAGE_NAMES } from "../i18n";
import type { Language } from "../i18n";

interface HeaderProps {
  isOnline: boolean;
  onOpenFacilitatorModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isOnline, onOpenFacilitatorModal }) => {
  const { language, setLanguage, t } = useI18n();

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="logo-badge" title="Disha Logo">
          <Compass />
        </div>
        <div className="brand-titles">
          <h1>{t.appName}</h1>
          <p>{t.appTagline}</p>
        </div>
      </div>

      <div className="header-actions">
        {/* Online / Offline Status Badge */}
        <div className={`status-pill ${isOnline ? "online" : "offline"}`} title={isOnline ? "Network Active" : "Local Offline Storage Mode"}>
          <span className="status-dot"></span>
          {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{isOnline ? t.onlineBadge : t.offlineBadge}</span>
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
  );
};
