"use server";

import { getActor } from "@/lib/session";
import { clinicalThreads } from "@/data/threads";
import type { ThreadLifecycleStatus } from "@/domain/threads";

/**
 * Explicit thread lifecycle change. Authorization is enforced inside the
 * service (which checks the acting identity against the thread's patient).
 * Called from the client; the client refreshes to re-read server state.
 */
export async function setThreadStatusAction(
  threadId: string,
  status: ThreadLifecycleStatus,
) {
  const actor = await getActor();
  await clinicalThreads.setThreadStatus(actor, threadId, status);
}
