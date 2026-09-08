import { getTranslations } from "next-intl/server";
import { getActor } from "@/lib/session";
import { ChatPanel } from "@/components/patient/ChatPanel";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const actor = await getActor();
  if (actor.role !== "PATIENT" || !actor.patientId) return null;

  const sp = await searchParams;
  const initialQuestion = typeof sp.q === "string" ? sp.q : "";

  const t = await getTranslations("nav");

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-5 py-6">
      <h1 className="mb-3 text-2xl font-bold tracking-tight">{t("chat")}</h1>
      <ChatPanel initialQuestion={initialQuestion} />
    </div>
  );
}
