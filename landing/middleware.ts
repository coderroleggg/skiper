import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales, type Locale } from "./lib/i18n";

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/download") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hasLocalePrefix = locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  if (hasLocalePrefix) {
    return NextResponse.next();
  }

  const locale = detectLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

function detectLocale(header: string | null): Locale {
  if (!header) {
    return defaultLocale;
  }

  const normalized = header.toLowerCase();
  if (normalized.includes("ru")) return "ru";
  if (normalized.includes("es")) return "es";
  if (normalized.includes("pt")) return "pt";
  if (normalized.includes("en")) return "en";
  return defaultLocale;
}
