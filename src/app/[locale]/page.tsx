import { getTranslations } from "next-intl/server";
import { app } from "@/config/app";
import { switchIdentity } from "@/app/actions/demo";
import { getFeaturedDoctorId } from "@/lib/demo";
import { SubmitButton } from "@/components/shell/SubmitButton";
import type { Locale } from "@/config/app";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("landing");
  const tApp = await getTranslations("app");

  const featuredDoctorId = await getFeaturedDoctorId();
  const enterPatient = switchIdentity.bind(null, "PATIENT", "p04", locale as Locale);
  const enterDoctor = switchIdentity.bind(null, "DOCTOR", featuredDoctorId, locale as Locale);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold">
            {tApp("name")}
          </span>
          <span className="text-xl font-semibold tracking-tight">{tApp("latinName")}</span>
        </div>

        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-accent">
          {t("eyebrow")}
        </p>
        <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <form action={enterPatient} className="w-full sm:w-auto">
            <SubmitButton variant="primary">{t("enterAsPatient")}</SubmitButton>
          </form>
          <form action={enterDoctor} className="w-full sm:w-auto">
            <SubmitButton variant="secondary">{t("enterAsDoctor")}</SubmitButton>
          </form>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">{t("demoNote")}</p>
        <p className="mt-2 text-xs text-muted-foreground/70">{app.tagline}</p>
      </div>
    </main>
  );
}
