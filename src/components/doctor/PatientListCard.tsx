import { ChevronLeft, User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { PatientSummary } from "@/data/provider";

function age(dob: Date): number {
  const now = new Date();
  let a = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) a--;
  return a;
}

export function PatientListCard({
  patient,
  primaryLabel,
}: {
  patient: PatientSummary;
  primaryLabel: string;
}) {
  return (
    <Link
      href={`/doctor/patients/${patient.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <User className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{patient.displayName}</span>
          {patient.isPrimaryLink && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {primaryLabel}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {patient.mrn} · {age(patient.dob)}y · {patient.gender}
          {patient.city ? ` · ${patient.city}` : ""}
        </div>
      </div>
      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-0 ltr:rotate-180" />
    </Link>
  );
}
