"use client";

import { useState, useEffect } from "react";
import { getOAuthUrl, type OAuthProvider } from "../../lib/api-client";
import styles from "../page.module.css";

type OAuthButtonsProps = {
  mode: "sign in" | "sign up";
};

export default function OAuthButtons({ mode }: OAuthButtonsProps) {
  const [redirectingTo, setRedirectingTo] = useState<OAuthProvider | null>(
    null,
  );

  //fix the page from bfcache, reset redirectingTo state when the page is restored from bfcache
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      //event.persisted === true → This time the page display is restored from bfcache, not reloaded.
      if (event.persisted) { 
        //Manual intervention to reset the state is only required when recovering from bfcache.
        setRedirectingTo(null);
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  function continueWith(provider: OAuthProvider) {
    setRedirectingTo(provider);
    window.location.assign(getOAuthUrl(provider));
  }

  const isRedirecting = redirectingTo !== null;

  return (
    <section className={styles.oauthSection} aria-label="Social sign in">
      <div className={styles.oauthDivider} aria-hidden="true">
        <span />
        <b>or continue with</b>
        <span />
      </div>

      <div className={styles.oauthButtons}>
        <button
          className={styles.oauthButton}
          type="button"
          disabled={isRedirecting}
          onClick={() => continueWith("google")}
        >
          <GoogleMark />
          {redirectingTo === "google" ? "Opening Google..." : `Google ${mode}`}
        </button>
        <button
          className={styles.oauthButton}
          type="button"
          disabled={isRedirecting}
          onClick={() => continueWith("github")}
        >
          <GitHubMark />
          {redirectingTo === "github" ? "Opening GitHub..." : `GitHub ${mode}`}
        </button>
      </div>
    </section>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.8 12.23c0-.71-.06-1.39-.19-2.05H12v3.87h5.49a4.69 4.69 0 0 1-2.04 3.08v2.51h3.31c1.94-1.79 3.04-4.42 3.04-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.75 0 5.05-.91 6.74-2.46l-3.31-2.51c-.92.62-2.09.99-3.43.99-2.64 0-4.88-1.78-5.68-4.18H2.9v2.59A10.18 10.18 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.32 13.84A6.1 6.1 0 0 1 6 12c0-.64.11-1.26.32-1.84V7.57H2.9A10.01 10.01 0 0 0 1.82 12c0 1.61.39 3.13 1.08 4.43l3.42-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.98c1.5 0 2.84.52 3.9 1.54l2.92-2.92C17.05 2.96 14.75 2 12 2a10.18 10.18 0 0 0-9.1 5.57l3.42 2.59C7.12 7.76 9.36 5.98 12 5.98Z"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.18-3.37-1.18-.46-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.54 1.03 1.54 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.5c.85 0 1.7.11 2.5.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.9.68 1.81V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}
