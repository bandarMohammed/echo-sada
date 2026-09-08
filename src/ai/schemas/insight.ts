import { z } from "zod";

/** Evidence pointer back to a concrete, authorized record. */
export const evidenceRefSchema = z.object({
  recordId: z.string().min(1),
  recordType: z.string().min(1),
  date: z.string().min(1),
});

/** One structured AI insight. Validated server-side before display. */
export const insightSchema = z.object({
  type: z.enum([
    "UNRESOLVED_FOLLOW_UP",
    "REPEATED_PATTERN",
    "CHANGE_DETECTION",
    "MISSING_THREAD",
    "PREVENTIVE_RECOMMENDATION",
  ]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  title: z.string().min(1),
  summary: z.string().min(1),
  recommendation: z.string().nullable(),
  evidence: z.array(evidenceRefSchema),
});

export const insightsResponseSchema = z.object({
  insights: z.array(insightSchema),
});

export type EvidenceRefPayload = z.infer<typeof evidenceRefSchema>;
export type InsightPayload = z.infer<typeof insightSchema>;
export type InsightsResponse = z.infer<typeof insightsResponseSchema>;

/**
 * JSON Schema mirror for OpenAI Structured Outputs (strict mode).
 * Hand-written to guarantee additionalProperties:false and full `required`.
 */
export const INSIGHTS_JSON_SCHEMA = {
  name: "echo_insights",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["insights"],
    properties: {
      insights: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["type", "severity", "title", "summary", "recommendation", "evidence"],
          properties: {
            type: {
              type: "string",
              enum: [
                "UNRESOLVED_FOLLOW_UP",
                "REPEATED_PATTERN",
                "CHANGE_DETECTION",
                "MISSING_THREAD",
                "PREVENTIVE_RECOMMENDATION",
              ],
            },
            severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            title: { type: "string" },
            summary: { type: "string" },
            recommendation: { type: ["string", "null"] },
            evidence: {
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
            },
          },
        },
      },
    },
  },
} as const;
