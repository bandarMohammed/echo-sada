import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { Cairo, Inter } from "next/font/google";
import { routing } from "@/i18n/routing";
import { localeDirection, type Locale } from "@/config/app";
import "../globals.css";

const arabic = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const latin = Inter({
  variable: "--font-latin",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ECHO | صدى",
  description: "The Patient's Second Memory — a healthcare intelligence layer.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const dir = localeDirection[locale as Locale];

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${arabic.variable} ${latin.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
