import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { getMessages, isLocale, type Locale } from "../../lib/i18n";

type LocaleParams = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const resolvedParams = await params;
  if (!isLocale(resolvedParams.locale)) {
    return {
      title: "Skiper",
      description: "Skiper"
    };
  }

  const messages = getMessages(resolvedParams.locale);
  const title = `${messages.hero.title} | Skiper`;
  const description = messages.hero.subtitle;

  return {
    title,
    description,
    alternates: {
      canonical: `https://skiper.stefanov.tech/${resolvedParams.locale}`,
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
      url: `https://skiper.stefanov.tech/${resolvedParams.locale}`,
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

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: LocaleParams;
}) {
  const resolvedParams = await params;
  if (!isLocale(resolvedParams.locale)) {
    notFound();
  }

  return <div data-locale={resolvedParams.locale as Locale}>{children}</div>;
}
