import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { chatCompletion } from "../_shared/ai.ts";

/**
 * Auto-analyze a newly submitted applicant's CV against the job.
 * Called fire-and-forget after application submission — no admin session required.
 * Uses an internal secret key for authentication instead.
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { applicantId } = await req.json();
    if (!applicantId) {
      return new Response(JSON.stringify({ error: "Missing applicantId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch applicant
    const { data: applicant, error: appError } = await supabase
      .from("applicants")
      .select("*")
      .eq("id", applicantId)
      .single();

    if (appError || !applicant) {
      console.error("Applicant not found:", appError);
      return new Response(JSON.stringify({ error: "Applicant not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if already analyzed
    if (applicant.ai_analysis) {
      return new Response(JSON.stringify({ skipped: true, reason: "Already analyzed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", applicant.job_id)
      .single();

    if (jobError || !job) {
      console.error("Job not found:", jobError);
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI calls now route through the shared OpenRouter helper (../_shared/ai.ts).

    const weights = job.ai_scoring_weights || { skills: 35, tools: 25, experience: 20, industry: 10, education: 5, stability: 5 };

    // Download CV
    let cvBase64: string | null = null;
    let cvMimeType = "application/pdf";
    let cvParsingStatus: "success" | "partial" | "failed" = "failed";

    if (applicant.cv_storage_path) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("cvs")
          .download(applicant.cv_storage_path);

        if (!downloadError && fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          cvBase64 = btoa(binary);

          const ext = applicant.cv_storage_path.split(".").pop()?.toLowerCase();
          if (ext === "doc") cvMimeType = "application/msword";
          else if (ext === "docx") cvMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

          cvParsingStatus = "success";
        } else {
          console.error("CV download error:", downloadError);
        }
      } catch (e) {
        console.error("CV download exception:", e);
      }
    }

    const systemPrompt = `You are a STRICT, calibrated HR AI analyst for Lumofy. You produce structured, evidence-based candidate evaluations with WEIGHTED SCORING.

CRITICAL SCORING RULES:
- Be STRICT and CALIBRATED. Do NOT inflate scores.
- Average candidates should realistically score 55-75. Only exceptional candidates should score above 85.
- Penalize HEAVILY for: missing required skills, irrelevant industries, lack of required tools, excessive job hopping (3+ jobs under 1 year), unclear role progression.
- Do NOT default high. A candidate missing 3+ required skills should score below 50.
- Each dimension score must be 0-100, independently assessed.

WEIGHTED SCORING MODEL (weights provided by HR):
- Skills Match: ${weights.skills}% weight
- Tools & Technologies: ${weights.tools}% weight  
- Relevant Experience: ${weights.experience}% weight
- Industry Alignment: ${weights.industry}% weight
- Education Relevance: ${weights.education}% weight
- Career Stability: ${weights.stability}% weight

Overall fitScore = weighted average of all dimensions.

RANKING TIERS:
- 85-100: Top Match
- 70-84: Strong Match
- 50-69: Moderate Match
- Below 50: Weak Match

RED FLAGS to detect:
- Missing Required Skills (missing 2+ required skills)
- Underqualified (experience significantly below required)
- Overqualified Risk (seniority far exceeds role level)
- Career Instability (3+ jobs under 1 year each)
- Tool Gaps (missing critical tools/technologies)
- Industry Mismatch (no relevant industry experience)

EVIDENCE RULES:
- ONLY analyze real content from the uploaded CV and application data.
- Do NOT generate assumptions, fictional experience, or imaginary qualifications.
- All findings must reference actual CV content with evidence citations.
- Focus ONLY on job-relevant qualifications.
- Do NOT consider age, gender, nationality, religion, or any protected traits.

You MUST respond with a valid JSON object (no markdown, no code blocks) using this exact structure:
{
  "fitScore": <number 0-100 - STRICT weighted average>,
  "fitLevel": "<Strong Fit|Moderate Fit|Low Fit>",
  "summary": "<1-2 sentence evidence-based summary>",
  "strengths": ["<evidence-based strength>"],
  "gaps": ["<evidence-based gap>"],
  "interviewQuestions": ["<targeted question>"],
  "confidence": "<High|Medium|Low>",
  "feedback": "<2-3 sentence feedback for HR>",
  "cvParsingStatus": "<success|partial|failed>",
  "skillsAlignment": [
    {"requiredSkill": "<skill>", "evidence": "<Yes|Partial|No>", "detail": "<CV evidence>"}
  ],
  "skillsCoveragePercent": <number 0-100>,
  "detectedSkills": ["<skill found in CV>"],
  "missingSkills": ["<required skill not found>"],
  "experienceVerification": {
    "totalYears": "<from CV>",
    "seniorityAlignment": "<assessment>",
    "industryRelevance": "<assessment>"
  },
  "riskIndicators": ["<only if supported by CV data>"],
  "organizationalFit": "<assessment>",
  "growthPotential": "<assessment>",
  "evidenceCitations": ["<direct CV quotes>"],
  "recommendation": "<Fast-Track to Interview|Proceed to Next Stage|Hold for Review|Not Recommended>",
  "recommendationJustification": "<evidence-tied justification>",
  "scoreBreakdown": {
    "skillsMatch": <0-100>,
    "toolsMatch": <0-100>,
    "relevantExperience": <0-100>,
    "industryAlignment": <0-100>,
    "educationRelevance": <0-100>,
    "careerStability": <0-100>
  },
  "rankingTier": "<Top Match|Strong Match|Moderate Match|Weak Match>",
  "redFlags": ["<Missing Required Skills|Underqualified|Overqualified Risk|Career Instability|Tool Gaps|Industry Mismatch>"],
  "interviewSuccessProbability": <0-100>,
  "offerAcceptanceProbability": <0-100>,
  "earlyTurnoverRisk": <0-100>,
  "growthPotentialScore": <0-100>
}`;

    const responsibilities = (job.responsibilities as string[]) || [];
    const requirements = (job.requirements as string[]) || [];

    const userPrompt = `Analyze this candidate for the position:

JOB: ${job.title}
DESCRIPTION: ${job.description || "Not provided"}
RESPONSIBILITIES: ${responsibilities.join("; ") || "Not provided"}
REQUIREMENTS: ${requirements.join("; ") || "Not provided"}

SCORING WEIGHTS: Skills=${weights.skills}%, Tools=${weights.tools}%, Experience=${weights.experience}%, Industry=${weights.industry}%, Education=${weights.education}%, Stability=${weights.stability}%

CANDIDATE: ${applicant.full_name}
CV FILE NAME: ${applicant.cv_file_name}
SCREENING ANSWERS: ${JSON.stringify(applicant.screening_answers || {})}

${cvParsingStatus === "failed" ? "WARNING: CV file could not be downloaded. Base your analysis ONLY on screening answers and mark cvParsingStatus as 'failed'." : "Analyze the attached CV document thoroughly. Be STRICT - do not inflate scores."}

Provide your structured evidence-based analysis as JSON.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (cvBase64 && cvParsingStatus === "success") {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: `data:${cvMimeType};base64,${cvBase64}` } },
        ],
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const response = await chatCompletion({
      model: "google/gemini-3-flash-preview",
      messages,
      hasImages: cvBase64 != null && cvParsingStatus === "success",
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      // Non-critical — don't fail the submission
      return new Response(JSON.stringify({ error: "AI analysis failed", status: response.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let analysis;
    try {
      let cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      }
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI analysis" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    analysis.cvParsingStatus = cvParsingStatus;
    analysis.autoAnalyzed = true;
    analysis.analyzedAt = new Date().toISOString();

    // Ensure rankingTier
    if (!analysis.rankingTier) {
      if (analysis.fitScore >= 85) analysis.rankingTier = "Top Match";
      else if (analysis.fitScore >= 70) analysis.rankingTier = "Strong Match";
      else if (analysis.fitScore >= 50) analysis.rankingTier = "Moderate Match";
      else analysis.rankingTier = "Weak Match";
    }

    // Save analysis to applicant record
    const { error: updateError } = await supabase
      .from("applicants")
      .update({ ai_analysis: analysis })
      .eq("id", applicantId);

    if (updateError) {
      console.error("Failed to save AI analysis:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save analysis" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Auto-analyzed applicant ${applicantId}: fitScore=${analysis.fitScore}, tier=${analysis.rankingTier}`);

    return new Response(JSON.stringify({ success: true, fitScore: analysis.fitScore, rankingTier: analysis.rankingTier }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-analyze-applicant error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
