import React, { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle2,
  ListTodo,
  FileText,
  Mic,
  TrendingUp,
  Sparkles,
  Award
} from "lucide-react";
import { useI18n } from "../i18n";
import { getPendingSyncItems, type SyncQueueItem } from "../services/db/offlineStorage";
import { syncService } from "../services/sync/syncService";

interface OutboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  onTriggerSync: () => Promise<void>;
}

export const OutboxDrawer: React.FC<OutboxDrawerProps> = ({
  isOpen,
  onClose,
  isOnline,
  isSyncing,
  pendingCount,
  onTriggerSync
}) => {
  const { language } = useI18n();
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [lastSyncStr, setLastSyncStr] = useState<string | null>(null);

  const loadItems = async () => {
    try {
      const pending = await getPendingSyncItems();
      setItems(pending);
    } catch {
      setItems([]);
    }
  };

  const loadLastSync = () => {
    try {
      const raw = localStorage.getItem("disha_last_synced_at");
      if (raw) {
        const d = new Date(raw);
        setLastSyncStr(
          d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
          " (" + d.toLocaleDateString([], { month: "short", day: "numeric" }) + ")"
        );
      } else {
        setLastSyncStr(null);
      }
    } catch {
      setLastSyncStr(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadItems();
      loadLastSync();
    }
  }, [isOpen, pendingCount, isSyncing]);

  // Listen to outbox changes while open
  useEffect(() => {
    if (!isOpen) return;
    const handleChanged = () => {
      loadItems();
      loadLastSync();
    };
    window.addEventListener("disha_sync_outbox_changed", handleChanged);
    window.addEventListener("disha_sync_completed", handleChanged);
    return () => {
      window.removeEventListener("disha_sync_outbox_changed", handleChanged);
      window.removeEventListener("disha_sync_completed", handleChanged);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getItemTypeDetails = (type: SyncQueueItem["type"]) => {
    switch (type) {
      case "offline_quiz_result":
        return {
          icon: <Sparkles size={16} color="#f97316" />,
          title: language === "mr" ? "शोध प्रोफाईल" : language === "hi" ? "खोज प्रोफ़ाइल" : "Discovery Profile",
          color: "#ea580c"
        };
      case "pathway_progress":
        return {
          icon: <TrendingUp size={16} color="#38bdf8" />,
          title: language === "mr" ? "टप्पा प्रगती" : language === "hi" ? "मील का पत्थर" : "Milestone Progress",
          color: "#0284c7"
        };
      case "voice_note":
        return {
          icon: <Mic size={16} color="#a855f7" />,
          title: language === "mr" ? "व्हॉइस टीप" : language === "hi" ? "ध्वनि संदेश" : "Voice Note",
          color: "#9333ea"
        };
      case "recommendation":
        return {
          icon: <Award size={16} color="#10b981" />,
          title: language === "mr" ? "सल्ला / शिफारस" : language === "hi" ? "सिफ़ारिश" : "Recommendation",
          color: "#059669"
        };
      default:
        return {
          icon: <FileText size={16} color="#e2e8f0" />,
          title: language === "mr" ? "अपडेट क्रिया" : language === "hi" ? "अपडेट क्रिया" : "Sync Action",
          color: "#64748b"
        };
    }
  };

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    if (onTriggerSync) {
      await onTriggerSync();
    } else {
      await syncService.flushOutbox();
    }
    await loadItems();
    loadLastSync();
  };

  return (
    <div
      className="outbox-drawer-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Offline Sync Outbox Drawer"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        animation: "fade-in 0.2s ease"
      }}
    >
      <div
        className="outbox-drawer-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 580,
          maxHeight: "85vh",
          backgroundColor: "var(--bg-card)",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          border: "1.5px solid var(--border-subtle)",
          borderBottom: "none",
          boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        {/* Drawer Pull Handle */}
        <div style={{ width: "100%", display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
          <div style={{ width: 44, height: 4, borderRadius: 9999, backgroundColor: "var(--border-subtle)" }} />
        </div>

        {/* Header */}
        <div
          style={{
            padding: "12px 20px 16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: isOnline ? "rgba(16, 185, 129, 0.15)" : "rgba(249, 115, 22, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isOnline ? "#10b981" : "#f97316"
              }}
            >
              <ListTodo size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                {language === "mr" ? "सिंक स्थिती (Sync Status)" : language === "hi" ? "सिंक स्थिति (Sync Status)" : "Sync Outbox Status"}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    color: isOnline ? "#34d399" : "#fb923c"
                  }}
                >
                  {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {isOnline
                    ? (language === "mr" ? "इंटरनेट कनेक्टेड" : language === "hi" ? "इंटरनेट कनेक्टेड" : "Online")
                    : (language === "mr" ? "ऑफलाइन मोड" : language === "hi" ? "ऑफ़लाइन मोड" : "Offline Mode")}
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>•</span>
                <span style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                  {items.length} {language === "mr" ? "प्रलंबित क्रिया" : language === "hi" ? "लंबित क्रियाएं" : "queued actions"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Outbox Drawer"
            style={{
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {/* Last sync info banner */}
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.78rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
              <Clock size={14} />
              <span>{language === "mr" ? "शेवटचे यशस्वी सिंक:" : language === "hi" ? "पिछला सफल सिंक:" : "Last Successful Sync:"}</span>
            </div>
            <strong style={{ color: "var(--text-main)" }}>
              {lastSyncStr || (language === "mr" ? "अद्याप नाही (Never)" : language === "hi" ? "अभी तक नहीं" : "Not yet synced")}
            </strong>
          </div>

          {/* Itemized List */}
          {items.length === 0 ? (
            <div
              style={{
                padding: "36px 16px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 9999,
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#10b981"
                }}
              >
                <CheckCircle2 size={28} />
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
                {language === "mr" ? "सर्व क्रिया सिंक झालेल्या आहेत!" : language === "hi" ? "सभी क्रियाएं सिंक हैं!" : "Outbox is completely synced!"}
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", maxWidth: 320, margin: 0 }}>
                {language === "mr"
                  ? "डिव्हाइसवर कोणतीही प्रलंबित क्रिया शिल्लक नाही. सर्व प्रगती सुरक्षित आहे."
                  : language === "hi"
                  ? "डिवाइस पर कोई लंबित क्रिया शेष नहीं है।"
                  : "No pending outbox records queued on this device."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {language === "mr" ? "प्रलंबित क्रिया सूची (Pending Items)" : language === "hi" ? "लंबित सूची" : "Queued Items Queue"}
              </div>

              {items.map((item, idx) => {
                const details = getItemTypeDetails(item.type);
                const seq = item.client_seq || item.payload?.client_seq || (idx + 1);
                const dateStr = item.updated_at
                  ? new Date(item.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                  : "";

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          backgroundColor: `${details.color}20`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        {details.icon}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-main)" }}>
                            {details.title}
                          </span>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              backgroundColor: "rgba(255, 255, 255, 0.1)",
                              padding: "1px 6px",
                              borderRadius: 4,
                              color: "var(--text-muted)"
                            }}
                          >
                            Seq #{seq}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginTop: 2 }}>
                          {item.payload?.student_name ? `विद्यार्थी: ${item.payload.student_name} • ` : ""}
                          {item.payload?.step_id ? `Step: ${item.payload.step_id} • ` : ""}
                          ID: {item.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#fb923c",
                          backgroundColor: "rgba(249, 115, 22, 0.12)",
                          padding: "3px 8px",
                          borderRadius: 9999,
                          display: "inline-block"
                        }}
                      >
                        {language === "mr" ? "प्रलंबित" : language === "hi" ? "लंबित" : "Pending"}
                      </span>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 4 }}>
                        {dateStr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 20px 24px 20px",
            borderTop: "1px solid var(--border-subtle)",
            backgroundColor: "rgba(0, 0, 0, 0.15)",
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}
        >
          <button
            onClick={handleManualSync}
            disabled={!isOnline || isSyncing || items.length === 0}
            style={{
              width: "100%",
              minHeight: 48,
              padding: "12px 18px",
              borderRadius: 14,
              backgroundColor: isOnline && items.length > 0 ? "var(--primary-saffron)" : "rgba(255, 255, 255, 0.08)",
              color: isOnline && items.length > 0 ? "#ffffff" : "var(--text-dim)",
              border: "none",
              fontSize: "0.95rem",
              fontWeight: 800,
              cursor: isOnline && items.length > 0 ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: isOnline && items.length > 0 ? "0 4px 14px rgba(249, 115, 22, 0.35)" : "none",
              transition: "all 0.2s ease",
              opacity: isOnline && items.length > 0 ? 1 : 0.65
            }}
          >
            <RefreshCw size={17} className={isSyncing ? "spin" : ""} />
            <span>
              {isSyncing
                ? (language === "mr" ? "सिंक होत आहे..." : language === "hi" ? "सिंक हो रहा है..." : "Syncing Outbox...")
                : (language === "mr" ? "आता सिंक करा (Sync Now)" : language === "hi" ? "अभी सिंक करें" : "Sync Now")}
            </span>
          </button>

          {!isOnline && items.length > 0 && (
            <p
              style={{
                fontSize: "0.74rem",
                color: "#fb923c",
                textAlign: "center",
                margin: 0,
                fontWeight: 600
              }}
            >
              ⚠️ {language === "mr"
                ? "इंटरनेट कनेक्ट झाल्यावर आपोआप सिंक होईल (Will sync when internet reconnects)"
                : language === "hi"
                ? "इंटरनेट कनेक्ट होने पर अपने आप सिंक होगा"
                : "Will automatically sync when internet reconnects"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
