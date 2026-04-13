import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enApp from "@/locales/en/app.json";
import zhApp from "@/locales/zh-CN/app.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "zh-CN"],
    nonExplicitSupportedLngs: true,
    defaultNS: "app",
    resources: {
      en: { app: enApp },
      "zh-CN": { app: zhApp },
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
