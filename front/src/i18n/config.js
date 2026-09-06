// src/i18n/config.js
// Global i18next setup for the frontend student app.
// Supported languages: English (en), French (fr), Arabic (ar - RTL).
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

// RTL/LTR direction mapping. Arabic renders right-to-left; others left-to-right.
export const RTL_LANGS = ['ar'];

export const applyDirection = (lng) => {
  const dir = RTL_LANGS.includes(lng) ? 'rtl' : 'ltr';
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lng);
  }
  return dir;
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'ar'],
    // Manual choice is stored in localStorage by the custom dropdown.
    // Priority: cached manual choice -> browser language -> fallback.
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lms_lang',
      convertDetectedLanguage: (lng) => {
        const code = (lng || '').toLowerCase();
        if (code === 'fr' || code === 'fr-fr' || code.startsWith('fr-')) return 'fr';
        if (code === 'ar' || code.startsWith('ar-')) return 'ar';
        return 'en';
      },
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
    initImmediate: false,
    react: {
      useSuspense: false,
    },
  });

applyDirection(i18n.language);

// Keep document dir/lang in sync whenever the language changes.
i18n.on('languageChanged', (lng) => {
  applyDirection(lng);
});

export default i18n;
