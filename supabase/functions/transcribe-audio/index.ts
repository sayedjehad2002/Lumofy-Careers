import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";
import { chatCompletion } from "../_shared/ai.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    console.error("transcribe-audio error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", transcript: "" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
