"use client";

import { useState } from "react";
import { useLanguage } from "@/app/providers";
import AuthPanel from "@/components/Auth/AuthPanel";
import LanguageSelector from "./LanguageSelector";
import styles from "./StartScreen.module.css";
import { translations } from "./translations";

type GameMode = "single" | "multiplayer";

export default function StartScreen() {
  const { language } = useLanguage();
  const t = translations[language];

  const [authOpen, setAuthOpen] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>("single");
  const [loggedIn, setLoggedIn] = useState(false);

  function startGame(mode: GameMode) {
    setGameMode(mode);

    if (!loggedIn) {
      setAuthOpen(true);
      return;
    }

    window.location.href =
      mode === "multiplayer" ? "/multiplayer" : "/game";
  }

  function handleAuthenticated() {
    setLoggedIn(true);
    setAuthOpen(false);

    window.location.href =
      gameMode === "multiplayer" ? "/multiplayer" : "/game";
  }

  return (
    <main className={styles.screen}>
      <div className={styles.backgroundDecor} />

      <header className={styles.header}>
        <div className={styles.logo}>BBP</div>
        <LanguageSelector />
      </header>

      <section className={styles.hero}>
        <div className={styles.art}>
          <div className={styles.block blockOne} />
          <div className={styles.block blockTwo} />
          <div className={styles.block blockThree} />
          <div className={styles.block blockFour} />
          <div className={styles.player}>
            <div className={styles.playerHead} />
            <div className={styles.playerBody} />
            <div className={styles.playerLegs}>
              <span />
              <span />
            </div>
          </div>
        </div>

        <h1 className={styles.title}>
          -- {t.title} --
        </h1>

        <p className={styles.tagline}>{t.tagline}</p>

        <p className={styles.welcome}>{t.welcome}</p>

        <div className={styles.buttons}>
          <button
            className={styles.playButton}
            onClick={() => startGame("single")}
          >
            <span>▶</span> {t.play} (P)
          </button>

          <button
            className={styles.multiplayerButton}
            onClick={() => startGame("multiplayer")}
          >
            <span>👥</span> {t.multiplayer} (M)
          </button>
        </div>

        <div className={styles.authLinks}>
          <button onClick={() => setAuthOpen(true)}>
            {t.login}
          </button>

          <span>·</span>

          <button onClick={() => setAuthOpen(true)}>
            {t.register}
          </button>
        </div>
      </section>

      <footer className={styles.footer}>
        BUILD YOUR WORLD · BREAK THE RULES · PAINT EVERYTHING
      </footer>

      {authOpen && (
        <AuthPanel
          onClose={() => setAuthOpen(false)}
          onAuthenticated={handleAuthenticated}
        />
      )}
    </main>
  );
          }
