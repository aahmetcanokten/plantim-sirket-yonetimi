import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import tr from './locales/tr.json';
import en from './locales/en.json';



const resources = {
    tr: { translation: tr },
    en: { translation: en },
};

let deviceLanguage = 'tr';
try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0 && locales[0].languageCode) {
        deviceLanguage = locales[0].languageCode;
    }
} catch (error) {
    console.log("Localization.getLocales error:", error);
}

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: deviceLanguage,
        fallbackLng: 'tr',
        interpolation: {
            escapeValue: false,
        },
        compatibilityJSON: 'v3',
        react: {
            useSuspense: false, // Prevent suspense related crashes if any
        }
    });

export default i18n;
