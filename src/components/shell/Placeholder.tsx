import { getTranslations } from "next-intl/server";

/** Temporary placeholder for screens not yet built, so navigation never 404s. */
export async function Placeholder({ titleKey }: { titleKey: string }) {
  const t = await getTranslations("nav");
  return (
    <div className="mx-auto max-w-4xl px-5 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{t(titleKey)}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        قيد الإنشاء — coming soon.
      </p>
    </div>
  );
}
