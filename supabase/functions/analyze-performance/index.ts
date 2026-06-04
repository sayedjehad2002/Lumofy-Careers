import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { chatCompletion } from "../_shared/ai.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateSession } from "../_shared/validate-session.ts";

interface EmployeeData {
  employeeName: string;
  department: string;
  jobTitle: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  potentialScore: string | null;
  functionHeadNotes: string;
  performanceComments: string;
}

// Helper: Detect rating scale (1-5 or 1-10)
function detectRatingScale(employees: EmployeeData[]): number {
  const ratings = employees
    .map(e => e.managerRating)
    .filter((r): r is number => r !== null && !isNaN(r));
  if (ratings.length === 0) return 5;
  const max = Math.max(...ratings);
  return max > 5 ? 10 : 5;
}

// Helper: Normalize rating to 1-5 scale
function normalizeRating(rating: number | null, scale: number): number | null {
  if (rating === null) return null;
  if (scale === 10) return rating / 2;
  return rating;
}

// Helper: Classify performance level
function classifyPerformance(normalizedRating: number | null): "Low" | "Medium" | "High" | null {
  if (normalizedRating === null) return null;
  if (normalizedRating <= 2) return "Low";
  if (normalizedRating <= 3.5) return "Medium";
  return "High";
}

// Helper: Classify potential
function classifyPotential(potentialScore: string | null): "Low" | "Medium" | "High" {
  if (!potentialScore) return "Medium";
  const s = potentialScore.toLowerCase().trim();
  if (["low", "1"].includes(s)) return "Low";
  if (["high", "4", "5"].includes(s)) return "High";
  const num = parseFloat(s);
  if (!isNaN(num)) {
    if (num <= 2) return "Low";
    if (num >= 4) return "High";
  }
  return "Medium";
}

