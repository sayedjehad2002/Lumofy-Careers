import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";
import { chatCompletion } from "../_shared/ai.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// Audio uploads are base64-encoded into the AI request, so bound the raw size
// before encoding. Short screening-answer clips are tiny; 15MB is generous.
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

// Accepted audio MIME types. The model is told the format is "webm"; browsers
// usually record webm/opus, but we accept the common voice-clip types and reject
// anything else (e.g. a disguised non-audio upload) before we encode it.
const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
];

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const ip = getClientIp(req);
    const rl = isRateLimited(`transcribe:${ip}`, { maxRequests: 20, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(cors, rl.retryAfterMs);

    // AI calls go through the shared OpenRouter helper (../_shared/ai.ts).

    const formData = await req.formData();
    const sessionToken = formData.get("sessionToken") as string | null || req.headers.get("x-session-token");
    const auth = await validateSession(sessionToken, cors);
    if (!auth.valid) return auth.response;

    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Validate size + MIME type BEFORE base64-encoding (fix #6).
    if (audioFile.size === 0) {
      return new Response(JSON.stringify({ error: "Audio file is empty", transcript: "" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return new Response(JSON.stringify({ error: "Audio file is too large", transcript: "" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    // file.type can carry a codec suffix, e.g. "audio/webm;codecs=opus".
    const baseType = (audioFile.type || "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_AUDIO_TYPES.includes(baseType)) {
      return new Response(JSON.stringify({ error: "Unsupported audio type", transcript: "" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = base64Encode(audioBuffer);

    // Use Gemini Flash for fast transcription
    const response = await chatCompletion({
      model: "google/gemini-2.5-flash",
      hasImages: false,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe the following audio exactly as spoken. Return ONLY the transcribed text, nothing else. If the audio is unclear or empty, return an empty string.",
            },
            {
              type: "input_audio",
              input_audio: {
                data: audioBase64,
                format: "webm",
              },
            },
          ],
        },
      ],
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Transcription error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Transcription failed", transcript: "" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const transcript = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    // ERROR HYGIENE (fix #9): log detail, return a generic message.
    console.error("transcribe-audio error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error", transcript: "" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
