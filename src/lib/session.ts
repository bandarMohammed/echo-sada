import { cookies } from "next/headers";
import type { Actor } from "@/data/authz/policy";

/**
 * Demo identity. In demo mode the "logged-in" actor is chosen via the
 * switcher and stored in a cookie. Crucially, it is resolved server-side and
 * flows through the SAME authorization policy real auth will use — so enabling
 * real auth later changes only how this identity is produced.
 */
export const DEMO_COOKIE = "echo_demo";

export interface DemoIdentity {
  role: "PATIENT" | "DOCTOR";
  id: string; // PatientProfile id or DoctorProfile id
}

/** Default: open directly into hero Patient 04. */
export const DEFAULT_IDENTITY: DemoIdentity = { role: "PATIENT", id: "p04" };

export function parseIdentity(value?: string | null): DemoIdentity | null {
  if (!value) return null;
  const [role, id] = value.split(":");
  if ((role === "PATIENT" || role === "DOCTOR") && id) return { role, id };
  return null;
}

export function toActor(identity: DemoIdentity): Actor {
  return identity.role === "PATIENT"
    ? { userId: `user-${identity.id}`, role: "PATIENT", patientId: identity.id, doctorId: null }
    : { userId: `user-${identity.id}`, role: "DOCTOR", patientId: null, doctorId: identity.id };
}

export async function getIdentity(): Promise<DemoIdentity> {
  const store = await cookies();
  return parseIdentity(store.get(DEMO_COOKIE)?.value) ?? DEFAULT_IDENTITY;
}

export async function getActor(): Promise<Actor> {
  return toActor(await getIdentity());
}
