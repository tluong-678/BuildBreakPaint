"use client";

import { useState } from "react";
import { useLanguage } from "@/app/providers";
import LoginPanel from "./LoginPanel";
import RegisterPanel from "./RegisterPanel";
import styles from "./Auth.module.css";
import { translations } from "@/components/StartScreen/translations";

type Props = {
  onClose: () => void;
  onAuthenticated: () => void;
};

export default function AuthPanel({
  onClose,
  onAuthenticated,
}: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { language } = useLanguage();
  const t = translations[language];

  function handleGoogleLogin() {
    // Backend cần triển khai endpoint OAuth này.
    window.location.href = "/api/auth/google";
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={onClose}
    >
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label={t.logout}
        >
          ×
        </button>

        <div className={styles.brand}>BBP</div>

        <h2 id="auth-title">
          {mode === "login" ? t.login : t.register}
        </h2>

        <button
          className={styles.googleButton}
          onClick={handleGoogleLogin}
          type="button"
        >
          <span className={styles.googleIcon}>G</span>
          {t.google}
        </button>

        <div className={styles.separator}>
          <span>OR</span>
        </div>

        {mode === "login" ? (
          <LoginPanel
            onAuthenticated={onAuthenticated}
            onSwitch={() => setMode("register")}
          />
        ) : (
          <RegisterPanel
            onAuthenticated={onAuthenticated}
            onSwitch={() => setMode("login")}
          />
        )}
      </section>
    </div>
  );
        }
