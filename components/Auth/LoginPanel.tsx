"use client";

import { useState, type FormEvent } from "react";
import { useLanguage } from "@/app/providers";
import { translations } from "@/components/StartScreen/translations";
import styles from "./Auth.module.css";

type Props = {
  onAuthenticated: () => void;
  onSwitch: () => void;
};

export default function LoginPanel({
  onAuthenticated,
  onSwitch,
}: Props) {
  const { language } = useLanguage();
  const t = translations[language];

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || t.loginFailed);
      }

      onAuthenticated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.loginFailed
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label>
        {t.username}

        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={t.username}
          autoComplete="username"
          minLength={3}
          maxLength={24}
          required
        />
      </label>

      <label>
        {t.password}

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t.password}
          autoComplete="current-password"
          required
        />
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button
        className={styles.submitButton}
        type="submit"
        disabled={loading}
      >
        {loading ? "..." : t.signIn}
      </button>

      <p className={styles.switchText}>
        {t.noAccount}
        <button type="button" onClick={onSwitch}>
          {t.signUp}
        </button>
      </p>
    </form>
  );
      }
