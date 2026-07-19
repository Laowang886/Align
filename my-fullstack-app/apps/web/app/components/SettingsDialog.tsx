"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FeedbackType, SafetyCategory } from "@repo/shared";
import styles from "../page.module.css";
import Icon from "./Icon";
import {
  authApi,
  clearClientAuthState,
  userApi,
  supportApi,
  ApiError,
  type CurrentUser,
} from "../../lib/api-client";
import { useNotificationPreferences } from "./notifications/useNotificationPreferences";

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

const avatarColors = [
  "#4f46e5",
  "#0f766e",
  "#0284c7",
  "#b45309",
  "#be123c",
  "#7e22ce",
];

export default function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const notificationPreferences = useNotificationPreferences(open);
  const notificationsEnabled =
    notificationPreferences.preferences?.notificationsEnabled ?? true;
  const kanbanNotificationsEnabled =
    notificationPreferences.preferences?.kanbanNotificationsEnabled ?? true;
  const chatNotificationsEnabled =
    notificationPreferences.preferences?.chatNotificationsEnabled ?? true;
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
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [safetyCategory, setSafetyCategory] =
    useState<SafetyCategory>("harassment");
  const [safetyText, setSafetyText] = useState("");
  const [isSubmittingSafety, setIsSubmittingSafety] = useState(false);
  const [safetySuccessId, setSafetySuccessId] = useState<string | null>(null);
  const [safetyError, setSafetyError] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("general");
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

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

  useEffect(() => {
    if (open) return;
    setCopiedEmail(false);
    setSafetyText("");
    setSafetySuccessId(null);
    setSafetyError(null);
    setFeedbackText("");
    setFeedbackSuccess(false);
    setFeedbackError(null);
  }, [open]);

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

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText("support@sprintforge.co");
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 1800);
    } catch {
      setCopiedEmail(false);
    }
  }

  async function handleSubmitSafetyReport(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!safetyText.trim()) return;
    setIsSubmittingSafety(true);
    setSafetyError(null);
    try {
      const report = await supportApi.submitSafetyReport({
        category: safetyCategory,
        description: safetyText.trim(),
      });
      setSafetySuccessId(report.id);
      setSafetyText("");
    } catch (caught: unknown) {
      setSafetyError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to submit the report.",
      );
    } finally {
      setIsSubmittingSafety(false);
    }
  }

  async function handleSubmitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!feedbackText.trim()) return;
    setIsSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      await supportApi.submitFeedback({
        type: feedbackType,
        content: feedbackText.trim(),
      });
      setFeedbackSuccess(true);
      setFeedbackText("");
    } catch (caught: unknown) {
      setFeedbackError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to submit feedback.",
      );
    } finally {
      setIsSubmittingFeedback(false);
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

  async function handleAvatarSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveError("Choose an image file in JPEG, PNG, WEBP, or GIF format.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSaveError("Choose an image smaller than 2 MB.");
      return;
    }

    setIsUploadingAvatar(true);
    setSaveError(null);
    try {
      const updatedUser = await userApi.uploadAvatar(file);
      queryClient.setQueryData(["currentUser"], updatedUser);
      window.dispatchEvent(
        new CustomEvent<CurrentUser>("align:profile-updated", {
          detail: updatedUser,
        }),
      );
    } catch (caught: unknown) {
      setSaveError(
        caught instanceof ApiError ? caught.message : "Unable to upload photo.",
      );
    } finally {
      setIsUploadingAvatar(false);
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
                <form
                  onSubmit={handleSaveAccount}
                  className={styles.settingsForm}
                >
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

                  {currentUser && !currentUser.provider && (
                    <>
                      <fieldset className={styles.settingsAvatarUploadField}>
                        <legend>Profile photo</legend>
                        <div className={styles.settingsAvatarUploadRow}>
                          <button
                            type="button"
                            className={styles.settingsAvatarUploadButton}
                            onClick={() => avatarFileInputRef.current?.click()}
                            disabled={isUploadingAvatar}
                            aria-label="Upload a profile photo"
                          >
                            {currentUser.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={currentUser.avatarUrl} alt="" />
                            ) : (
                              name.charAt(0).toUpperCase()
                            )}
                            <span>{isUploadingAvatar ? "…" : "Change"}</span>
                          </button>
                          <p>Upload an image</p>
                          <input
                            ref={avatarFileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            //this is we use to handle the file selection event, and we use void to ignore the returned promise since we don't need to await it here.
                            //The browser automatically generates an object the moment the user completes the "select file" action; the browser then passes this object as a parameter to the function you wrote.
                            onChange={(event) => void handleAvatarSelected(event)}
                            tabIndex={-1}
                          />
                        </div>
                      </fieldset>

                      <fieldset className={styles.settingsAvatarField}>
                        <legend>Avatar profile color</legend>
                        <div>
                          {avatarColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={
                                avatarColor === color
                                  ? styles.settingsColorSelected
                                  : ""
                              }
                              style={{ backgroundColor: color }}
                              aria-label={`Use ${color} for your profile color`}
                              aria-pressed={avatarColor === color}
                              onClick={() => setAvatarColor(color)}
                            />
                          ))}
                        </div>
                      </fieldset>
                    </>
                  )}

                  {saveError && (
                    <p className={styles.settingsError}>{saveError}</p>
                  )}

                  <div className={styles.settingsFormActions}>
                    <p>Changes will synchronize across the workspace.</p>
                    <button type="submit" disabled={isSaving}>
                      <Icon name={saveSuccess ? "check" : "save"} size={15} />
                      {isSaving
                        ? "Saving..."
                        : saveSuccess
                          ? "Changes saved"
                          : "Save changes"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {activeTab === "preferences" && (
              <section className={styles.settingsPreferences}>
                <div className={styles.settingsPreferenceIntro}>
                  <h4>Workspace preferences</h4>
                  <p>
                    Manage how you receive alerts and update events across your
                    collaborative workspace boards.
                  </p>
                </div>

                {notificationPreferences.loadError && (
                  <div className={styles.settingsError}>
                    <span>Unable to load notification preferences.</span>
                    <button
                      type="button"
                      onClick={() => void notificationPreferences.retry()}
                    >
                      Retry
                    </button>
                  </div>
                )}
                {notificationPreferences.actionError && (
                  <p className={styles.settingsError}>
                    {notificationPreferences.actionError}
                  </p>
                )}

                <article className={styles.settingsPreferenceMaster}>
                  <div className={styles.settingsPreferenceCopy}>
                    <span className={styles.settingsPreferenceIcon}>
                      <Icon name="bell" size={17} />
                    </span>
                    <div>
                      <p>
                        <b>Main notification alerts</b>
                        <em
                          className={
                            notificationsEnabled
                              ? styles.settingsStatusActive
                              : styles.settingsStatusMuted
                          }
                        >
                          {notificationsEnabled ? "Active" : "Muted"}
                        </em>
                      </p>
                      <small>
                        Master switch for all workspace notifications. Turning
                        it off disables every channel below.
                      </small>
                    </div>
                  </div>
                  <button
                    className={`${styles.settingsToggle} ${notificationsEnabled ? styles.settingsToggleOn : ""}`}
                    type="button"
                    role="switch"
                    aria-checked={notificationsEnabled}
                    aria-label="Enable main notification alerts"
                    disabled={
                      notificationPreferences.loading ||
                      notificationPreferences.loadError ||
                      notificationPreferences.saving
                    }
                    onClick={() =>
                      void notificationPreferences
                        .update({
                          notificationsEnabled: !notificationsEnabled,
                        })
                        .catch(() => undefined)
                    }
                  >
                    <i />
                  </button>
                </article>

                <div className={styles.settingsPreferenceChannels}>
                  {[
                    [
                      "board",
                      "Kanban board notifications",
                      "Receive notifications when tasks are assigned to you.",
                      kanbanNotificationsEnabled,
                      "kanbanNotificationsEnabled",
                    ],
                    [
                      "chat",
                      "Workspace chat notifications",
                      "Get notified when teammates post in workspace channels or send you a direct message.",
                      chatNotificationsEnabled,
                      "chatNotificationsEnabled",
                    ],
                  ].map(
                    ([icon, label, description, enabled, preferenceKey]) => (
                      <article
                        className={`${styles.settingsPreferenceChannel} ${!notificationsEnabled ? styles.settingsPreferenceDisabled : ""}`}
                        key={label as string}
                      >
                        <div className={styles.settingsPreferenceCopy}>
                          <span className={styles.settingsPreferenceIcon}>
                            <Icon name={icon as "board" | "chat"} size={16} />
                          </span>
                          <div>
                            <p>
                              <b>{label as string}</b>
                            </p>
                            <small>{description as string}</small>
                          </div>
                        </div>
                        <div className={styles.settingsPreferenceControl}>
                          {!notificationsEnabled && <em>Muted</em>}
                          <button
                            className={`${styles.settingsToggle} ${enabled ? styles.settingsToggleOn : ""}`}
                            type="button"
                            disabled={
                              !notificationsEnabled ||
                              notificationPreferences.loading ||
                              notificationPreferences.loadError ||
                              notificationPreferences.saving
                            }
                            role="switch"
                            aria-checked={
                              notificationsEnabled && (enabled as boolean)
                            }
                            aria-label={`Enable ${label as string}`}
                            onClick={() =>
                              void notificationPreferences
                                .update({
                                  [preferenceKey as
                                    | "kanbanNotificationsEnabled"
                                    | "chatNotificationsEnabled"]:
                                    !(enabled as boolean),
                                })
                                .catch(() => undefined)
                            }
                          >
                            <i />
                          </button>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </section>
            )}

            {activeTab === "support" && (
              <section className={styles.settingsSupport}>
                <div className={styles.settingsSupportHeading}>
                  <Icon name="book" size={17} />
                  <h4>Help &amp; support</h4>
                </div>

                <article className={styles.settingsSupportCard}>
                  <span className={styles.settingsSupportIcon}>
                    <Icon name="mail" size={16} />
                  </span>
                  <div className={styles.settingsSupportCardContent}>
                    <b>Email support</b>
                    <p>
                      Get help with account configuration, integrations, and
                      billing questions.
                    </p>
                    <div className={styles.settingsSupportEmail}>
                      <code>support@sprintforge.co</code>
                      <button
                        type="button"
                        onClick={() => void handleCopyEmail()}
                        aria-label="Copy support email"
                      >
                        <Icon
                          name={copiedEmail ? "check" : "clipboard"}
                          size={14}
                        />
                      </button>
                      <a
                        href="mailto:support@sprintforge.co"
                        aria-label="Email support"
                      >
                        <Icon name="external" size={14} />
                      </a>
                    </div>
                    {copiedEmail && (
                      <small className={styles.settingsSupportSuccess}>
                        Copied to clipboard.
                      </small>
                    )}
                  </div>
                </article>

                <article className={styles.settingsSupportCard}>
                  <span
                    className={`${styles.settingsSupportIcon} ${styles.settingsSafetyIcon}`}
                  >
                    <Icon name="alert" size={16} />
                  </span>
                  <div className={styles.settingsSupportCardContent}>
                    <b>Safety center</b>
                    <p>
                      Report harassment, security exploits, privacy violations,
                      or other urgent concerns.
                    </p>
                    <div className={styles.settingsSupportFormShell}>
                      <strong>
                        <Icon name="alert" size={13} />
                        File an incident report
                      </strong>
                      {safetySuccessId ? (
                        <div className={styles.settingsSubmissionSuccess}>
                          <Icon name="check" size={17} />
                          <b>Report transmitted safely</b>
                          <small>
                            Reference: #{safetySuccessId.slice(0, 8)}
                          </small>
                        </div>
                      ) : (
                        <form
                          onSubmit={handleSubmitSafetyReport}
                          className={styles.settingsSupportForm}
                        >
                          <label>
                            Incident category
                            <select
                              value={safetyCategory}
                              onChange={(event) =>
                                setSafetyCategory(
                                  event.target.value as SafetyCategory,
                                )
                              }
                            >
                              <option value="harassment">
                                Harassment / code of conduct
                              </option>
                              <option value="exploit">
                                Security vulnerability / exploit
                              </option>
                              <option value="privacy">
                                Privacy / data leakage
                              </option>
                              <option value="other">
                                Other emergency concern
                              </option>
                            </select>
                          </label>
                          <label>
                            Incident description
                            <textarea
                              required
                              rows={3}
                              value={safetyText}
                              onChange={(event) =>
                                setSafetyText(event.target.value)
                              }
                              placeholder="Provide relevant details, usernames, or vulnerability vectors..."
                            />
                          </label>
                          {safetyError && (
                            <p className={styles.settingsError}>
                              {safetyError}
                            </p>
                          )}
                          <button
                            type="submit"
                            disabled={isSubmittingSafety || !safetyText.trim()}
                          >
                            <Icon name="alert" size={13} />
                            {isSubmittingSafety
                              ? "Transmitting..."
                              : "Submit incident report"}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </article>

                <article className={styles.settingsSupportCard}>
                  <span
                    className={`${styles.settingsSupportIcon} ${styles.settingsFeedbackIcon}`}
                  >
                    <Icon name="chat" size={16} />
                  </span>
                  <div className={styles.settingsSupportCardContent}>
                    <b>Submit feedback</b>
                    <p>
                      Share bug reports, suggestions, or design feedback with
                      the SprintForge team.
                    </p>
                    <div className={styles.settingsSupportFormShell}>
                      {feedbackSuccess ? (
                        <div className={styles.settingsSubmissionSuccess}>
                          <Icon name="check" size={17} />
                          <b>Feedback submitted successfully</b>
                          <small>
                            Thank you for helping us improve SprintForge.
                          </small>
                        </div>
                      ) : (
                        <form
                          onSubmit={handleSubmitFeedback}
                          className={styles.settingsSupportForm}
                        >
                          <label>
                            Feedback category
                            <select
                              value={feedbackType}
                              onChange={(event) =>
                                setFeedbackType(
                                  event.target.value as FeedbackType,
                                )
                              }
                            >
                              <option value="general">
                                General suggestion
                              </option>
                              <option value="bug">Bug report / defect</option>
                              <option value="feature">New feature idea</option>
                              <option value="usability">
                                Usability / design critique
                              </option>
                            </select>
                          </label>
                          <label>
                            Your feedback
                            <textarea
                              required
                              rows={3}
                              value={feedbackText}
                              onChange={(event) =>
                                setFeedbackText(event.target.value)
                              }
                              placeholder="Describe the issue, idea, or review..."
                            />
                          </label>
                          {feedbackError && (
                            <p className={styles.settingsError}>
                              {feedbackError}
                            </p>
                          )}
                          <button
                            type="submit"
                            disabled={
                              isSubmittingFeedback || !feedbackText.trim()
                            }
                          >
                            <Icon name="external" size={13} />
                            {isSubmittingFeedback
                              ? "Submitting..."
                              : "Submit feedback"}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </article>

                <div className={styles.settingsPolicies}>
                  <div className={styles.settingsSupportHeading}>
                    <Icon name="file" size={17} />
                    <h4>Terms &amp; policies summary</h4>
                  </div>
                  <div className={styles.settingsPolicyCopy}>
                    <section>
                      <b>1. Data storage &amp; privacy shield</b>
                      <p>
                        Workspace records, wiki documents, and conversations are
                        securely stored and isolated by workspace tenant.
                      </p>
                    </section>
                    <section>
                      <b>2. Collaborative workspace authority</b>
                      <p>
                        Workspace administrators manage membership, permissions,
                        and board deletion. Revoked members lose access
                        immediately.
                      </p>
                    </section>
                    <section>
                      <b>3. Respectful workspace environments</b>
                      <p>
                        Harassment, intentional denial of service, and data
                        tampering are prohibited and may result in permanent
                        suspension.
                      </p>
                    </section>
                  </div>
                </div>
              </section>
            )}

            {activeTab === "danger" && (
              <section className={styles.settingsPanel}>
                <div className={styles.settingsDangerHeading}>
                  <b>
                    <Icon name="alert" size={16} />
                    Warning: irreversible action
                  </b>
                  <p>
                    Deleting your account removes your profile, revokes
                    workspace memberships, and signs you out. This cannot be
                    undone.
                  </p>
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
                  <Icon name="trash" size={15} />
                  Delete account permanently
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
                owned workspaces, and all associated data will be permanently
                removed.
              </p>
              <input
                value={deleteConfirmationText}
                onChange={(event) =>
                  setDeleteConfirmationText(event.target.value)
                }
                placeholder="Type ‘DELETE’ to confirm"
              />
              {deleteError && (
                <p className={styles.settingsError}>{deleteError}</p>
              )}
              <div>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setDeleteConfirmationOpen(false);
                    setDeleteConfirmationText("");
                    setDeleteError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmationText !== "DELETE" || isDeleting}
                  onClick={() => void handleDeleteAccount()}
                >
                  {isDeleting ? "Deleting…" : "I understand, delete my account"}
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
