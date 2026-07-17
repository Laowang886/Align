"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, authApi } from "../../lib/api-client";
import OAuthButtons from "../components/OAuthButtons";
import styles from "../page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authApi.login({ email, password });
      router.replace("/workspaces");
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`${styles.loginPage} ${styles.authPageTransition}`}>
      <section className={styles.loginIntro}>
        <Link className={styles.landingBrand} href="/">
          <span className={styles.logo}>SF</span>
          <span>
            <b>SprintForge</b>
            <small>SaaS console</small>
          </span>
        </Link>

        <h1>Welcome back to SprintForge.</h1>
        <p>
          Sign in to continue planning work, tracking progress, and
          collaborating with your team.
        </p>
      </section>

      <form className={styles.loginCard} onSubmit={handleSubmit}>
        <h2>Sign in</h2>

        <label>
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <p className={styles.loginError}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <OAuthButtons mode="sign in" />

        <p className={styles.authSwitch}>
          New to SprintForge? <Link href="/register">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
