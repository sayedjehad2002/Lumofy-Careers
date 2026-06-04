import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";
import { chatCompletion } from "../_shared/ai.ts";

const TAXONOMY = {
  "Human Resources": ["HR Manager", "HR Business Partner", "Recruiter", "Talent Acquisition Specialist", "HR Coordinator", "Compensation & Benefits Analyst", "Learning & Development Specialist"],
  "Customer Success": ["Customer Success Manager", "Senior CSM", "Onboarding Specialist", "Customer Support Lead", "Client Relations Manager"],
  "Sales": ["Account Executive", "Account Manager", "Sales Engineer", "Sales Development Rep", "Regional Sales Manager", "VP Sales"],
  "Product": ["Product Manager", "Senior Product Manager", "Product Owner", "Product Analyst", "UX Researcher"],
  "Engineering": ["Full Stack Developer", "Backend Engineer", "Frontend Engineer", "Mobile Developer", "DevOps Engineer", "QA Engineer", "Engineering Manager", "Data Engineer", "Machine Learning Engineer"],
  "Marketing": ["Marketing Manager", "Digital Marketing Specialist", "Content Strategist", "Brand Manager", "SEO Specialist", "Growth Marketing Manager"],
  "Finance": ["Financial Analyst", "Accountant", "Finance Manager", "Controller", "Treasury Analyst", "Auditor"],
  "Operations": ["Operations Manager", "Supply Chain Analyst", "Project Manager", "Business Analyst", "Process Improvement Specialist", "Logistics Coordinator"],
  "Design": ["UI/UX Designer", "Graphic Designer", "Product Designer", "Visual Designer", "Design Lead"],
};

const DEPARTMENTS = Object.keys(TAXONOMY);

function normalizeConfidence(value: unknown): "High" | "Medium" | "Low" {
  const v = String(value || "").toLowerCase();
  if (v === "high") return "High";
  if (v === "medium" || v === "med") return "Medium";
  return "Low";
}

function pickRoleForDepartment(dept: string): string | null {
  const roles = TAXONOMY[dept as keyof typeof TAXONOMY];
  return roles?.[0] || null;
}

function pickFallbackDepartment(primary?: string | null): string {
  const fallback = ["Operations", "Engineering", "Sales", "Customer Success", "Human Resources"];
  for (const d of fallback) {
    if (d !== primary && DEPARTMENTS.includes(d)) return d;
  }
  return DEPARTMENTS.find((d) => d !== primary) || DEPARTMENTS[0];
}

