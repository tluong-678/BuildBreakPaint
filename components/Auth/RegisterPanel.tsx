"use client";

import { useState, type FormEvent } from "react";
import { useLanguage } from "@/app/providers";
import { translations } from "@/components/StartScreen/translations";
import styles from "./Auth.module.css";

type Props = {
  onAuthenticated: () => void;
  onSwitch: () => void;
};

export default function RegisterPanel({
  onAuthenticated,
  onSwitch,
}: Props) {
  const { language } = useLanguage();
  const t = translations[language];

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
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
        throw new Error(data?.error || t.registerFailed);
      }

      onAuthenticated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.registerFailed
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
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      <label>
        {t.confirmPassword}

        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder={t.confirmPassword}
          autoComplete="new-password"
          minLength={8}
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
        {loading ? "..." : t.signUp}
      </button>

      <p className={styles.switchText}>
        {t.haveAccount}
        <button type="button" onClick={onSwitch}>
          {t.signIn}
        </button>
      </p>
    </form>
  );
        }
