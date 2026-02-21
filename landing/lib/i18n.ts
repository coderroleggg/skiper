import en from "../messages/en.json";
import es from "../messages/es.json";
import pt from "../messages/pt.json";
import ru from "../messages/ru.json";

export const locales = ["ru", "en", "es", "pt"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export type Messages = typeof en;

const dictionaries: Record<Locale, Messages> = {
  ru,
  en,
  es,
  pt
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}
