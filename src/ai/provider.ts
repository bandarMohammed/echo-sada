import type { Detection } from "@/domain/types";
import type { InsightPayload } from "./schemas/insight";

export type AIPersona = "PATIENT" | "DOCTOR";
export type ChatRole = "user" | "assistant";

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

/** Entry in the evidence index — used to scope/validate AI evidence refs so
 * an insight can only cite records that are real and authorized. */
export interface EvidenceIndexEntry {
  recordType: string;
  date: string;
}

/**
 * Bounded, structured context handed to a provider. It is built from a SINGLE
 * authorized record bundle (privacy boundary enforced upstream by the data
 * layer), and carries pre-computed detections + an evidence index rather than
 * a raw database dump.
 */
export interface AIContext {
  patientId: string;
  persona: AIPersona;
  locale: string;
  profile: { ageYears: number; gender: string; city: string | null };
  summary: string;
  detections: Detection[];
  timelineDigest: string;
  freshness: string[];
  evidenceIndex: Record<string, EvidenceIndexEntry>;
}

/**
 * AIProvider — the swappable model boundary. `generateInsights` returns RAW
 * output (validated by AIService with Zod); `chat` streams text chunks.
 */
export interface AIProvider {
  readonly name: string;
  generateInsights(context: AIContext): Promise<unknown>;
  /** Structured doctor pre-visit briefing (raw; validated by AIService). */
  generatePreVisit(context: AIContext): Promise<unknown>;
  chat(context: AIContext, messages: ChatTurn[]): AsyncIterable<string>;
}

export type { InsightPayload };
