import { createI18n } from 'vue-i18n';
import EN from './EN';
import FR from './FR';
import NL from './NL';

export const messages = {
  EN,
  FR,
  NL,
};

export const i18n = createI18n({
  legacy: false,
  locale: 'EN',
  fallbackLocale: 'EN',
  messages,
});