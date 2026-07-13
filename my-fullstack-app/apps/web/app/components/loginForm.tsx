"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "../page.module.css";

export default function LoginForm() {
  const searchParams = useSearchParams();

  const redirect = searchParams.get("redirect") || "/workspace";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Email or password is incorrect.");
      return;
    }

    window.location.href = redirect;
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginIntro}>
        <Link className={styles.landingBrand} href="/">
          <span className={styles.logo}>SF</span>
          <span>
            <b>SprintForge</b>
            <small>SaaS console</small>
          </span>
        </Link>

        <h1>Welcome back to your workspace.</h1>
        <p>Sign in to review sprint progress, deadlines, and team activity.</p>
      </section>

      <form className={styles.loginCard} onSubmit={handleSubmit}>
        <h2>Login</h2>

        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <p className={styles.loginError}>{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Login"}
        </button>

        <p className={styles.authSwitch}>
          New to SprintForge? <Link href="/register">Create account</Link>
        </p>
      </form>
    </main>
  );
}
