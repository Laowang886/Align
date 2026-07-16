"use client";

import { useEffect, useState } from "react";
import styles from "../page.module.css";
import Icon from "./Icon";

type SettingsTab = "account" | "preferences" | "support" | "danger";

const settingsTabs: {
  id: SettingsTab;
  label: string;
  icon: "user" | "bell" | "book" | "alert";
}[] = [
  { id: "account", label: "Account settings", icon: "user" },
  { id: "preferences", label: "Preferences", icon: "bell" },
  { id: "support", label: "Support & policies", icon: "book" },
  { id: "danger", label: "Danger zone", icon: "alert" },
];

export default function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const title = {
    account: "Personal Information",
    preferences: "User Preferences",
    support: "Help & Support",
    danger: "Danger Zone",
  }[activeTab];

  function selectTab(tab: SettingsTab) {
    setActiveTab(tab);
    setDeleteConfirmationOpen(false);
  }

  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.settingsDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <aside className={styles.settingsSidebar}>
          <div>
            <div className={styles.settingsBrand}>
              <h2 id="settings-title">Settings</h2>
              <p>SprintForge workspace</p>
            </div>

            <nav className={styles.settingsNav} aria-label="Settings sections">
              {settingsTabs.map((tab) => (
                <button
                  className={`${styles.settingsNavItem} ${
                    activeTab === tab.id ? styles.settingsNavItemActive : ""
                  } ${tab.id === "danger" ? styles.settingsDangerNavItem : ""}`}
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                >
                  <Icon name={tab.icon} size={16} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <p className={styles.settingsSidebarNote}>
            Account controls are managed securely from this workspace.
          </p>
        </aside>

        <div className={styles.settingsContent}>
          <header className={styles.settingsContentHeader}>
            <h3>{title}</h3>
            <button type="button" onClick={onClose} aria-label="Close settings">
              ×
            </button>
          </header>

          <div className={styles.settingsContentBody}>
            {activeTab === "account" && (
              <section className={styles.settingsPanel}>
                <div className={styles.settingsPanelHeading}>
                  <b>Personal Information</b>
                  <p>Manage your profile name, email, and avatar.</p>
                </div>
                <div className={styles.settingsInformationCard}>
                  <span>Profile editing will be available when the account API is added.</span>
                  <small>Coming soon</small>
                </div>
              </section>
            )}

            {activeTab === "preferences" && (
              <section className={styles.settingsPanel}>
                <div className={styles.settingsPanelHeading}>
                  <b>Notification Settings</b>
                  <p>Choose how SprintForge communicates workspace activity.</p>
                </div>
                <label className={styles.settingsPreferenceCard}>
                  <span>
                    <b>Workspace notification alerts</b>
                    <small>Receive activity updates from your workspace.</small>
                  </span>
                  <input
                    className={styles.settingsToggle}
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(event) => setNotificationsEnabled(event.target.checked)}
                    aria-label="Enable workspace notifications"
                  />
                </label>
              </section>
            )}

            {activeTab === "support" && (
              <section className={styles.settingsPanel}>
                <div className={styles.settingsPanelHeading}>
                  <b>Support & Policies</b>
                  <p>Find assistance and review workspace policies.</p>
                </div>
                <div className={styles.settingsInformationCard}>
                  <span>Help &amp; Support</span>
                  <small>Coming soon</small>
                </div>
                <div className={styles.settingsInformationCard}>
                  <span>Terms &amp; Policies</span>
                  <small>Coming soon</small>
                </div>
              </section>
            )}

            {activeTab === "danger" && (
              <section className={styles.settingsPanel}>
                <div className={styles.settingsDangerHeading}>
                  <b>Delete Account</b>
                  <p>This removes your personal account and requires a dedicated backend endpoint.</p>
                </div>
                <button
                  className={styles.deleteAccountButton}
                  type="button"
                  onClick={() => setDeleteConfirmationOpen(true)}
                >
                  Delete Account
                </button>
              </section>
            )}
          </div>
        </div>

        {deleteConfirmationOpen && (
          <div className={styles.settingsConfirmOverlay} role="presentation">
            <section
              className={styles.settingsConfirmDialog}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
            >
              <h3 id="delete-account-title">Delete account?</h3>
              <p>
                Account deletion needs a dedicated backend endpoint before it can
                be safely enabled.
              </p>
              <button type="button" onClick={() => setDeleteConfirmationOpen(false)}>
                Close
              </button>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
