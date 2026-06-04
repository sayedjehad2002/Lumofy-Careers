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
    const rl = isRateLimited(`survey-resp-analyze:${ip}`, { maxRequests: 30, windowMs: 3600_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const body = await req.json();
    const { answers, questions, survey_title, respondent_name, respondent_department } = body;
    const sessionToken = body.sessionToken || req.headers.get("x-session-token");

    // Require admin session
    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    if (!answers || !questions || !Array.isArray(answers) || !Array.isArray(questions)) {
      return new Response(JSON.stringify({ error: "Missing answers or questions" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const qaPairs = questions.map((q: any) => {
      const ans = answers.find((a: any) => a.question_id === q.id);
      let answerText = "No answer";
      if (ans?.answer_text) answerText = ans.answer_text;
      else if (ans?.answer_json) {
        if (Array.isArray(ans.answer_json)) answerText = ans.answer_json.join(", ");
        else if (typeof ans.answer_json === "object") answerText = Object.entries(ans.answer_json).map(([k, v]) => `${k}: ${v}`).join(", ");
        else answerText = String(ans.answer_json);
      }
      return `Q: ${q.question_text} (Type: ${q.type})\nA: ${answerText}`;
    }).join("\n\n");

    const prompt = `You are an expert HR analyst. Analyze this individual survey response and provide actionable insights.

Survey: "${survey_title || 'HR Survey'}"
Respondent: ${respondent_name || 'Anonymous'}${respondent_department ? ` | Department: ${respondent_department}` : ''}

Responses:
${qaPairs}

Provide a JSON response with this exact structure:
{
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "sentiment_score": <number 1-10, 10 = most positive>,
  "engagement_level": "high" | "medium" | "low",
  "key_themes": ["theme1", "theme2", "theme3"],
  "strengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "summary": "2-3 sentence summary of this respondent's overall feedback",
  "risk_flag": true | false,
  "risk_reason": "reason if risk_flag is true, else null",
  "recommended_actions": ["action1", "action2"],
  "engagement_indicators": {
    "enthusiasm": "high" | "medium" | "low",
    "detail_level": "high" | "medium" | "low",
    "constructiveness": "high" | "medium" | "low"
  }
}

Return ONLY valid JSON.`;

    const response = await chatCompletion({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are an HR analytics AI. Always return valid JSON only, no markdown." },
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
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
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

    let analysis;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch {
      analysis = { summary: content.slice(0, 500), sentiment: "neutral", sentiment_score: 5 };
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("survey-response-analyze error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
