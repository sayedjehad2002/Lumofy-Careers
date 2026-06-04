import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";
import { chatCompletion } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = getClientIp(req);
    const rl = isRateLimited(`survey-ai-insights:${ip}`, { maxRequests: 30, windowMs: 3600_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const body = await req.json();
    const { responses: textResponses, question_text, survey_title } = body;
    const sessionToken = body.sessionToken || req.headers.get("x-session-token");

    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    if (!textResponses || !Array.isArray(textResponses) || textResponses.length === 0) {
      return new Response(JSON.stringify({ error: "No text responses provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are an HR analytics expert. Analyze these open-ended survey responses and provide structured insights.

Survey: "${survey_title || 'HR Survey'}"
Question: "${question_text || 'Open-ended question'}"

Responses (${textResponses.length} total):
${textResponses.slice(0, 100).map((r: string, i: number) => `${i + 1}. ${r}`).join("\n")}

Provide a JSON response with this exact structure:
{
  "themes": [
    {"theme": "Theme name", "count": <number of responses mentioning this>, "sentiment": "positive|neutral|concern|urgent"}
  ],
  "summary": "2-3 sentence executive summary of the key findings",
  "positive_highlights": ["Key positive finding 1", "Key positive finding 2"],
  "concerns": ["Key concern 1", "Key concern 2"],
  "action_items": ["Recommended action 1", "Recommended action 2"]
}

Be concise and actionable. Focus on HR-relevant insights. Return ONLY valid JSON.`;

    const response = await chatCompletion({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are an HR analytics AI. Always return valid JSON only, no markdown formatting." },
        { role: "user", content: prompt },
      ],
      hasImages: false,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    // Parse the JSON from the response
    let insights;
    try {
      // Remove any markdown code block formatting
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      insights = JSON.parse(cleanContent);
    } catch {
      insights = {
        themes: [],
        summary: content.slice(0, 500),
        positive_highlights: [],
        concerns: [],
        action_items: [],
      };
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("survey-ai-insights error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