serve(async (req) => {
  // Use the shared CORS allowlist (no wildcard "*").
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit: 10 performance analyses per hour per IP
    const ip = getClientIp(req);
    const rl = isRateLimited(`analyze-perf:${ip}`, { maxRequests: 10, windowMs: 3_600_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    const { employees, sessionToken } = await req.json() as { employees: EmployeeData[]; sessionToken?: string };

    // SECURITY: this function processes employee PII. Require a valid admin
    // dashboard session, like the other dashboard AI functions.
    const auth = await validateSession(sessionToken, corsHeaders);
    if (!auth.valid) return auth.response;

    if (!employees || employees.length === 0) {
      return new Response(JSON.stringify({ error: "No employee data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI calls now route through the shared OpenRouter helper (see ../_shared/ai.ts)

    // Detect scale and normalize data
    const scale = detectRatingScale(employees);
    const normalizedEmployees = employees.map(e => ({
      ...e,
      normalizedManagerRating: normalizeRating(e.managerRating, scale),
      normalizedSelfRating: normalizeRating(e.selfRating, scale),
      performanceLevel: classifyPerformance(normalizeRating(e.managerRating, scale)),
      potentialLevel: classifyPotential(e.potentialScore),
    }));

    // Prepare summary statistics
    const departments = [...new Set(normalizedEmployees.map(e => e.department).filter(Boolean))];
    const totalEmployees = normalizedEmployees.length;
    
    const validRatings = normalizedEmployees.filter(e => e.normalizedManagerRating !== null);
    const avgManagerRating = validRatings.length > 0 
      ? validRatings.reduce((sum, e) => sum + (e.normalizedManagerRating || 0), 0) / validRatings.length 
      : 0;

    // Red flags: Low performers or major self-manager gap
    const redFlagEmployees = normalizedEmployees.filter(e => {
      if (e.performanceLevel === "Low") return true;
      if (e.normalizedSelfRating !== null && e.normalizedManagerRating !== null) {
        const gap = e.normalizedSelfRating - e.normalizedManagerRating;
        if (gap >= 1.5) return true; // Overconfident
      }
      return false;
    });

    // High potentials
    const highPotentialEmployees = normalizedEmployees.filter(e => e.potentialLevel === "High");
    const highPerformers = normalizedEmployees.filter(e => e.performanceLevel === "High");

    // 9-Box distribution
    const nineBoxDist: Record<string, number> = {};
    normalizedEmployees.forEach(e => {
      if (e.performanceLevel && e.potentialLevel) {
        const key = `${e.performanceLevel}-${e.potentialLevel}`;
        nineBoxDist[key] = (nineBoxDist[key] || 0) + 1;
      }
    });

    // Department summaries
    const deptSummaries = departments.map(dept => {
      const deptEmps = normalizedEmployees.filter(e => e.department === dept);
      const deptValidRatings = deptEmps.filter(e => e.normalizedManagerRating !== null);
      const deptAvgMgr = deptValidRatings.length > 0
        ? deptValidRatings.reduce((s, e) => s + (e.normalizedManagerRating || 0), 0) / deptValidRatings.length
        : 0;
      const deptValidSelf = deptEmps.filter(e => e.normalizedSelfRating !== null);
      const deptAvgSelf = deptValidSelf.length > 0
        ? deptValidSelf.reduce((s, e) => s + (e.normalizedSelfRating || 0), 0) / deptValidSelf.length
        : 0;
      
      const misaligned = deptEmps.filter(e => 
        e.normalizedSelfRating !== null && 
        e.normalizedManagerRating !== null && 
        Math.abs(e.normalizedSelfRating - e.normalizedManagerRating) >= 1
      ).length;
      
      const lowPerf = deptEmps.filter(e => e.performanceLevel === "Low").length;
      const highPerf = deptEmps.filter(e => e.performanceLevel === "High").length;
      const hiPo = deptEmps.filter(e => e.potentialLevel === "High").length;

      return {
        department: dept,
        count: deptEmps.length,
        avgSelfRating: deptAvgSelf.toFixed(2),
        avgManagerRating: deptAvgMgr.toFixed(2),
        misalignedCount: misaligned,
        lowPerformers: lowPerf,
        highPerformers: highPerf,
        highPotential: hiPo,
      };
    });

    // Build employee list for AI (limited to avoid token overflow)
    const employeeSummary = normalizedEmployees.slice(0, 120).map(e => ({
      name: e.employeeName,
      dept: e.department,
      role: e.jobTitle,
      manager: e.lineManager,
      selfRating: e.normalizedSelfRating?.toFixed(1) || null,
      managerRating: e.normalizedManagerRating?.toFixed(1) || null,
      potential: e.potentialScore,
      performanceLevel: e.performanceLevel,
      potentialLevel: e.potentialLevel,
      gap: e.normalizedSelfRating !== null && e.normalizedManagerRating !== null 
        ? (e.normalizedSelfRating - e.normalizedManagerRating).toFixed(1) 
        : null,
      notes: e.functionHeadNotes || e.performanceComments || null,
    }));

    const systemPrompt = `You are an expert People & Culture strategist and talent analyst for a B2B HR SaaS platform. You analyze performance review data and provide executive-level insights.

Your analysis must be:
- Evidence-based with specific data citations (names, departments, numbers)
- Strategic and actionable
- Written in professional HR language suitable for executive leadership
- Focused on organizational health, risk identification, and talent development

Data is normalized to a 1-5 scale. Performance levels: Low (≤2), Medium (2.1-3.5), High (>3.5).
Potential levels: Low, Medium, High based on leadership assessment.

CRITICAL RULES:
- 9-box placement uses manager ratings for performance axis
- Self-ratings are used ONLY for alignment/perception analysis
- High gap (self > manager by 1.5+) indicates overconfidence or perception risk
- Missing manager ratings are governance/compliance risks
- Always cite specific employees when identifying red flags or high potentials`;

    const userPrompt = `Analyze this performance review data and provide a comprehensive talent intelligence report.

**Organization Summary:**
- Total Employees: ${totalEmployees}
- Departments: ${departments.join(", ")}
- Rating Scale Detected: 1-${scale} (normalized to 1-5)
- Average Manager Rating: ${avgManagerRating.toFixed(2)}/5
- Red Flag Employees: ${redFlagEmployees.length}
- High Performers: ${highPerformers.length}
- High Potential: ${highPotentialEmployees.length}

**9-Box Distribution:**
${JSON.stringify(nineBoxDist, null, 2)}

**Department Breakdown:**
${JSON.stringify(deptSummaries, null, 2)}

**Employee Data (normalized):**
${JSON.stringify(employeeSummary, null, 2)}

**Red Flag Employees (sample):**
${JSON.stringify(redFlagEmployees.slice(0, 25).map(e => ({
  name: e.employeeName,
  dept: e.department,
  managerRating: e.normalizedManagerRating?.toFixed(1),
  self: e.normalizedSelfRating?.toFixed(1),
  gap: e.normalizedSelfRating && e.normalizedManagerRating 
    ? (e.normalizedSelfRating - e.normalizedManagerRating).toFixed(1) 
    : null,
  issue: e.performanceLevel === "Low" ? "Low Performance" : "Perception Gap",
})), null, 2)}

**High Potential Employees (sample):**
${JSON.stringify(highPotentialEmployees.slice(0, 25).map(e => ({
  name: e.employeeName,
  dept: e.department,
  managerRating: e.normalizedManagerRating?.toFixed(1),
  potential: e.potentialLevel,
  performanceLevel: e.performanceLevel,
})), null, 2)}

Provide your analysis in the following JSON structure:
{
  "organizationalObservations": [
    { "category": "Misalignment Pattern | Confidence Risk | Calibration Gap | Leadership Risk | Engagement Risk | Talent Concentration", "title": "short title", "insight": "detailed insight with specific evidence and employee/department citations", "severity": "high | medium | low" }
  ],
  "departmentAnalysis": [
    { "department": "name", "healthScore": 1-10, "summary": "2-3 sentence overview with specific data", "strengths": ["list with specifics"], "risks": ["list with specifics"], "keyActions": ["list"] }
  ],
  "redFlags": [
    { "employeeName": "name", "department": "dept", "riskCategory": "Underperformance | Severe Misalignment | Governance Risk | Disengagement | Overconfidence", "urgency": "Critical | High | Moderate", "summary": "specific explanation with data", "recommendedAction": "specific action" }
  ],
  "highPotentials": [
    { "employeeName": "name", "department": "dept", "performance": "High/Medium/Low", "potential": "High", "readinessTag": "Leadership Ready | Emerging HiPo | Specialist Track | Succession Pipeline", "summary": "why they are high potential with evidence", "developmentAction": "specific recommended action" }
  ],
  "topPerformers": [
    { "employeeName": "name", "department": "dept", "selfReview": 4.5, "managerReview": 4.8, "consistencyTag": "Consistently Exceptional | Rising Star | Steady Performer", "summary": "why they are a top performer with evidence from ratings", "retentionAction": "specific retention or growth recommendation" }
  ],
  "strategicRecommendations": {
    "immediate": [{ "action": "specific action", "rationale": "why now with data", "owner": "HR/Manager/Executive" }],
    "mediumTerm": [{ "action": "specific action", "rationale": "why", "timeline": "30-90 days" }],
    "longTerm": [{ "action": "strategic initiative", "rationale": "why", "impact": "expected outcome" }]
  },
  "executiveSummary": {
    "overallHealth": "Strong | Moderate | Needs Attention | Critical",
    "mainRisk": "primary organizational risk with supporting data",
    "keyStrength": "primary organizational strength with evidence",
    "topPriority": "single most important action",
    "outlook": "2-3 sentence strategic outlook for next 12 months"
  }
}`;

    const response = await chatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      hasImages: false,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr, content);
      return new Response(JSON.stringify({ error: "Failed to parse AI analysis", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis, 
      analyzedAt: new Date().toISOString(),
      metadata: {
        totalEmployees,
        scaleDetected: scale,
        avgManagerRating: avgManagerRating.toFixed(2),
        departmentCount: departments.length,
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("analyze-performance error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
