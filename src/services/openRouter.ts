import OpenAI from "openai";
import { z } from "zod";
import type { BotConfig } from "../types";

const WordDiscoverySchema = z.object({
  newBadWords: z
    .array(z.string())
    .describe("New offensive/bad words to blacklist"),
  newWhiteListWords: z
    .array(z.string())
    .describe("New harmless words to whitelist"),
});

export type WordDiscovery = z.infer<typeof WordDiscoverySchema>;

function createClient(config: BotConfig): OpenAI {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.openRouterApiKey,
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/REGIX-Studio/regix-badword-blocker",
      "X-OpenRouter-Title": "REGIX GOD MODE",
    },
  });
}

export async function aiModerate(
  text: string,
  config: BotConfig,
): Promise<boolean> {
  try {
    const client = createClient(config);
    const completion = await client.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'You are a strict content moderation AI. Respond ONLY with a single JSON object: { "flagged": boolean }. Set flagged=true if the message contains profanity, harassment, hate speech, slurs, offensive language, or inappropriate content. Set flagged=false if the message is clean.',
        },
        { role: "user", content: text },
      ],
      temperature: 0,
      max_tokens: 50,
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const cleaned = raw
      .replace(/```json?/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { flagged: boolean };
    return parsed.flagged === true;
  } catch (err) {
    console.warn("[OpenRouter] AI Moderation failed:", err);
    return false;
  }
}

export async function discoverWords(
  text: string,
  config: BotConfig,
): Promise<WordDiscovery> {
  try {
    const client = createClient(config);
    const completion = await client.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a word analysis AI. Given a message, identify any new offensive/bad words and any new harmless words. Respond ONLY with valid JSON matching this schema exactly, no markdown:\n" +
            JSON.stringify(WordDiscoverySchema.shape, null, 2),
        },
        { role: "user", content: text },
      ],
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const cleaned = raw
      .replace(/```json?/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    const result = WordDiscoverySchema.parse(parsed);
    const normalise = (w: string) =>
      w
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, "")
        .trim();
    return {
      newBadWords: [
        ...new Set(result.newBadWords.map(normalise).filter(Boolean)),
      ],
      newWhiteListWords: [
        ...new Set(result.newWhiteListWords.map(normalise).filter(Boolean)),
      ],
    };
  } catch (err) {
    console.warn("[OpenRouter] Word discovery failed:", err);
    return { newBadWords: [], newWhiteListWords: [] };
  }
}
