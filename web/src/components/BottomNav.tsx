import React from "react";
import { Home, Compass, Route, Award, BookOpen } from "lucide-react";
import { useI18n } from "../i18n";

export type NavScreen = "home" | "discover" | "pathway" | "opportunities" | "marketplace";

interface BottomNavProps {
  activeScreen: NavScreen;
  onSelectScreen: (screen: NavScreen) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, onSelectScreen }) => {
  const { language } = useI18n();

  const navItems = [
    {
      id: "home" as NavScreen,
      icon: Home,
      label: {
        mr: "मुख्य",
        hi: "होम",
        en: "Home"
      }
    },
    {
      id: "discover" as NavScreen,
      icon: Compass,
      label: {
        mr: "शोध",
        hi: "खोज",
        en: "Discover"
      }
    },
    {
      id: "pathway" as NavScreen,
      icon: Route,
      label: {
        mr: "माझा मार्ग",
        hi: "मेरा मार्ग",
        en: "My Path"
      }
    },
    {
      id: "opportunities" as NavScreen,
      icon: Award,
      label: {
        mr: "संधी",
        hi: "अवसर",
        en: "Opportunities"
      }
    },
    {
      id: "marketplace" as NavScreen,
      icon: BookOpen,
      label: {
        mr: "कोर्सेस",
        hi: "कोर्सेज",
        en: "Courses"
      }
    }
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Student Navigation Bar"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: "rgba(10, 14, 23, 0.94)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.5)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 6px)"
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          height: 58
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          const labelText = item.label[language as "mr" | "hi" | "en"] || item.label.mr;

          return (
            <button
              key={item.id}
              onClick={() => onSelectScreen(item.id)}
              aria-label={labelText}
              aria-current={isActive ? "page" : undefined}
              style={{
                background: "transparent",
                border: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                minHeight: 48,
                padding: "4px 0",
                cursor: "pointer",
                color: isActive ? "#f97316" : "#e2e8f0",
                transition: "all 0.18s ease-in-out",
                position: "relative"
              }}
            >
              {/* Active Indicator Top Glow */}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 24,
                    height: 3,
                    borderRadius: 9999,
                    background: "linear-gradient(90deg, #f97316, #fb923c)",
                    boxShadow: "0 0 10px #f97316"
                  }}
                />
              )}

              <div
                style={{
                  transform: isActive ? "translateY(-1px) scale(1.08)" : "none",
                  transition: "transform 0.18s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Icon size={21} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: isActive ? 800 : 600,
                  marginTop: 3,
                  letterSpacing: "-0.2px",
                  lineHeight: 1
                }}
              >
                {labelText}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
