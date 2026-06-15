import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";
import { chatCompletion, wrapUntrusted, UNTRUSTED_DATA_NOTE, currentDateLine, CHRONOLOGY_AND_IDENTITY_RULES } from "../_shared/ai.ts";

const TAXONOMY = {
  "Human Resources": ["HR Manager", "HR Business Partner", "Recruiter", "Talent Acquisition Specialist", "HR Coordinator", "Compensation & Benefits Analyst", "Learning & Development Specialist", "People Analytics Specialist", "Organizational Development Specialist"],
  "Customer Success": ["Customer Success Manager", "Senior CSM", "Customer Success Lead", "Onboarding Specialist", "Customer Support Lead", "Renewals Manager"],
  "Account Management": ["Account Manager", "Key Account Manager", "Strategic Account Manager", "Client Partner", "Relationship Manager"],
  "Client Services": ["Client Services Manager", "Client Relations Manager", "Engagement Manager", "Service Delivery Manager"],
  "Customer Experience": ["Customer Experience Manager", "CX Specialist", "Voice of Customer Analyst", "Customer Insights Manager"],
  "Sales": ["Account Executive", "Sales Development Rep", "Sales Engineer", "Regional Sales Manager", "VP Sales", "Business Development Manager"],
  "Revenue Operations": ["Revenue Operations Manager", "Sales Operations Analyst", "RevOps Analyst", "GTM Operations Manager"],
  "Product": ["Product Manager", "Senior Product Manager", "Product Owner", "Product Analyst", "UX Researcher"],
  "Engineering": ["Full Stack Developer", "Backend Engineer", "Frontend Engineer", "Mobile Developer", "DevOps Engineer", "QA Engineer", "Engineering Manager", "Data Engineer", "Machine Learning Engineer"],
  "Data & Analytics": ["Data Analyst", "Data Scientist", "Business Intelligence Analyst", "Analytics Engineer", "Quantitative Analyst"],
  "Marketing": ["Marketing Manager", "Digital Marketing Specialist", "Content Strategist", "Brand Manager", "SEO Specialist", "Growth Marketing Manager"],
  "Finance": ["Financial Analyst", "Accountant", "Finance Manager", "Controller", "Treasury Analyst", "Auditor"],
  "Operations": ["Operations Manager", "Supply Chain Analyst", "Business Analyst", "Process Improvement Specialist", "Logistics Coordinator"],
  "Project Management": ["Project Manager", "Program Manager", "Scrum Master", "PMO Analyst", "Delivery Manager"],
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
Name: ${wrapUntrusted("Name", candidate.name || "Unknown")}
Skills: ${wrapUntrusted("Skills", (candidate.skills || []).join(", ") || "Not extracted")}
Industries: ${wrapUntrusted("Industries", (candidate.industries || []).join(", ") || "Not extracted")}
Years Experience: ${wrapUntrusted("Years Experience", candidate.years_experience || "Unknown")}
Roles Summary: ${wrapUntrusted("Roles Summary", candidate.roles_summary || "Not available")}
Extracted Text: ${wrapUntrusted("Extracted Text", candidate.extracted_text || "Not available")}
    `.trim();

    const systemPrompt = `You are an expert executive recruiter and career analyst. Determine the candidate's TRUE professional identity from EVIDENCE of what they actually did — not from job titles, department names, or repeated keywords.

${UNTRUSTED_DATA_NOTE}

${currentDateLine()}

${CHRONOLOGY_AND_IDENTITY_RULES}

DEPARTMENTS — choose from EXACTLY this list (used for folder organization):
${DEPARTMENTS.join(", ")}

ROLE EXAMPLES per department (GUIDANCE ONLY — not exhaustive, NOT mandatory):
${taxonomyText}

HOW TO CLASSIFY — evidence over keywords:
- Infer the dominant career track from what the candidate DOES and OWNS: core responsibilities, daily activities, business/customer/revenue outcomes, KPIs owned, stakeholder interactions, strategic ownership, career progression, and measurable achievements.
- WEIGHT the evidence: core responsibilities 40%, measurable achievements 25%, stakeholder ownership 15%, career progression 10%, job titles 10%. Titles and keywords are the WEAKEST signals.
- When a job TITLE conflicts with the actual RESPONSIBILITIES, prioritize the responsibilities and outcomes. Example: an HR-titled person who mostly manages customer relationships, onboarding, retention, renewals, and account growth is Customer Success / Account Management — NOT Human Resources.
- Avoid ALL keyword bias: "HR"/"recruitment" appearing does not make them HR; "customer"/"client" does not make them Customer Success; "operations" does not make them Operations. Judge the whole career history.
- Classify as Human Resources ONLY if the MAJORITY of responsibilities are genuinely HR (recruitment, employee relations, HR operations, payroll, compensation & benefits, performance management, HR policy, workforce planning, internal employee lifecycle).
- The SECOND suggestion must be a genuinely DIFFERENT functional direction the candidate could be hired into — not a near-duplicate of the first.
- Output the MOST ACCURATE real job title (e.g. "Customer Success Manager", "I/O Psychologist", "Revenue Operations Analyst") — precise, even if not in the examples. Never force a generic preset.
- Calibrate confidence to evidence strength. Do NOT fabricate. Ignore age, gender, nationality, religion, or other protected traits.

Respond with valid JSON only (no markdown):
{
  "suggested_department": "<primary department, EXACTLY from the list>",
  "suggested_job_title": "<most accurate real job title>",
  "confidence": "<High|Medium|Low>",
  "suggested_department_2": "<second department from the list, a genuinely different function>",
  "suggested_job_title_2": "<most accurate real alternative job title>",
  "confidence_2": "<High|Medium|Low>",
  "reasoning": "<3-4 sentences: the candidate's TRUE professional identity and WHY, grounded in their actual responsibilities, outcomes, and stakeholder ownership. Explicitly note if a keyword-driven reading (e.g. HR) was rejected in favor of the evidence.>",
  "evidence": ["<specific responsibility/achievement/outcome backing the primary match>", "<evidence 2>", "<evidence 3>"]
}`;

    const response = await chatCompletion({
      model: "google/gemini-2.5-pro",
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

    // Keep the model's ACCURATE job title — only sanitize it (trim + length cap),
    // never overwrite it with a generic preset. Departments still snap to the 9
    // (the folder taxonomy); titles stay precise (e.g. "I/O Psychologist").
    const sanitizeTitle = (t: unknown, dept: string): string | null => {
      const s = typeof t === "string" ? t.trim() : "";
      return s && s.length <= 80 ? s : pickRoleForDepartment(dept);
    };

    const primaryDept = DEPARTMENTS.includes(classification.suggested_department)
      ? classification.suggested_department
      : pickFallbackDepartment(null);

    const secondaryDeptRaw = DEPARTMENTS.includes(classification.suggested_department_2)
      ? classification.suggested_department_2
      : pickFallbackDepartment(primaryDept);
    const secondaryDept = secondaryDeptRaw === primaryDept
      ? pickFallbackDepartment(primaryDept)
      : secondaryDeptRaw;

    const finalClassification = {
      suggested_department: primaryDept || null,
      suggested_job_title: sanitizeTitle(classification.suggested_job_title, primaryDept),
      confidence: normalizeConfidence(classification.confidence),
      suggested_department_2: secondaryDept || null,
      suggested_job_title_2: sanitizeTitle(classification.suggested_job_title_2, secondaryDept),
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
    // ERROR HYGIENE (fix #9): log detail, return a generic message.
    console.error("cv-library-classify error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
