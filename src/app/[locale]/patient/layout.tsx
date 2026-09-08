import { getIdentity } from "@/lib/session";
import { getFeaturedDoctorId, listDemoDoctors, listDemoPatients } from "@/lib/demo";
import { redirect } from "@/i18n/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Sidebar } from "@/components/shell/Sidebar";
import { patientNav } from "@/lib/nav";
import type { Locale } from "@/config/app";

export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const identity = await getIdentity();
  if (identity.role !== "PATIENT") {
    redirect({ href: "/doctor", locale: locale as Locale });
  }

  const [patients, doctors, featuredDoctorId] = await Promise.all([
    listDemoPatients(),
    listDemoDoctors(),
    getFeaturedDoctorId(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        patients={patients}
        doctors={doctors}
        current={identity}
        locale={locale as Locale}
        featuredDoctorId={featuredDoctorId}
      />
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-e border-border bg-card/40 md:block">
          <Sidebar items={patientNav} root="/patient" />
        </aside>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
