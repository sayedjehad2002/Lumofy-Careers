import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";
import { chatCompletion } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = getClientIp(req);
    const rl = isRateLimited(`cv-lib-analyze:${ip}`, { maxRequests: 20, windowMs: 3600_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { candidateId, sessionToken } = await req.json();

    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;
    const supabase = auth.supabase;

    // Session already validated above

    const { data: candidate, error: fetchErr } = await supabase
      .from("cv_library_candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (fetchErr || !candidate) {
      return new Response(JSON.stringify({ error: "Candidate not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download CV file
    let cvBase64: string | null = null;
    let cvMimeType = "application/pdf";

    const { data: fileData, error: dlError } = await supabase.storage
      .from("cv-library")
      .download(candidate.resume_file_path);

    if (dlError || !fileData) {
      console.error("CV download error:", dlError);
      return new Response(JSON.stringify({ error: "Could not download CV file" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    cvBase64 = btoa(binary);

    const ext = candidate.resume_file_path.split(".").pop()?.toLowerCase();
    if (ext === "doc") cvMimeType = "application/msword";
    else if (ext === "docx") cvMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    // AI calls now route through the shared OpenRouter helper (../_shared/ai.ts).

    const suggestedDept = candidate.manual_department || candidate.suggested_department || "Unknown";
    const suggestedTitle = candidate.manual_job_title || candidate.suggested_job_title || "Unknown";

    const systemPrompt = `You are an expert HR AI analyst. You produce structured, evidence-based candidate evaluations from CVs.

CRITICAL RULES:
- Analyze ONLY real content from the uploaded CV.
- Do NOT generate assumptions, fictional experience, or imaginary qualifications.
- Do NOT assume skills not explicitly mentioned.
- If something is unclear, say: "Not explicitly mentioned in CV."
- If a skill is missing, say: "No direct evidence found in CV."
- All findings must reference actual CV content with evidence citations.
- Do NOT consider age, gender, nationality, religion, or any protected traits.

The candidate has been classified as: Department="${suggestedDept}", Role="${suggestedTitle}".
Evaluate them against this suggested role.

You MUST respond with a valid JSON object (no markdown, no code blocks):
{
  "fitScore": <number 0-100>,
  "fitLevel": "<Strong Fit|Moderate Fit|Low Fit>",
  "recommendation": "<Fast-Track to Interview|Proceed to Next Stage|Hold for Review|Not Recommended>",
  "recommendationJustification": "<evidence-tied justification>",
  "summary": "<2-3 sentence evidence-based candidate summary>",
  "strengths": ["<evidence-based strength with CV reference>"],
  "gaps": ["<evidence-based gap>"],
  "skillsAlignment": [
    {"requiredSkill": "<skill relevant to role>", "evidence": "<Yes|Partial|No>", "detail": "<specific CV evidence or 'Not mentioned in CV'>"}
  ],
  "skillsCoveragePercent": <number 0-100>,
  "detectedSkills": ["<skill explicitly found in CV>"],
  "missingSkills": ["<skill expected for role but not found>"],
  "experienceVerification": {
    "totalYears": "<calculated from CV dates or 'Unable to calculate'>",
    "seniorityAlignment": "<based on job titles found>",
    "industryRelevance": "<based on companies/sectors>"
  },
  "riskIndicators": ["<only if clearly supported, e.g. 'Frequent job changes: 3 positions under 1 year'>"],
  "organizationalFit": "<based on leadership/teamwork indicators or 'No explicit indicators found'>",
  "growthPotential": "<based on promotions/increasing responsibility or 'Limited evidence'>",
  "evidenceCitations": ["<direct quotes from CV, e.g. 'As stated: Managed 50+ hires annually'>"],
  "interviewQuestions": ["<targeted question based on CV findings>"],
  "feedback": "<3-4 sentence final evidence-based feedback for HR>"
}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: `Analyze this CV (${candidate.resume_file_name}) for the suggested role of ${suggestedTitle} in ${suggestedDept}. Provide a comprehensive evidence-based evaluation. Return ONLY a JSON object.` },
          { type: "image_url", image_url: { url: `data:${cvMimeType};base64,${cvBase64}` } },
        ],
      },
    ];

    const response = await chatCompletion({
      model: "google/gemini-3-flash-preview",
      messages,
      hasImages: true,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let analysis: any;
    try {
      let cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("Parse failed:", content);
      throw new Error("Failed to parse AI response");
    }

    analysis.analyzedAt = new Date().toISOString();

    // Save to database
    const { error: updateErr } = await supabase
      .from("cv_library_candidates")
      .update({ ai_analysis: analysis })
      .eq("id", candidateId);

    if (updateErr) {
      console.error("Update error:", updateErr);
      throw new Error("Failed to save analysis");
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cv-library-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
