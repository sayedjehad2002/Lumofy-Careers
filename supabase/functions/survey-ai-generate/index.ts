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
    const rl = isRateLimited(`survey-ai-gen:${ip}`, { maxRequests: 20, windowMs: 3600_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const body = await req.json();
    const { input, tone, length, audience } = body;
    const sessionToken = body.sessionToken || req.headers.get("x-session-token");

    // Require admin session for AI generation
    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    if (!input || typeof input !== "string" || input.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Please provide at least 10 characters of survey content or description." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toneInstruction = tone ? `Use a ${tone} tone throughout.` : "Use a professional tone.";
    const lengthInstruction = length === "short" ? "Keep the survey concise (5-8 questions max)." : length === "detailed" ? "Create a thorough survey (15-25 questions)." : "Create a balanced survey (8-15 questions).";
    const audienceInstruction = audience ? `Optimize for: ${audience}.` : "";

    const prompt = `You are an expert HR survey architect. Analyze the following input and generate a structured, high-quality HR survey.

INPUT:
"""
${input.slice(0, 5000)}
"""

INSTRUCTIONS:
- Detect the survey purpose, audience, and category from the content
- Split content into logical sections with section dividers
- Choose the BEST question type for each question based on HR survey best practices
- ${toneInstruction}
- ${lengthInstruction}
- ${audienceInstruction}

QUESTION TYPE SELECTION RULES:
- "short_text": brief factual answers (name, department, role)
- "long_text": open feedback, comments, suggestions
- "single_choice": pick one from options
- "multiple_choice": pick many from options
- "dropdown": pick one from a long list
- "rating": numeric score (1-5 or 1-10)
- "likert": agreement scale (Strongly Disagree to Strongly Agree) — use for perception/sentiment statements
- "nps": Net Promoter Score 0-10 — ONLY for "how likely to recommend" questions
- "yes_no": binary practical questions
- "date": date input
- "section_divider": marks a new section (question_text = section title, help_text = section description)
- "statement": informational text, not a question

CRITICAL RULES:
- Do NOT make everything short_text or long_text
- Prefer likert for agreement statements
- Prefer rating for satisfaction/quality scores
- Use yes_no for binary questions, NOT true/false
- Use section_divider to organize into logical groups
- Add a statement at the start as an introduction if appropriate
- Mark sensitive/opinion questions as not required
- Mark identity/factual questions as required

Return ONLY valid JSON with this structure:
{
  "title": "Survey title",
  "description": "Brief survey description",
  "category": "engagement|enps|candidate_experience|onboarding|exit_interview|learning_feedback|pulse|custom",
  "audience_type": "internal|candidates|public|private",
  "is_anonymous": false,
  "estimated_time_minutes": number,
  "sections_count": number,
  "questions": [
    {
      "type": "question_type",
      "question_text": "The question or section title",
      "help_text": "Optional help text or null",
      "placeholder": "Optional placeholder or null",
      "is_required": true/false,
      "options": ["Option 1", "Option 2"] or [],
      "settings": {},
      "confidence": "high|medium|needs_review",
      "ai_reasoning": "Brief reason for choosing this type"
    }
  ],
  "ai_recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ]
}`;

    const response = await chatCompletion({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are an HR survey architect AI. Return ONLY valid JSON. No markdown, no code blocks, no extra text." },
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

    let result;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanContent);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ survey: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("survey-ai-generate error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
