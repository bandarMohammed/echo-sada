import { effectiveAiProvider } from "@/config/env";
import type { PatientRecordBundle } from "@/data/provider";
import { buildContext } from "./context/builder";
import { MockAIProvider } from "./adapters/mock";
import { OpenAIProvider } from "./adapters/openai";
import type { AIContext, AIPersona, AIProvider, ChatTurn } from "./provider";
import { insightsResponseSchema, type InsightPayload } from "./schemas/insight";
import { previsitSchema, type PreVisitSummary } from "./schemas/previsit";
import type { EvidenceRefPayload } from "./schemas/insight";
import { deterministicPreVisit } from "./previsit";

const SEVERITY_RANK: Record<InsightPayload["severity"], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export interface GenerateOptions {
  now?: Date;
  locale?: string;
  max?: number;
}

/**
 * Orchestrates context building, provider calls, and server-side validation.
 * Untrusted AI output is Zod-validated and its evidence scrubbed to records
 * that actually exist in the authorized context — enforcing traceability and
 * preventing fabricated or cross-patient references.
 */
export class AIService {
  constructor(private readonly provider: AIProvider) {}

  get providerName() {
    return this.provider.name;
  }

  async generateInsights(
    bundle: PatientRecordBundle,
    persona: AIPersona,
    opts: GenerateOptions = {},
  ): Promise<InsightPayload[]> {
    const context = buildContext(bundle, persona, opts);
    const raw = await this.provider.generateInsights(context);

    const parsed = insightsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("ai_insights_invalid", parsed.error.issues.length);
      return [];
    }

    const scrubbed = parsed.data.insights
      .map((ins) => ({
        ...ins,
        evidence: ins.evidence.filter((e) => context.evidenceIndex[e.recordId]),
      }))
      // Every surfaced insight must be traceable to authorized evidence.
      .filter((ins) => ins.evidence.length > 0)
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

    return scrubbed.slice(0, opts.max ?? 8);
  }

  /**
   * Doctor pre-visit briefing. The LLM synthesizes/prioritizes/narrates over
   * the authorized context (whose detected patterns are the source of truth);
   * output is Zod-validated and every evidence ref scrubbed to records that
   * actually exist in the authorized context. Claims left without resolvable
   * evidence are dropped. Returns null if the output fails validation.
   */
  async generatePreVisitSummary(
    bundle: PatientRecordBundle,
    opts: GenerateOptions = {},
  ): Promise<PreVisitSummary | null> {
    const context = buildContext(bundle, "DOCTOR", opts);

    // Validate the provider output; on failure, fall back to the deterministic
    // briefing built from the detections (always grounded) rather than showing
    // nothing. Either way the data is evidence-scrubbed below.
    let data: PreVisitSummary;
    try {
      const raw = await this.provider.generatePreVisit(context);
      const parsed = previsitSchema.safeParse(raw);
      if (parsed.success) {
        data = parsed.data;
      } else {
        console.error("ai_previsit_invalid_fallback", parsed.error.issues.length);
        data = deterministicPreVisit(context);
      }
    } catch (err) {
      console.error("ai_previsit_error_fallback", (err as Error).message);
      data = deterministicPreVisit(context);
    }

    // Keep only evidence that resolves to a real, authorized record, and
    // replace the model-provided recordType/date with the AUTHORITATIVE values
    // from the record itself — so every reference is provably real.
    const scrub = (evidence: EvidenceRefPayload[]): EvidenceRefPayload[] =>
      evidence
        .filter((e) => context.evidenceIndex[e.recordId])
        .map((e) => {
          const entry = context.evidenceIndex[e.recordId];
          return { recordId: e.recordId, recordType: entry.recordType, date: entry.date };
        });

    return {
      journeySummary: data.journeySummary,
      // Factual claims must be traceable → drop any left without evidence.
      keyChanges: data.keyChanges
        .map((c) => ({ ...c, evidence: scrub(c.evidence) }))
        .filter((c) => c.evidence.length > 0),
      unresolvedThreads: data.unresolvedThreads
        .map((t) => ({ ...t, evidence: scrub(t.evidence) }))
        .filter((t) => t.evidence.length > 0),
      // Prioritization statements; evidence scrubbed but items retained.
      reviewToday: data.reviewToday.map((r) => ({
        ...r,
        evidence: scrub(r.evidence),
      })),
    };
  }

  streamChat(
    bundle: PatientRecordBundle,
    persona: AIPersona,
    messages: ChatTurn[],
    opts: { now?: Date; locale?: string } = {},
  ): { context: AIContext; stream: AsyncIterable<string> } {
    const context = buildContext(bundle, persona, opts);
    return { context, stream: this.provider.chat(context, messages) };
  }
}

function selectProvider(): AIProvider {
  if (effectiveAiProvider === "openai") {
    try {
      return new OpenAIProvider();
    } catch (err) {
      console.error("openai_provider_init_failed_falling_back_to_mock", (err as Error).message);
      return new MockAIProvider();
    }
  }
  return new MockAIProvider();
}

/** Default service instance used by route handlers / server actions. */
export const aiService = new AIService(selectProvider());