function extractClassification(rawContent: string): any {
  let cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1) cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  const parsed = JSON.parse(cleaned);

  if (Array.isArray(parsed?.suggestions) && parsed.suggestions.length > 0) {
    const [first, second] = parsed.suggestions;
    return {
      suggested_department: first?.department || first?.suggested_department || null,
      suggested_job_title: first?.job_title || first?.suggested_job_title || null,
      confidence: first?.confidence || "Low",
      suggested_department_2: second?.department || second?.suggested_department || null,
      suggested_job_title_2: second?.job_title || second?.suggested_job_title || null,
      confidence_2: second?.confidence || "Low",
      reasoning: parsed.reasoning || null,
      evidence: parsed.evidence || [],
    };
  }

  return parsed;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = getClientIp(req);
    const rl = isRateLimited(`cv-lib-classify:${ip}`, { maxRequests: 30, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { candidateId, sessionToken } = await req.json();

    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;
    const supabase = auth.supabase;

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

    const taxonomyText = Object.entries(TAXONOMY)
      .map(([dept, roles]) => `${dept}: ${roles.join(", ")}`)
      .join("\n");

    const candidateInfo = `
Name: ${candidate.name || "Unknown"}
Skills: ${(candidate.skills || []).join(", ") || "Not extracted"}
Industries: ${(candidate.industries || []).join(", ") || "Not extracted"}
Years Experience: ${candidate.years_experience || "Unknown"}
Roles Summary: ${candidate.roles_summary || "Not available"}
Extracted Text: ${candidate.extracted_text || "Not available"}
    `.trim();

    const systemPrompt = `You are an HR classification AI. Classify the candidate into the TOP 2 most suitable departments and job titles from the taxonomy below. The first match should be the strongest fit, the second should be the next best alternative.

TAXONOMY:
${taxonomyText}

RULES:
- Use ONLY information from the candidate data provided.
- Select the TWO best department + job title matches, ranked by fit.
- If only one clear match exists, still provide a second best guess but set its confidence to "Low".
- For each match, assign confidence: "High", "Medium", or "Low".
- Provide 3 evidence bullets referencing specific CV content for the primary match.
- Do NOT fabricate skills or experience.

Respond with valid JSON only (no markdown):
{
  "suggested_department": "<best department from taxonomy>",
  "suggested_job_title": "<best job title from taxonomy>",
  "confidence": "<High|Medium|Low>",
  "suggested_department_2": "<second best department from taxonomy>",
  "suggested_job_title_2": "<second best job title from taxonomy>",
  "confidence_2": "<High|Medium|Low>",
  "reasoning": "<1-2 sentence internal reasoning covering both suggestions>",
  "evidence": ["<evidence point 1>", "<evidence point 2>", "<evidence point 3>"]
}`;

    const response = await chatCompletion({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Classify this candidate:\n\n${candidateInfo}` },
      ],
      hasImages: false,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let classification: any;
    try {
      classification = extractClassification(content || "{}");
    } catch {
      console.error("Classification parse failed:", content);
      throw new Error("Failed to parse classification");
    }

    const primaryDept = DEPARTMENTS.includes(classification.suggested_department)
      ? classification.suggested_department
      : pickFallbackDepartment(null);

    const primaryRole = TAXONOMY[primaryDept as keyof typeof TAXONOMY]?.includes(classification.suggested_job_title)
      ? classification.suggested_job_title
      : pickRoleForDepartment(primaryDept);

    const secondaryDeptRaw = DEPARTMENTS.includes(classification.suggested_department_2)
      ? classification.suggested_department_2
      : pickFallbackDepartment(primaryDept);

    const secondaryDept = secondaryDeptRaw === primaryDept
      ? pickFallbackDepartment(primaryDept)
      : secondaryDeptRaw;

    const secondaryRole = TAXONOMY[secondaryDept as keyof typeof TAXONOMY]?.includes(classification.suggested_job_title_2)
      ? classification.suggested_job_title_2
      : pickRoleForDepartment(secondaryDept);

    const finalClassification = {
      suggested_department: primaryDept || null,
      suggested_job_title: primaryRole || null,
      confidence: normalizeConfidence(classification.confidence),
      suggested_department_2: secondaryDept || null,
      suggested_job_title_2: secondaryRole || null,
      confidence_2: normalizeConfidence(classification.confidence_2),
      reasoning: classification.reasoning || null,
      evidence: Array.isArray(classification.evidence) ? classification.evidence.slice(0, 3) : [],
    };

    const { error: updateErr } = await supabase
      .from("cv_library_candidates")
      .update({
        suggested_department: finalClassification.suggested_department,
        suggested_job_title: finalClassification.suggested_job_title,
        classification_confidence: finalClassification.confidence,
        classification_reasoning: finalClassification.reasoning,
        classification_evidence: finalClassification.evidence,
        suggested_department_2: finalClassification.suggested_department_2,
        suggested_job_title_2: finalClassification.suggested_job_title_2,
        classification_confidence_2: finalClassification.confidence_2,
      })
      .eq("id", candidateId);

    if (updateErr) {
      console.error("Update error:", updateErr);
      throw new Error("Failed to save classification");
    }

    return new Response(JSON.stringify({ success: true, classification: finalClassification }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cv-library-classify error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
