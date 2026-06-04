// Shared OpenRouter chat-completions helper for all AI edge functions.
//
// Migrated off the Lovable AI Gateway. OpenRouter is OpenAI-compatible, so the
// request/response shapes match what every caller already builds and parses.
// Each caller keeps its own response handling (streaming, tool-calls, JSON
// parsing, 429/402 branches) — this helper only centralizes the endpoint, auth,
// attribution headers, and the model-name mapping.

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";

// OpenRouter attribution headers (shown on openrouter.ai dashboards). Optional.
const HTTP_REFERER = "https://careers.lumofy.ai";
const X_TITLE = "Lumofy Careers";

export function getOpenRouterKey(): string {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");
  return key;
}

// Concrete OpenRouter model IDs. The legacy Lovable gateway used names like
// `google/gemini-3-flash-preview` and `openai/gpt-5.2` that may not exist on
// OpenRouter. VERIFY these against https://openrouter.ai/models and adjust here —
// this map is the single source of truth for model selection across all functions.
// All tiers use a free OpenRouter model (zero cost). Gemma 4 is multimodal, so it
// covers both text and vision (CV/PDF) use cases. Swap to paid tiers here later if
// rate limits or quality become an issue — this map is the single source of truth.
export const MODELS = {
  visionStrong: "google/gemma-4-31b-it:free",   // multimodal (copilot vision)
  vision: "google/gemma-4-31b-it:free",         // multimodal (CV / PDF parsing, audio)
  textFast: "google/gemma-4-31b-it:free",       // text default
  textLite: "google/gemma-4-31b-it:free",       // lightweight text (survey-ai-improve)
  textStrong: "google/gemma-4-31b-it:free",     // strong text (copilot text fallback)
} as const;

// Translate a legacy gateway model name to a real OpenRouter model ID.
// `hasImages` lets the shared "flash-preview" name resolve to a vision vs text tier.
export function mapModel(legacy: string, hasImages = false): string {
  switch (legacy) {
    case "google/gemini-3-flash-preview":
      return hasImages ? MODELS.vision : MODELS.textFast;
    case "google/gemini-2.5-pro":
      return MODELS.visionStrong;
    case "google/gemini-2.5-flash":
      return MODELS.textFast;
    case "google/gemini-2.5-flash-lite":
      return MODELS.textLite;
    case "openai/gpt-5.2":
      return MODELS.textStrong;
    default:
      return legacy; // assume already a valid OpenRouter id
  }
}

export interface ChatOpts {
  model: string;             // legacy or real model name; translated via mapModel
  messages: unknown[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  hasImages?: boolean;       // drives vision-vs-text model selection in mapModel
}

// POST to OpenRouter's OpenAI-compatible chat-completions endpoint.
// Returns the raw Response so callers keep their existing streaming / parsing /
// status-code handling unchanged.
export async function chatCompletion(opts: ChatOpts): Promise<Response> {
  const body: Record<string, unknown> = {
    model: mapModel(opts.model, opts.hasImages),
    messages: opts.messages,
  };
  if (opts.stream) body.stream = true;
  if (opts.temperature != null) body.temperature = opts.temperature;
  if (opts.max_tokens != null) body.max_tokens = opts.max_tokens;
  if (opts.tools) body.tools = opts.tools;
  if (opts.tool_choice) body.tool_choice = opts.tool_choice;

  return await fetch(OPENROUTER_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenRouterKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": HTTP_REFERER,
      "X-Title": X_TITLE,
    },
    body: JSON.stringify(body),
  });
}
