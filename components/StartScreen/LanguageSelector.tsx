"use client";

import { useLanguage, type Language } from "@/app/providers";
import styles from "./StartScreen.module.css";
import { translations } from "./translations";

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  return (
    <label className={styles.languageSelector}>
      <span>{t.language}</span>

      <select
        value={language}
        onChange={(event) =>
          setLanguage(event.target.value as Language)
        }
        aria-label={t.chooseLanguage}
      >
        <option value="en">English</option>
        <option value="vi">Tiếng Việt</option>
        <option value="zh">中文</option>
      </select>
    </label>
  );
}
