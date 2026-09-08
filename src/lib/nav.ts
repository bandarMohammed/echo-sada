export interface NavItem {
  key: string;
  href: string;
}

export const patientNav: NavItem[] = [
  { key: "dashboard", href: "/patient" },
  { key: "timeline", href: "/patient/timeline" },
  { key: "labs", href: "/patient/labs" },
  { key: "medications", href: "/patient/medications" },
  { key: "reports", href: "/patient/reports" },
  { key: "appointments", href: "/patient/appointments" },
  { key: "doctors", href: "/patient/doctors" },
  { key: "chat", href: "/patient/chat" },
  { key: "threads", href: "/patient/threads" },
  { key: "alerts", href: "/patient/alerts" },
  { key: "profile", href: "/patient/profile" },
];

export const doctorNav: NavItem[] = [
  { key: "dashboard", href: "/doctor" },
  { key: "patients", href: "/doctor/patients" },
  { key: "chat", href: "/doctor/chat" },
  { key: "alerts", href: "/doctor/alerts" },
];
