import Link from "next/link";
import { notFound } from "next/navigation";

import { getMessages, isLocale, locales, type Locale } from "../../lib/i18n";

export default async function LocalePage({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  if (!isLocale(resolvedParams.locale)) {
    notFound();
  }

  const locale = resolvedParams.locale as Locale;
  const t = getMessages(locale);

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand" style={{ fontFamily: "var(--font-heading), sans-serif" }}>
          <span className="brand-dot" />
          <span>Skiper</span>
        </div>

        <nav className="lang-list" aria-label="Language picker">
          {locales.map((item) => (
            <Link key={item} href={`/${item}`} className={`lang-link ${item === locale ? "active" : ""}`}>
              {item.toUpperCase()}
            </Link>
          ))}
        </nav>
      </header>

      <section className="hero">
        <div className="hero-kicker">{t.hero.kicker}</div>
        <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }}>{t.hero.title}</h1>
        <p>{t.hero.subtitle}</p>

        <div className="hero-actions">
          <a className="btn-download" href="/download/skiper-extension.zip" download>
            {t.hero.downloadButton}
          </a>
          <a className="btn-api" href="https://api.skiper.stefanov.tech/LLM.md" target="_blank" rel="noreferrer">
            {t.hero.apiButton}
          </a>
        </div>

        <div className="grid">
          {t.highlights.map((item) => (
            <article className="card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="install">
        <h2 style={{ fontFamily: "var(--font-heading), sans-serif" }}>{t.install.title}</h2>
        <p>{t.install.subtitle}</p>

        <div className="steps">
          {t.install.steps.map((step, index) => (
            <article className="step" key={step.title}>
              <strong>
                {index + 1}. {step.title}
              </strong>
              <p>{step.body}</p>
            </article>
          ))}
        </div>

        <p className="footer-note">{t.install.footer}</p>
      </section>
    </main>
  );
}
