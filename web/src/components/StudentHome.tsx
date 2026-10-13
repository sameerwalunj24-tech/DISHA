import React, { useState } from "react";
import { Compass, Route, Award, Mic, MicOff, ChevronRight, Volume2, Sparkles } from "lucide-react";
import { useI18n } from "../i18n";
import { voiceService } from "../services/voice";

interface StudentHomeProps {
  onSelectTile: (tileKey: "discover" | "pathway" | "opportunities") => void;
}

export const StudentHome: React.FC<StudentHomeProps> = ({ onSelectTile }) => {
  const { language, t } = useI18n();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [partialTranscript, setPartialTranscript] = useState<string>("");

  const handleToggleVoice = async () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      setPartialTranscript("");
      return;
    }

    setIsListening(true);
    setPartialTranscript("");
    setTranscript("");

    const langCode = language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";

    await voiceService.startListening({
      language: langCode,
      onPartial: (partial) => {
        setPartialTranscript(partial);
      },
      onFinal: (finalText) => {
        setIsListening(false);
        setPartialTranscript("");
        setTranscript(finalText);
        // Automatically speak back audio confirmation
        voiceService.speak(finalText, langCode);
      },
      onError: (err) => {
        console.error("Voice error:", err);
        setIsListening(false);
        setPartialTranscript("");
      }
    });
  };

  const handleSpeakTile = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    const langCode = language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";
    voiceService.speak(text, langCode);
  };

  return (
    <div className="main-container">
      {/* Greeting Card */}
      <section className="greeting-card" aria-label="Welcome Card">
        <h2>{t.greeting}</h2>
        <p>{t.subGreeting}</p>
      </section>

      {/* 3 Core Big Tiles */}
      <section className="tiles-grid" aria-label="Main Navigation Tiles">
        {/* Tile 1: Discover */}
        <button
          className="action-tile tile-discover"
          onClick={() => onSelectTile("discover")}
          aria-label={t.tiles.discover.title}
        >
          <div className="tile-icon-box">
            <Compass />
          </div>
          <div className="tile-content">
            <div className="tile-header-row">
              <span className="tile-title">{t.tiles.discover.title}</span>
              <span className="tile-tag">{t.tiles.discover.tag}</span>
            </div>
            <p className="tile-subtitle">{t.tiles.discover.subtitle}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              role="button"
              tabIndex={0}
              className="voice-preview-btn"
              onClick={(e) => handleSpeakTile(e, `${t.tiles.discover.title}. ${t.tiles.discover.subtitle}`)}
              title="Listen in your language"
              style={{ color: "#fdba74", padding: 6 }}
            >
              <Volume2 size={20} />
            </span>
            <ChevronRight className="tile-arrow" size={24} />
          </div>
        </button>

        {/* Tile 2: My Path */}
        <button
          className="action-tile tile-pathway"
          onClick={() => onSelectTile("pathway")}
          aria-label={t.tiles.pathway.title}
        >
          <div className="tile-icon-box">
            <Route />
          </div>
          <div className="tile-content">
            <div className="tile-header-row">
              <span className="tile-title">{t.tiles.pathway.title}</span>
              <span className="tile-tag">{t.tiles.pathway.tag}</span>
            </div>
            <p className="tile-subtitle">{t.tiles.pathway.subtitle}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              role="button"
              tabIndex={0}
              className="voice-preview-btn"
              onClick={(e) => handleSpeakTile(e, `${t.tiles.pathway.title}. ${t.tiles.pathway.subtitle}`)}
              title="Listen in your language"
              style={{ color: "#7dd3fc", padding: 6 }}
            >
              <Volume2 size={20} />
            </span>
            <ChevronRight className="tile-arrow" size={24} />
          </div>
        </button>

        {/* Tile 3: Opportunities */}
        <button
          className="action-tile tile-opportunities"
          onClick={() => onSelectTile("opportunities")}
          aria-label={t.tiles.opportunities.title}
        >
          <div className="tile-icon-box">
            <Award />
          </div>
          <div className="tile-content">
            <div className="tile-header-row">
              <span className="tile-title">{t.tiles.opportunities.title}</span>
              <span className="tile-tag">{t.tiles.opportunities.tag}</span>
            </div>
            <p className="tile-subtitle">{t.tiles.opportunities.subtitle}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              role="button"
              tabIndex={0}
              className="voice-preview-btn"
              onClick={(e) => handleSpeakTile(e, `${t.tiles.opportunities.title}. ${t.tiles.opportunities.subtitle}`)}
              title="Listen in your language"
              style={{ color: "#6ee7b7", padding: 6 }}
            >
              <Volume2 size={20} />
            </span>
            <ChevronRight className="tile-arrow" size={24} />
          </div>
        </button>
      </section>

      {/* Voice Assistant Floating Action Card */}
      <section className={`voice-bar ${isListening ? "listening" : ""}`} aria-label="Voice Interaction Bar">
        <div className="voice-btn-container">
          <button
            className={`mic-button ${isListening ? "active" : ""}`}
            onClick={handleToggleVoice}
            aria-label={isListening ? "Stop listening" : t.tapToSpeak}
            title={t.tapToSpeak}
          >
            {isListening ? <MicOff /> : <Mic />}
          </button>
        </div>

        <p className="voice-status-text">
          {isListening ? t.listening : t.tapToSpeak}
        </p>

        {/* Live Partial or Final Transcript Feedback */}
        {(partialTranscript || transcript) && (
          <div className="voice-feedback-box" role="status" aria-live="polite">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Sparkles size={16} style={{ color: "#f97316" }} />
              <strong style={{ fontSize: "0.85rem", color: "#f8fafc" }}>
                {partialTranscript ? "ऐकत आहे..." : t.mockSpokenPrefix}
              </strong>
            </div>
            <p>"{partialTranscript || transcript}"</p>
          </div>
        )}
      </section>
    </div>
  );
};
