import type { AIContext, AIPersona } from "../provider";

const GUARDRAILS = `
Hard rules (never break):
- You are ECHO, a health-journey intelligence assistant. You ANALYZE, DETECT, EXPLAIN, RECOMMEND, and ALERT. You NEVER diagnose.
- Only use the provided patient context. Never invent records, values, or dates.
- Every important claim must reference evidence from the context (recordId).
- If the data is insufficient, say so plainly instead of guessing.
- Distinguish clearly between factual data, detected patterns, and general recommendations. Clinical decisions belong to a licensed human.`;

const PATIENT_STYLE = `
Audience: the patient themselves.
Style: warm, clear, reassuring, plain language. Avoid alarming phrasing. You may reply in Arabic (including Saudi dialect), English, or mixed, matching the user's language.`;

const DOCTOR_STYLE = `
Audience: the treating physician.
Style: concise, analytical, efficient, clinically literate. Prioritize changes, unresolved threads, and trends. This is decision-support, not a diagnosis.`;

export function systemPrompt(persona: AIPersona): string {
  return `${GUARDRAILS}\n${persona === "PATIENT" ? PATIENT_STYLE : DOCTOR_STYLE}`;
}

/** Render the bounded context as a compact text block for the model. */
export function renderContext(context: AIContext): string {
  const lines: string[] = [];
  lines.push(
    `Patient ${context.patientId} — ${context.profile.gender}, age ${context.profile.ageYears}${context.profile.city ? `, ${context.profile.city}` : ""}.`,
  );
  lines.push("");
  lines.push("SUMMARY:");
  lines.push(context.summary);
  if (context.freshness.length) {
    lines.push("");
    lines.push("FRESHNESS:");
    for (const f of context.freshness) lines.push(`- ${f}`);
  }
  lines.push("");
  lines.push("DETECTED PATTERNS (deterministic, evidence-linked):");
  if (context.detections.length === 0) {
    lines.push("- none");
  } else {
    for (const d of context.detections) {
      const ev = d.evidence.map((e) => e.recordId).join(", ");
      lines.push(`- [${d.type} / ${d.severity}] ${d.title}: ${d.summary} (evidence: ${ev})`);
    }
  }
  lines.push("");
  lines.push("RECENT TIMELINE:");
  lines.push(context.timelineDigest);
  return lines.join("\n");
}

export function insightInstruction(persona: AIPersona): string {
  return `Using ONLY the context, return the most important insights as JSON matching the provided schema.
Prefer the deterministic detected patterns; you may merge or reword them for a ${persona === "PATIENT" ? "patient" : "physician"} audience, but keep each insight's evidence recordIds intact. Do not add insights that lack evidence in the context.`;
}

/** Doctor pre-visit briefing instruction. Produces an analytical, prioritized
 * synthesis — NOT a generic summary and NOT a restatement of the dashboard. */
export function previsitInstruction(locale: string): string {
  const language =
    locale === "ar"
      ? "Write all narrative text in clear, professional Arabic (physician-facing)."
      : "Write all narrative text in clear, professional English (physician-facing).";
  return `Produce a concise PRE-VISIT BRIEFING for the treating physician as JSON matching the schema.
The deterministic "DETECTED PATTERNS" in the context are the source of truth for findings — build on them; do not invent, contradict, or omit important ones.
${language}

Fields:
- journeySummary: 2–4 sentences on the patient's recent + longitudinal context. Analytical, not a list.
- keyChanges: the most clinically meaningful changes over time (prefer real trends over listing everything). Each MUST cite evidence recordIds from the context.
- unresolvedThreads: follow-ups / care threads still incomplete, and WHY they matter based only on available evidence. Each MUST cite evidence.
- reviewToday: a short PRIORITIZED list of what deserves the physician's attention today. Decision-support only.

Hard rules: no diagnosis; no treatment orders; no invented facts, values, dates, medications, or events; every claim must map to evidence recordIds that appear in the context. If evidence is insufficient for a claim, omit it.`;
}
