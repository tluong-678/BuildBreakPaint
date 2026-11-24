"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  translations,
  type Language,
  type TranslationKey,
} from "./translations";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext =
  createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "bbp-language";

function isLanguage(value: string): value is Language {
  return value === "en" || value === "vi" || value === "zh";
}

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved && isLanguage(saved)) {
        setLanguageState(saved);
      }
    } catch {
      // Nếu trình duyệt không cho dùng localStorage,
      // ứng dụng vẫn hoạt động với English.
    }

    setReady(true);
  }, []);

  function setLanguage(next: Language) {
    setLanguageState(next);

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Không làm ứng dụng bị lỗi nếu không lưu được.
    }
  }

  function t(key: TranslationKey) {
    return translations[language][key];
  }

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}
