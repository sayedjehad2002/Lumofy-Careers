import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession } from "../_shared/validate-session.ts";
import { chatCompletion } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const ip = getClientIp(req);
    const rl = isRateLimited(`copilot-report:${ip}`, { maxRequests: 20, windowMs: 60_000 });
    if (rl.limited) return rateLimitResponse(cors, rl.retryAfterMs);

    const { sessionToken, reportType, title, sections } = await req.json();

    const auth = await validateSession(sessionToken, cors);
    if (!auth.valid) return auth.response;
    const sb = auth.supabase;

    // Gather all data
    const [jobsRes, applicantsRes, turnoverRes, headcountRes, perfRes, surveysRes, policiesRes, cvLibRes] = await Promise.all([
      sb.from("jobs").select("*"),
      sb.from("applicants").select("*"),
      sb.from("turnover_entries").select("*").eq("year", new Date().getFullYear()),
      sb.from("headcount_records").select("*").order("year", { ascending: false }).order("month", { ascending: false }).limit(12),
      sb.from("performance_snapshots").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("surveys").select("*, survey_responses(id, status)"),
      sb.from("policies").select("title, category, summary").eq("status", "active"),
      sb.from("cv_library_candidates").select("name, skills, suggested_department, suggested_job_title, years_experience, status"),
    ]);

    const jobs = jobsRes.data || [];
    const applicants = applicantsRes.data || [];
    const turnoverEntries = turnoverRes.data || [];
    const headcount = headcountRes.data || [];
    const perf = perfRes.data;
    const surveys = surveysRes.data || [];
    const policies = policiesRes.data || [];
    const cvLib = cvLibRes.data || [];

    // Build report content for AI
    let dataContext = "## DATA FOR REPORT\n\n";

    // Jobs summary
    const openJobs = jobs.filter((j: any) => j.status === "open");
    dataContext += `### Jobs: ${jobs.length} total, ${openJobs.length} open\n`;
    for (const j of jobs) {
      const appCount = applicants.filter((a: any) => a.job_id === j.id).length;
      dataContext += `- ${j.title} (${j.department}, ${j.status}) — ${appCount} applicants\n`;
    }

    // Applicants
    dataContext += `\n### Applicants: ${applicants.length} total\n`;
    const statusCounts: Record<string, number> = {};
    let totalScore = 0, scoredCount = 0;
    for (const a of applicants) {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
      const score = (a.ai_analysis as any)?.fitScore;
      if (score) { totalScore += score; scoredCount++; }
    }
    dataContext += `- By stage: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(", ")}\n`;
    if (scoredCount) dataContext += `- Average AI score: ${(totalScore / scoredCount).toFixed(1)}\n`;

    // Turnover
    dataContext += `\n### Turnover (${new Date().getFullYear()}): ${turnoverEntries.length} exits\n`;
    const deptExits: Record<string, number> = {};
    let voluntary = 0;
    for (const e of turnoverEntries) {
      if (e.included !== false) {
        deptExits[e.department || "Unknown"] = (deptExits[e.department || "Unknown"] || 0) + 1;
        if (e.termination_type === "Resignation") voluntary++;
      }
    }
    dataContext += `- Voluntary: ${voluntary}, Involuntary: ${turnoverEntries.length - voluntary}\n`;
    dataContext += `- By department: ${Object.entries(deptExits).sort((a, b) => b[1] - a[1]).map(([d, c]) => `${d}: ${c}`).join(", ")}\n`;

    // Headcount
    if (headcount.length > 0) {
      const latest = headcount[0];
      dataContext += `\n### Current Headcount: ${latest.ending_headcount} (as of ${latest.year}-${String(latest.month).padStart(2, "0")})\n`;
    }

    // Performance
    if (perf) {
      dataContext += `\n### Performance (${perf.snapshot_name})\n`;
      dataContext += `- Total employees: ${perf.total_employees}, High performers: ${perf.high_performers}, High potential: ${perf.high_potential}, Red flags: ${perf.red_flag_count}\n`;
      dataContext += `- Avg manager rating: ${perf.avg_manager_rating || "N/A"}\n`;
    }

    // Surveys
    dataContext += `\n### Surveys: ${surveys.length} total\n`;
    for (const s of surveys) {
      const responses = (s as any).survey_responses || [];
      dataContext += `- "${s.title}" (${s.status}) — ${responses.length} responses\n`;
    }

    // CV Library
    dataContext += `\n### CV Library: ${cvLib.length} CVs\n`;
    const skillCounts: Record<string, number> = {};
    for (const c of cvLib) {
      if (c.skills) for (const s of c.skills) skillCounts[s] = (skillCounts[s] || 0) + 1;
    }
    dataContext += `- Top skills: ${Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s, c]) => `${s} (${c})`).join(", ")}\n`;

    // Policies
    dataContext += `\n### Active Policies: ${policies.length}\n`;
    for (const p of policies) dataContext += `- ${p.title} [${p.category}]: ${p.summary}\n`;

    const requestedSections = sections?.join(", ") || "executive_summary, all_modules";

    const aiResponse = await chatCompletion({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are a professional HR report writer for Lumofy. Generate a comprehensive, well-structured report using ONLY the data provided. Use professional business language. Include specific numbers and percentages. Structure with clear headings and bullet points. Do not fabricate data.`,
        },
        {
          role: "user",
          content: `Generate an HR report titled "${title || "Lumofy HR Intelligence Report"}".

Requested sections: ${requestedSections}

Format the report with:
1. Executive Summary (2-3 paragraphs)
2. Key Metrics Dashboard (bullet points with numbers)
3. Detailed Analysis per section
4. Risk Areas & Recommendations
5. Action Items

${dataContext}`,
        },
      ],
      hasImages: false,
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("Failed to generate report content");
    }

    const aiData = await aiResponse.json();
    const reportContent = aiData.choices?.[0]?.message?.content || "Report generation failed.";

    return new Response(JSON.stringify({
      success: true,
      reportContent,
      title: title || "Lumofy HR Intelligence Report",
      generatedAt: new Date().toISOString(),
      format: reportType || "pdf",
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("copilot-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
