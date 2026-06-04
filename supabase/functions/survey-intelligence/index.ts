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
    const rl = isRateLimited(`survey-intel:${ip}`, { maxRequests: 20, windowMs: 3600_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    // AI calls now route through the shared OpenRouter helper (see ../_shared/ai.ts)

    const body = await req.json();
    const { responses, questions, survey_title, is_anonymous } = body;
    const sessionToken = body.sessionToken || req.headers.get("x-session-token");

    // Require admin session
    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    if (!responses || !questions || !Array.isArray(responses) || !Array.isArray(questions)) {
      return new Response(JSON.stringify({ error: "Missing responses or questions" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a comprehensive data summary for the AI
    const activeQuestions = questions.filter((q: any) => q.type !== "section_divider" && q.type !== "statement");
    
    // Build per-respondent summaries
    const respondentSummaries = responses.map((r: any, idx: number) => {
      const name = is_anonymous ? `Respondent ${idx + 1}` : (r.respondent_name || `Respondent ${idx + 1}`);
      const dept = r.respondent_department || "Unspecified";
      const answers = activeQuestions.map((q: any) => {
        const ans = (r.answers || []).find((a: any) => a.question_id === q.id);
        let answerText = "No answer";
        if (ans?.answer_text) answerText = ans.answer_text;
        else if (ans?.answer_json) {
          if (Array.isArray(ans.answer_json)) answerText = ans.answer_json.join(", ");
          else if (typeof ans.answer_json === "object") answerText = Object.entries(ans.answer_json).map(([k, v]: [string, any]) => `${k}: ${v}`).join(", ");
          else answerText = String(ans.answer_json);
        }
        return `  Q: ${q.question_text} (${q.type}) → A: ${answerText}`;
      }).join("\n");
      return `--- ${name} | Department: ${dept} ---\n${answers}`;
    }).join("\n\n");

    // Build question summary
    const questionList = activeQuestions.map((q: any, i: number) => 
      `${i+1}. "${q.question_text}" (Type: ${q.type}${q.options?.length ? `, Options: ${q.options.join(", ")}` : ""})`
    ).join("\n");

    const prompt = `You are an expert HR analytics AI for Lumofy, an enterprise HR platform. Perform a comprehensive intelligence analysis on this survey.

Survey: "${survey_title || 'HR Survey'}"
Total Responses: ${responses.length}
Anonymous: ${is_anonymous ? "Yes" : "No"}

QUESTIONS:
${questionList}

ALL RESPONDENT DATA:
${respondentSummaries}

Analyze ALL dimensions and return a JSON object with this EXACT structure:

{
  "overall": {
    "engagement_score": <number 1-10>,
    "sentiment_distribution": { "positive": <count>, "neutral": <count>, "negative": <count> },
    "participation_quality": "high" | "medium" | "low",
    "executive_summary": "<3-4 sentence executive summary>",
    "key_strengths": ["<strength1>", "<strength2>", "<strength3>"],
    "major_concerns": ["<concern1>", "<concern2>"],
    "positive_negative_ratio": "<e.g. 3:1>"
  },
  "question_insights": [
    {
      "question_text": "<question>",
      "average_score": <number or null if not numeric>,
      "sentiment": "positive" | "neutral" | "negative",
      "key_finding": "<one sentence insight>"
    }
  ],
  "department_insights": [
    {
      "department": "<name>",
      "avg_engagement": <number 1-10>,
      "response_count": <number>,
      "sentiment": "positive" | "neutral" | "negative",
      "key_concern": "<main issue or 'None'>",
      "key_strength": "<main strength>"
    }
  ],
  "employee_risk_signals": [
    {
      "name": "<respondent name or 'Respondent X' if anonymous>",
      "department": "<dept>",
      "risk_level": "green" | "yellow" | "red",
      "engagement_score": <number 1-10>,
      "explanation": "<why this risk level>",
      "key_patterns": ["<pattern1>", "<pattern2>"]
    }
  ],
  "sentiment_analysis": {
    "overall_sentiment": "positive" | "neutral" | "negative" | "mixed",
    "themes": [
      {
        "theme": "<theme name>",
        "sentiment": "positive" | "neutral" | "negative",
        "frequency": <number of mentions>,
        "example_quotes": ["<quote1>"]
      }
    ],
    "word_cloud_data": [
      { "text": "<word>", "value": <frequency> }
    ]
  },
  "positive_signals": [
    {
      "name": "<name>",
      "department": "<dept>",
      "insight": "<why positive>",
      "engagement_score": <number 1-10>
    }
  ],
  "ai_recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "action": "<recommended action>",
      "rationale": "<why this matters>",
      "target_group": "<who this applies to>"
    }
  ],
  "risk_summary": {
    "total_green": <count>,
    "total_yellow": <count>,
    "total_red": <count>,
    "departments_at_risk": ["<dept1>"],
    "top_risk_factors": ["<factor1>", "<factor2>"]
  }
}

${is_anonymous ? "IMPORTANT: Since this is an anonymous survey, do NOT include individual employee names. Use 'Respondent 1', 'Respondent 2' etc. Focus on aggregate insights." : "Include individual employee analysis with real names."}

Return ONLY valid JSON. No markdown, no code blocks.`;

    const response = await chatCompletion({
      model: "google/gemini-2.5-flash",
      max_tokens: 8192,
      messages: [
        { role: "system", content: "You are Lumofy's AI Survey Intelligence engine. You analyze HR survey data to produce structured, actionable insights. Always return valid JSON only, no markdown formatting. Keep responses concise to avoid truncation." },
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

    let intelligence;
    try {
      let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      // Find JSON boundaries
      const jsonStart = cleanContent.search(/[\{\[]/);
      const jsonEnd = cleanContent.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
      }
      // Fix common truncation issues
      cleanContent = cleanContent
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\x00-\x1F\x7F]/g, '');
      // Balance braces/brackets if truncated
      const openBraces = (cleanContent.match(/{/g) || []).length;
      const closeBraces = (cleanContent.match(/}/g) || []).length;
      const openBrackets = (cleanContent.match(/\[/g) || []).length;
      const closeBrackets = (cleanContent.match(/]/g) || []).length;
      for (let i = 0; i < openBrackets - closeBrackets; i++) cleanContent += ']';
      for (let i = 0; i < openBraces - closeBraces; i++) cleanContent += '}';
      intelligence = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse AI response:", content.slice(0, 500));
      intelligence = { error: "Failed to parse AI analysis", raw: content.slice(0, 1000) };
    }

    return new Response(JSON.stringify({ intelligence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("survey-intelligence error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
