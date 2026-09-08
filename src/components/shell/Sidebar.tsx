"use client";

import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Activity,
  FlaskConical,
  Pill,
  FileText,
  CalendarDays,
  Stethoscope,
  MessageCircle,
  Bell,
  GitBranch,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import type { NavItem } from "@/lib/nav";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  timeline: Activity,
  labs: FlaskConical,
  medications: Pill,
  reports: FileText,
  appointments: CalendarDays,
  doctors: Stethoscope,
  chat: MessageCircle,
  alerts: Bell,
  threads: GitBranch,
  profile: User,
  patients: Users,
};

export function Sidebar({ items, root }: { items: NavItem[]; root: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const Icon = ICONS[item.key] ?? LayoutDashboard;
        const active =
          item.href === root ? pathname === root : pathname.startsWith(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
