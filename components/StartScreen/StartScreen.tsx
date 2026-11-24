"use client";

import { useEffect, useState } from "react";
import styles from "./StartScreen.module.css";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Mode = "login" | "register";

export default function StartScreen() {
  const { language, setLanguage, t } = useLanguage();

  const [mode, setMode] = useState<Mode | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setUser(data.user))
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);

    if (params.has("authError")) {
      setError(t("googleError"));
    }
  }, [t]);

  async function submit() {
    setError("");

    if (mode === "register" && password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("authFailed"));
      }

      if (mode === "register" && !data.success) {
        throw new Error(data.error || t("registerFailed"));
      }

      window.location.href = "/play";
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t("somethingWrong")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.screen}>
      <div className={styles.glow} />

      <header className={styles.header}>
        <div className={styles.logo}>🧱 BBP</div>

        <div className={styles.headerRight}>
          {user ? (
            <>
              <span>
                {t("greeting")}, {user.username}
              </span>

              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", {
                    method: "POST",
                  });

                  setUser(null);
                }}
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <button onClick={() => setMode("login")}>
              {t("login")}
            </button>
          )}

          <select
            aria-label="Language"
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as "en" | "vi" | "zh")
            }
          >
            <option value="en">English</option>
            <option value="vi">Tiếng Việt</option>
            <option value="zh">中文</option>
          </select>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{t("welcome")}</p>

          <h1>
            Build, Break,
            <br />
            <span>Paint!</span>
          </h1>

          <p className={styles.description}>
            {t("description")}
          </p>

          <div className={styles.actions}>
            <button
              className={styles.primary}
              onClick={() =>
                user
                  ? window.location.assign("/play")
                  : setMode("login")
              }
            >
              ▶ {t("play")}
            </button>

            <button
              className={styles.secondary}
              onClick={() =>
                user
                  ? window.location.assign("/multiplayer")
                  : setMode("login")
              }
            >
              🌐 {t("multiplayer")}
            </button>
          </div>

          {!user && (
            <p className={styles.hint}>
              {t("loginHint")}
            </p>
          )}
        </div>

        <div className={styles.art} aria-hidden="true">
          <div className={`${styles.cube} ${styles.c1}`} />
          <div className={`${styles.cube} ${styles.c2}`} />
          <div className={`${styles.cube} ${styles.c3}`} />

          <div className={styles.avatar}>
            <div className={styles.head}>
              <i />
              <i />
            </div>

            <div className={styles.body} />

            <div className={`${styles.leg} ${styles.l1}`} />
            <div className={`${styles.leg} ${styles.l2}`} />
          </div>

          <div className={styles.platform} />
        </div>
      </section>

      {mode && (
        <div
          className={styles.overlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMode(null);
            }
          }}
        >
          <section className={styles.modal}>
            <button
              className={styles.x}
              onClick={() => setMode(null)}
            >
              ×
            </button>

            <h2>
              {mode === "login"
                ? t("welcomeBack")
                : t("createAccount")}
            </h2>

            <p>
              {mode === "login"
                ? t("loginDescription")
                : t("registerDescription")}
            </p>

            <label>
              {t("username")}
              <input
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                autoComplete="username"
              />
            </label>

            <label>
              {t("password")}
              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
              />
            </label>

            {mode === "register" && (
              <label>
                {t("confirmPassword")}
                <input
                  type="password"
                  value={confirm}
                  onChange={(event) =>
                    setConfirm(event.target.value)
                  }
                  autoComplete="new-password"
                />
              </label>
            )}

            {error && (
              <p className={styles.error}>{error}</p>
            )}

            <button
              className={styles.primary}
              disabled={busy}
              onClick={submit}
            >
              {busy
                ? t("wait")
                : mode === "login"
                  ? t("login")
                  : t("register")}
            </button>

            <button
              className={styles.google}
              onClick={() =>
                window.location.assign("/api/auth/google")
              }
            >
              {t("googleLogin")}
            </button>

            <p className={styles.switch}>
              {mode === "login"
                ? t("newHere")
                : t("alreadyAccount")}

              <button
                onClick={() => {
                  setMode(
                    mode === "login" ? "register" : "login"
                  );
                  setError("");
                }}
              >
                {mode === "login"
                  ? t("register")
                  : t("login")}
              </button>
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
