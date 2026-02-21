import type { ReactNode } from "react";
import { Chivo, Space_Grotesk } from "next/font/google";

import "./globals.css";

const headingFont = Chivo({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["700", "800", "900"],
  variable: "--font-heading"
});

const bodyFont = Space_Grotesk({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "700"],
  variable: "--font-body"
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body style={{ fontFamily: "var(--font-body), sans-serif" }}>{children}</body>
    </html>
  );
}
