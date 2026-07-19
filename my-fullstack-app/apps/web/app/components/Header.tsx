//Home page header
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authApi,
  clearClientAuthState,
  type CurrentUser,
} from "../../lib/api-client";
import styles from "../page.module.css";
import Icon from "./Icon";
import SettingsDialog from "./SettingsDialog";
import NotificationBell from "./notifications/NotificationBell";

export default function Header({
  onToggleSidebar,
  workspaceName = "FormatWeaver HQ",
  projectName,
  userName = "User",
  userAvatarUrl,
}: {
  onToggleSidebar: () => void;
  workspaceName?: string;
  projectName?: string;
  userName?: string;
  userAvatarUrl?: string | null;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(userAvatarUrl);

  useEffect(() => {
    setAvatarUrl(userAvatarUrl);
  }, [userAvatarUrl]);

  useEffect(() => {
    function updateProfile(event: Event) {
      setAvatarUrl((event as CustomEvent<CurrentUser>).detail.avatarUrl);
    }

    window.addEventListener("align:profile-updated", updateProfile);
    return () => window.removeEventListener("align:profile-updated", updateProfile);
  }, []);

  useEffect(() => {
    //Click anywhere outside the menu area to automatically close the drop-down menu.
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    //When the user presses the "Esc" key on the keyboard, the drop-down menu immediately closes.
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    //Global listener: It attaches these two functions (closeOnOutsideClick and closeOnEscape) to the entire document (i.e. the entire webpage).
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    //This is the cleanup function of `useEffect`. It's key to React's handling of side effects: When is it triggered? This function executes automatically when the component is removed from the DOM (e.g., when the user navigates to another page, or the header is no longer rendered).
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      clearClientAuthState();
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button
          className={styles.iconButton}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Icon name="menu" />
        </button>
        <span className={styles.headerBreadcrumb}>
          <span>{workspaceName}</span>
          {projectName && (
            <>
              <i>/</i>
              <b>{projectName}</b>
            </>
          )}
        </span>
      </div>

      <div className={styles.headerRight}>
        <NotificationBell />

        <div className={styles.accountMenuWrap} ref={menuRef}>
          <button
            className={styles.profileAvatarButton}
            type="button"
            aria-label="Open account menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </button>

          {menuOpen && (
            <div className={styles.accountMenu} role="menu">
              {/* <div className={styles.accountMenuIdentity}>
                <p>Logged in as</p>
                <b>{userName}</b>
                {userEmail && <span>{userEmail}</span>}
              </div> */}
              <button
                className={styles.accountMenuItem}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setSettingsOpen(true);
                }}
              >
                <Icon name="settings" size={16} />
                <span>Settings</span>
              </button>
              <button
                className={`${styles.accountMenuItem} ${styles.signOutMenuItem}`}
                type="button"
                role="menuitem"
                disabled={signingOut}
                onClick={() => void signOut()}
              >
                <Icon name="logOut" size={16} />
                <span>{signingOut ? "Signing out..." : "Sign out"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </header>
  );
}
