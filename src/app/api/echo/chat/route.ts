import { getActor } from "@/lib/session";
import { healthData } from "@/data";
import { aiService } from "@/ai";
import { recordAudit } from "@/lib/audit";
import type { ChatTurn } from "@/ai/provider";

export const runtime = "nodejs";

/** Streaming ECHO chat. Context is built server-side from ONE authorized
 * bundle; the OpenAI key (when configured) never leaves the server. */
export async function POST(req: Request) {
  const actor = await getActor();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const b = body as { messages?: unknown; subjectPatientId?: unknown };

  const messages: ChatTurn[] = Array.isArray(b.messages)
    ? b.messages
        .filter(
          (m): m is ChatTurn =>
            !!m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
        .slice(-12)
    : [];
  if (messages.length === 0) return new Response("no messages", { status: 400 });

  // Patient chats about themselves; a doctor must name an authorized patient.
  const patientId =
    actor.role === "PATIENT"
      ? actor.patientId
      : typeof b.subjectPatientId === "string"
        ? b.subjectPatientId
        : null;
  if (!patientId) return new Response("unauthorized", { status: 401 });

  let bundle;
  try {
    bundle = await healthData.getRecordBundle(actor, patientId);
  } catch {
    return new Response("forbidden", { status: 403 });
  }

  await recordAudit(actor, "AI_CHAT", {
    subjectPatientId: patientId,
    meta: { turns: messages.length, provider: aiService.providerName },
  });

  const { stream } = aiService.streamChat(bundle, actor.role, messages);
  const encoder = new TextEncoder();
  const rs = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) controller.enqueue(encoder.encode(chunk));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(rs, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
