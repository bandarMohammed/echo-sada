import OpenAI from "openai";
import { env } from "@/config/env";
import type { AIContext, AIProvider, ChatTurn } from "../provider";
import { INSIGHTS_JSON_SCHEMA } from "../schemas/insight";
import { PREVISIT_JSON_SCHEMA } from "../schemas/previsit";
import {
  insightInstruction,
  previsitInstruction,
  renderContext,
  systemPrompt,
} from "../prompts";

/**
 * OpenAI adapter. Constructed only when a key is configured. Uses Structured
 * Outputs (strict JSON schema) for insights and token streaming for chat.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private client: OpenAI;
  private model: string;

  constructor() {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for the OpenAI provider");
    }
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.model = env.OPENAI_MODEL;
  }

  async generateInsights(context: AIContext): Promise<unknown> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt(context.persona) },
        {
          role: "user",
          content: `${renderContext(context)}\n\n${insightInstruction(context.persona)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: INSIGHTS_JSON_SCHEMA,
      },
    });
    const content = res.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content);
  }

  async generatePreVisit(context: AIContext): Promise<unknown> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt(context.persona) },
        {
          role: "user",
          content: `${renderContext(context)}\n\n${previsitInstruction(context.locale)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: PREVISIT_JSON_SCHEMA,
      },
    });
    const content = res.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content);
  }

  async *chat(context: AIContext, messages: ChatTurn[]): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.4,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt(context.persona) },
        {
          role: "system",
          content: `Patient context follows. Answer strictly from it.\n\n${renderContext(context)}`,
        },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
