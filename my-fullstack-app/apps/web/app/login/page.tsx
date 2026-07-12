"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, authApi, getAccessToken, setAccessToken } from "../../lib/api-client";
import styles from "./page.module.css";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAccessToken()) router.replace("/workspaces");
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = mode === "login"
        ? await authApi.login({ email, password })
        : await authApi.register({ name, email, password });
      setAccessToken(result.accessToken);
      router.replace("/workspaces");
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : "Unable to complete authentication.");
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
  }

  return <main className={styles.page}>
    <section className={styles.card}>
      <div className={styles.brand}><span>SF</span><div><strong>SprintForge</strong><small>Plan together. Ship with clarity.</small></div></div>
      <div className={styles.heading}>
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p>{mode === "login" ? "Sign in to open your workspaces." : "Start organizing your team and projects."}</p>
      </div>
      <div className={styles.tabs} role="tablist" aria-label="Authentication mode">
        <button type="button" className={mode === "login" ? styles.activeTab : ""} onClick={() => changeMode("login")}>Sign in</button>
        <button type="button" className={mode === "register" ? styles.activeTab : ""} onClick={() => changeMode("register")}>Register</button>
      </div>
      <form onSubmit={submit} className={styles.form}>
        {mode === "register" && <label>Name<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} autoComplete="name" required placeholder="Your name" /></label>}
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "register" ? 8 : 1} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} required placeholder={mode === "register" ? "At least 8 characters" : "Your password"} /></label>
        {error && <div className={styles.error} role="alert">{error}</div>}
        <button className={styles.submit} disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
    </section>
  </main>;
}
