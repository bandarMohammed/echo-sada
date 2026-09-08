import type { AIContext, AIProvider, ChatTurn } from "../provider";
import type { InsightPayload } from "../schemas/insight";
import { deterministicPreVisit } from "../previsit";

/**
 * Deterministic, key-free adapter. It turns the pre-computed detections into
 * structured insights and composes a grounded, evidence-referencing chat reply.
 * This lets the entire demo run offline and makes AI tests deterministic.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async generateInsights(context: AIContext): Promise<unknown> {
    const insights: InsightPayload[] = context.detections.map((d) => ({
      type: d.type,
      severity: d.severity,
      title: d.title,
      summary: d.summary,
      recommendation: d.recommendation,
      evidence: d.evidence,
    }));
    return { insights };
  }

  /** Deterministic pre-visit briefing derived from the detected patterns. */
  async generatePreVisit(context: AIContext): Promise<unknown> {
    return deterministicPreVisit(context);
  }

  async *chat(context: AIContext, messages: ChatTurn[]): AsyncIterable<string> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const top = context.detections[0];
    const isPatient = context.persona === "PATIENT";

    const parts: string[] = [];
    if (isPatient) {
      parts.push("بناءً على سجلّك الصحي، ");
      if (lastUser) parts.push(`فيما يخص سؤالك: `);
    } else {
      parts.push("Pre-visit summary — ");
    }

    if (top) {
      parts.push(
        isPatient
          ? `لاحظتُ ما يلي: ${top.title}. ${top.summary} `
          : `${context.detections.length} finding(s). Most notable: ${top.title} — ${top.summary} `,
      );
      if (top.recommendation) {
        parts.push(isPatient ? `توصيتي العامة: ${top.recommendation} ` : `Suggested: ${top.recommendation} `);
      }
      const ev = top.evidence.map((e) => e.recordId).join(", ");
      if (ev) parts.push(isPatient ? `(المرجع: ${ev}). ` : `(evidence: ${ev}). `);
    } else {
      parts.push(
        isPatient
          ? "لا توجد أنماط مهمة تحتاج انتباهاً في الوقت الحالي. "
          : "No notable patterns detected in the available data. ",
      );
    }

    parts.push(
      isPatient
        ? "هذه ليست تشخيصاً طبياً — يُرجى مراجعة طبيبك لأي قرار."
        : "This is decision-support, not a diagnosis.",
    );

    // Stream word-by-word for a realistic typing effect.
    const text = parts.join("");
    for (const token of text.split(/(\s+)/)) {
      if (token) yield token;
    }
  }
}
