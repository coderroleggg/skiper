import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { getMessages, isLocale, type Locale } from "../../lib/i18n";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  if (!isLocale(params.locale)) {
    return {
      title: "Skiper",
      description: "Skiper"
    };
  }

  const messages = getMessages(params.locale);
  const title = `${messages.hero.title} | Skiper`;
  const description = messages.hero.subtitle;

  return {
    title,
    description,
    alternates: {
      canonical: `https://skiper.stefanov.tech/${params.locale}`,
      languages: {
        en: "https://skiper.stefanov.tech/en",
        ru: "https://skiper.stefanov.tech/ru",
        es: "https://skiper.stefanov.tech/es",
        pt: "https://skiper.stefanov.tech/pt",
        "x-default": "https://skiper.stefanov.tech/en"
      }
    },
    openGraph: {
      title,
      description,
      url: `https://skiper.stefanov.tech/${params.locale}`,
      siteName: "Skiper",
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}

export default function LocaleLayout({ children, params }: { children: ReactNode; params: { locale: string } }): JSX.Element {
  if (!isLocale(params.locale)) {
    notFound();
  }

  return <div data-locale={params.locale as Locale}>{children}</div>;
}
