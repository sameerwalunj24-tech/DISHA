import React, { useState } from "react";
import { X, ShieldCheck, BookOpen, Send } from "lucide-react";
import { useI18n } from "../i18n";

interface FacilitatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FacilitatorModal: React.FC<FacilitatorModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("teacher");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim().length >= 10) {
      setSubmitted(true);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{t.facilitatorModal.title}</h3>
            <p>{t.facilitatorModal.subtitle}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label={t.facilitatorModal.close}>
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ color: "#10b981", marginBottom: 12 }}>
              <ShieldCheck size={48} style={{ margin: "0 auto" }} />
            </div>
            <h4 style={{ color: "#ffffff", fontSize: "1.1rem", marginBottom: 6 }}>
              OTP Sent to +91 {phone}
            </h4>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: 18 }}>
              Facilitator Cohort Dashboard & Module Builder access is active for this session.
            </p>
            <button
              className="submit-btn"
              style={{ width: "100%" }}
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
            >
              {t.facilitatorModal.close}
            </button>
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fac-phone">{t.facilitatorModal.phoneLabel}</label>
              <input
                id="fac-phone"
                type="tel"
                className="form-input"
                placeholder={t.facilitatorModal.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="fac-role">{t.facilitatorModal.roleLabel}</label>
              <select
                id="fac-role"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="teacher">{t.facilitatorModal.roles.teacher}</option>
                <option value="ngo">{t.facilitatorModal.roles.ngo}</option>
                <option value="volunteer">{t.facilitatorModal.roles.volunteer}</option>
              </select>
            </div>

            <button type="submit" className="submit-btn">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Send size={16} />
                {t.facilitatorModal.loginBtn}
              </span>
            </button>

            <div className="modal-note">
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <BookOpen size={18} style={{ color: "#f97316", flexShrink: 0, marginTop: 2 }} />
                <span>{t.facilitatorModal.marketplaceNote}</span>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
