import { ref } from 'vue';
import { i18n } from '../lang/i18n.ts';

export type Lang = 'EN' | 'FR' | 'NL';

function isValidLanguage(value: unknown): value is Lang {
  return value === 'EN' || value === 'FR' || value === 'NL';
}

function getInitialLanguage(): Lang {
  if (typeof window === 'undefined')
    return 'EN';
  const stored = window.localStorage.getItem('lang');
  if (stored && isValidLanguage(stored))
    return stored;
  return 'EN';
}

const currentLanguage = ref<Lang>(getInitialLanguage());
i18n.global.locale.value = currentLanguage.value;

function setLanguage(lang: Lang) {
  currentLanguage.value = lang;
  if (typeof window !== 'undefined')
    window.localStorage.setItem('lang', lang);
  i18n.global.locale.value = lang;
}

export function useLanguage() {
  return {
    currentLanguage,
    setLanguage,
  };
}
