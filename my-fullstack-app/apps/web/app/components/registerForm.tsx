"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../page.module.css";
import { ApiError, authApi } from "../../lib/api-client";

export default function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await authApi.register({
        name,
        email,
        password,
      });
      router.replace("/workspaces");
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Registration failed. Please check your details.",
      );
    } finally {
      setSubmitting(false);
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

        <h1>Create your SprintForge workspace.</h1>
        <p>Register an account to start managing sprint progress and team activity.</p>
      </section>

      <form className={styles.loginCard} onSubmit={handleSubmit}>
        <h2>Register</h2>

        <label>
          Name
          <input
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

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
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <p className={styles.loginError}>{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <p className={styles.authSwitch}>
          Already have an account? <Link href="/login">Login</Link>
        </p>
      </form>
    </main>
  );
}
