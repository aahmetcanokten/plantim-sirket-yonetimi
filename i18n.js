import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import tr from './locales/tr.json';
import en from './locales/en.json';

const resources = {
    tr: { translation: tr },
    en: { translation: en },
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: Localization.getLocales()[0]?.languageCode || 'tr',
        fallbackLng: 'tr',
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
        compatibilityJSON: 'v3', // Required for Android
    });

export default i18n;
