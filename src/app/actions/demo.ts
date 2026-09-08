"use server";

import { cookies } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { DEMO_COOKIE } from "@/lib/session";
import type { Locale } from "@/config/app";

/** Switch the demo identity (role + specific patient/doctor) and navigate to
 * the appropriate area. Called from the client switcher. */
export async function switchIdentity(
  role: "PATIENT" | "DOCTOR",
  id: string,
  locale: Locale,
) {
  const store = await cookies();
  store.set(DEMO_COOKIE, `${role}:${id}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect({ href: role === "PATIENT" ? "/patient" : "/doctor", locale });
}
