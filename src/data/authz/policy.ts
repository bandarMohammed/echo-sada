/**
 * Central authorization policy — the ONE place access decisions are made.
 *
 * The real gate is here at the data layer, not in the UI. Both Demo Mode and
 * future real auth resolve an `Actor` and flow through these functions, so
 * turning on real auth changes only how the Actor is produced, never the guards.
 *
 * Kept dependency-injected (no direct Prisma import) so it is pure and unit-
 * testable: the doctor↔patient link check is provided by the caller.
 */

export type Role = "PATIENT" | "DOCTOR";

export interface Actor {
  userId: string;
  role: Role;
  /** Set when role === "PATIENT" — the patient's own PatientProfile id. */
  patientId: string | null;
  /** Set when role === "DOCTOR" — the doctor's DoctorProfile id. */
  doctorId: string | null;
}

export interface AuthzDeps {
  /** True iff an ACTIVE relationship links this doctor to this patient. */
  isDoctorLinked(doctorId: string, patientId: string): Promise<boolean>;
}

export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN";
  constructor(message = "Not authorized to access this patient's data") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Can this actor read the given patient's data? */
export async function canAccessPatient(
  actor: Actor,
  patientId: string,
  deps: AuthzDeps,
): Promise<boolean> {
  if (!patientId) return false;

  if (actor.role === "PATIENT") {
    // A patient may only ever access their own record.
    return actor.patientId != null && actor.patientId === patientId;
  }

  if (actor.role === "DOCTOR") {
    if (!actor.doctorId) return false;
    return deps.isDoctorLinked(actor.doctorId, patientId);
  }

  return false;
}

/** Throws AuthorizationError unless the actor may read the patient. */
export async function assertCanAccessPatient(
  actor: Actor,
  patientId: string,
  deps: AuthzDeps,
): Promise<void> {
  const ok = await canAccessPatient(actor, patientId, deps);
  if (!ok) throw new AuthorizationError();
}
