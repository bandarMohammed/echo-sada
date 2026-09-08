import { z } from "zod";
import { evidenceRefSchema } from "./insight";

/**
 * Doctor ECHO pre-visit summary — a concise, evidence-grounded analytical
 * briefing (NOT a generic patient summary and NOT the dashboard). Validated
 * server-side; evidence is scrubbed to authorized records before display.
 */
export const keyChangeSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  evidence: z.array(evidenceRefSchema),
});

export const unresolvedThreadSchema = z.object({
  title: z.string().min(1),
  why: z.string().min(1),
  evidence: z.array(evidenceRefSchema),
});

export const reviewItemSchema = z.object({
  item: z.string().min(1),
  evidence: z.array(evidenceRefSchema),
});

export const previsitSchema = z.object({
  journeySummary: z.string().min(1),
  keyChanges: z.array(keyChangeSchema),
  unresolvedThreads: z.array(unresolvedThreadSchema),
  reviewToday: z.array(reviewItemSchema),
});

export type KeyChange = z.infer<typeof keyChangeSchema>;
export type UnresolvedThread = z.infer<typeof unresolvedThreadSchema>;
export type ReviewItem = z.infer<typeof reviewItemSchema>;
export type PreVisitSummary = z.infer<typeof previsitSchema>;

const evidenceArrayJson = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["recordId", "recordType", "date"],
    properties: {
      recordId: { type: "string" },
      recordType: { type: "string" },
      date: { type: "string" },
    },
  },
} as const;

/** JSON Schema mirror for OpenAI Structured Outputs (strict mode). */
export const PREVISIT_JSON_SCHEMA = {
  name: "echo_previsit",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["journeySummary", "keyChanges", "unresolvedThreads", "reviewToday"],
    properties: {
      journeySummary: { type: "string" },
      keyChanges: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "detail", "evidence"],
          properties: {
            title: { type: "string" },
            detail: { type: "string" },
            evidence: evidenceArrayJson,
          },
        },
      },
      unresolvedThreads: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "why", "evidence"],
          properties: {
            title: { type: "string" },
            why: { type: "string" },
            evidence: evidenceArrayJson,
          },
        },
      },
      reviewToday: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["item", "evidence"],
          properties: {
            item: { type: "string" },
            evidence: evidenceArrayJson,
          },
        },
      },
    },
  },
} as const;
