"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "../page.module.css";
import Icon from "./Icon";
import {
  authApi,
  clearClientAuthState,
  userApi,
  ApiError,
} from "../../lib/api-client";

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

const avatarColors = ["#4f46e5", "#0f766e", "#0284c7", "#b45309", "#be123c", "#7e22ce"];

export default function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(true);
  const [aiRecommendationsEnabled, setAiRecommendationsEnabled] = useState(true);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  //Once the save is successful, the cached "currentUser" is immediately invalidated, which triggers useQuery to automatically re-initiate a network request to obtain the latest modified user information.
  const queryClient = useQueryClient();
  
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: authApi.me,
    enabled: open,
  });

  //If this variable changes, please refresh the page automatically to update the interface to the latest version.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarColor, setAvatarColor] = useState(avatarColors[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  //When the currentUser data is updated, it will automatically "fill" the user information into the form's input boxes.
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setAvatarColor(currentUser.avatarColor ?? avatarColors[0]);
    }
  }, [currentUser]);

  //It performs actions for you after the component has finished rendering and cleans up the process when the component no longer needs those actions.
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
    setDeleteConfirmationText("");
    setDeleteError(null);
  }

  async function handleDeleteAccount() {
    if (deleteConfirmationText !== "DELETE") return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await userApi.deleteAccount();
      clearClientAuthState();
      window.location.assign("/login");
    } catch (caught: unknown) {
      setDeleteError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to delete your account.",
      );
      setIsDeleting(false);
    }
  }

  async function handleSaveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      //The PATCH request is actually sent to the backend server.
      await userApi.updateProfile({
        name,
        ...(currentUser?.provider ? {} : { avatarColor }),
      });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      //Tell the user, "The operation was successful!" Then, change the status back after 2 seconds to restore the interface to its original state.
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (caught: unknown) {
      setSaveError(
        caught instanceof ApiError ? caught.message : "Unable to save changes.",
      );
    } finally {
      setIsSaving(false);
    }
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
                <form onSubmit={handleSaveAccount} className={styles.settingsForm}>
                  <label>
                    Full Name
                    <input
                      type="text"
                      required
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>

                  <label>
                    Email Address
                    <input
                      type="email"
                      readOnly
                      placeholder="Enter email address"
                      value={email}
                    />
                  </label>

                  {!currentUser?.provider && (
                    <fieldset className={styles.settingsAvatarField}>
                      <legend>Avatar profile color</legend>
                      <div>
                        {avatarColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={avatarColor === color ? styles.settingsColorSelected : ""}
                            style={{ backgroundColor: color }}
                            aria-label={`Use ${color} for your profile color`}
                            aria-pressed={avatarColor === color}
                            onClick={() => setAvatarColor(color)}
                          />
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {saveError && (
                    <p className={styles.settingsError}>{saveError}</p>
                  )}

                  <div className={styles.settingsFormActions}>
                    <p>Changes will synchronize across the workspace.</p>
                    <button type="submit" disabled={isSaving}>
                      <Icon name={saveSuccess ? "check" : "save"} size={15} />
                      {isSaving ? "Saving..." : saveSuccess ? "Changes saved" : "Save changes"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {activeTab === "preferences" && (
              <section className={styles.settingsPanel}>
                <h4 className={styles.settingsSectionTitle}>Notification settings</h4>
                {[
                  ["Workspace notification alerts", "Receive high-priority alerts for tasks assigned to you.", notificationsEnabled, setNotificationsEnabled],
                  ["Weekly sprint email digests", "Receive summaries of active sprints and team progress.", emailDigestEnabled, setEmailDigestEnabled],
                  ["AI smart task suggestions", "Allow AI-assisted sprint task breakdown suggestions.", aiRecommendationsEnabled, setAiRecommendationsEnabled],
                ].map(([label, description, enabled, setEnabled]) => (
                  <div className={styles.settingsPreferenceCard} key={label as string}>
                    <span><b>{label as string}</b><small>{description as string}</small></span>
                    <button className={`${styles.settingsToggle} ${enabled ? styles.settingsToggleOn : ""}`} type="button" role="switch" aria-checked={enabled as boolean} aria-label={label as string} onClick={() => (setEnabled as React.Dispatch<React.SetStateAction<boolean>>)(value => !value)}><i /></button>
                  </div>
                ))}
              </section>
            )}

            {activeTab === "support" && (
              <section className={styles.settingsPanel}>
                <div className={styles.settingsSupportSection}>
                  <h4><Icon name="book" size={16} />Help &amp; support documentation</h4>
                  <p>If you need technical assistance or want to report a service issue, our team is here to help.</p>
                  <a className={styles.settingsSupportContact} href="mailto:support@sprintforge.co"><Icon name="mail" size={17} /><span><b>Direct operations email</b><small>support@sprintforge.co</small></span></a>
                </div>
                <div className={styles.settingsSupportSection}>
                  <h4><Icon name="file" size={16} />Terms &amp; policies summary</h4>
                  <div className={styles.settingsPolicyCopy}><b>1. Data storage &amp; privacy</b><p>Workspace records, documents, comments, and chat history are stored securely and are not shared outside your organization.</p><b>2. Collaborative operations</b><p>Workspace owners are responsible for invitations and access. Revoking permissions restricts tenant modifications immediately.</p><b>3. AI context usage</b><p>AI features exclude sensitive credentials from prompt templates and operate only on the context required for the requested task.</p></div>
                </div>
              </section>
            )}

            {activeTab === "danger" && (
              <section className={styles.settingsPanel}>
                <div className={styles.settingsDangerHeading}>
                  <b><Icon name="alert" size={16} />Warning: irreversible action</b>
                  <p>Deleting your account removes your profile, revokes workspace memberships, and signs you out. This cannot be undone.</p>
                </div>
                <button
                  className={styles.deleteAccountButton}
                  type="button"
                  onClick={() => {
                    setDeleteConfirmationText("");
                    setDeleteError(null);
                    setDeleteConfirmationOpen(true);
                  }}
                >
                  <Icon name="trash" size={15} />Delete account permanently
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
              <h3 id="delete-account-title">Confirm account deletion</h3>
              <p>
                To confirm deletion, type <b>DELETE</b> below. Your profile,
                owned workspaces, and all associated data will be permanently removed.
              </p>
              <input value={deleteConfirmationText} onChange={(event) => setDeleteConfirmationText(event.target.value)} placeholder="Type ‘DELETE’ to confirm" />
              {deleteError && <p className={styles.settingsError}>{deleteError}</p>}
              <div><button type="button" disabled={isDeleting} onClick={() => { setDeleteConfirmationOpen(false); setDeleteConfirmationText(""); setDeleteError(null); }}>Cancel</button><button type="button" disabled={deleteConfirmationText !== "DELETE" || isDeleting} onClick={() => void handleDeleteAccount()}>{isDeleting ? "Deleting…" : "I understand, delete my account"}</button></div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
