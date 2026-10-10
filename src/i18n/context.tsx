import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Language, Translations } from './types';
import { zh } from './locales/zh';
import { en } from './locales/en';

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: Translations;
}

const translations: Record<Language, Translations> = { zh, en };

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'intelligent_ui_lang';

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'zh';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'zh' || saved === 'en') return saved;
  // If the browser language starts with 'en' and no explicit setting, can default to zh for this site or detect
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'zh';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLanguage);

  const setLang = useCallback((nextLang: Language) => {
    setLangState(nextLang);
    try {
      localStorage.setItem(STORAGE_KEY, nextLang);
    } catch {
      // Ignore storage errors in private browsing
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  }, [lang, setLang]);

  const currentTranslations = translations[lang] || zh;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = currentTranslations.meta.title;

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', currentTranslations.meta.description);
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', currentTranslations.meta.title);
    }
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute('content', currentTranslations.meta.description);
    }
  }, [lang, currentTranslations]);

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t: currentTranslations,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      lang: 'zh',
      setLang: () => {},
      toggleLang: () => {},
      t: zh,
    };
  }
  return context;
}
