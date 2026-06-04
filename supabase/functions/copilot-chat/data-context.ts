export async function fetchAllContext(sb: any, context: any): Promise<{ policyContext: string; contextSections: string }> {
  // Fetch all data in parallel (including memory)
  const [policiesRes, cvLibRes, headcountRes, turnoverRes, performanceRes, surveysRes, surveyResponsesRes, memoryRes] = await Promise.all([
    sb.from("policies").select("title, category, summary, content, key_points, related_policies").eq("status", "active"),
    sb.from("cv_library_candidates").select("name, email, skills, industries, years_experience, suggested_department, suggested_job_title, location, nationality, status, tags"),
    sb.from("headcount_records").select("year, month, starting_headcount, ending_headcount").order("year", { ascending: false }).order("month", { ascending: false }).limit(24),
    sb.from("turnover_entries").select("employee_name, department, termination_type, termination_date, line_manager, tier, year, month, included, notes").eq("included", true).order("termination_date", { ascending: false }).limit(200),
    sb.from("performance_snapshots").select("snapshot_name, snapshot_date, total_employees, high_performers, high_potential, red_flag_count, avg_manager_rating, nine_box_distribution, department_breakdown").order("snapshot_date", { ascending: false }).limit(5),
    sb.from("surveys").select("id, title, status, category, description, created_at"),
    sb.from("survey_responses").select("survey_id, status, completed_at, respondent_department"),
    sb.from("copilot_memory").select("key, value"),
  ]);

  // Build policy context
  let policyContext = "";
  if (policiesRes.data && policiesRes.data.length > 0) {
    policyContext = "\n\n## LUMOFY HR POLICIES KNOWLEDGE BASE\n";
    for (const p of policiesRes.data) {
      policyContext += `### ${p.title} [${p.category}]\n${p.content}\n\n`;
    }
  }

  let contextSections = "";

  // CV Library stats
  if (cvLibRes.data && cvLibRes.data.length > 0) {
    const candidates = cvLibRes.data;
    const skillCounts: Record<string, number> = {};
    const deptCounts: Record<string, number> = {};
    const titleCounts: Record<string, number> = {};
    const expLevels: Record<string, number> = {};
    const nationalityCounts: Record<string, number> = {};

    for (const c of candidates) {
      if (c.skills) for (const s of c.skills) skillCounts[s] = (skillCounts[s] || 0) + 1;
      if (c.suggested_department) deptCounts[c.suggested_department] = (deptCounts[c.suggested_department] || 0) + 1;
      if (c.suggested_job_title) titleCounts[c.suggested_job_title] = (titleCounts[c.suggested_job_title] || 0) + 1;
      if (c.years_experience) expLevels[c.years_experience] = (expLevels[c.years_experience] || 0) + 1;
      if (c.nationality) nationalityCounts[c.nationality] = (nationalityCounts[c.nationality] || 0) + 1;
    }

    contextSections += `\n\n## CV LIBRARY DATA\n`;
    contextSections += `- Total CVs stored: ${candidates.length}\n`;
    contextSections += `- Top skills: ${Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([s, c]) => `${s} (${c})`).join(", ")}\n`;
    contextSections += `- Department distribution: ${Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).map(([d, c]) => `${d}: ${c}`).join(", ")}\n`;
    contextSections += `- Role distribution: ${Object.entries(titleCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t, c]) => `${t}: ${c}`).join(", ")}\n`;
    contextSections += `- Experience levels: ${Object.entries(expLevels).sort((a, b) => b[1] - a[1]).map(([e, c]) => `${e}: ${c}`).join(", ")}\n`;
    contextSections += `- Nationalities: ${Object.entries(nationalityCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, c]) => `${n}: ${c}`).join(", ")}\n`;
  }

  // Headcount data
  if (headcountRes.data && headcountRes.data.length > 0) {
    contextSections += `\n\n## HEADCOUNT DATA (Recent Months)\n`;
    for (const h of headcountRes.data.slice(0, 12)) {
      const change = h.ending_headcount - h.starting_headcount;
      const changeStr = change >= 0 ? `+${change}` : `${change}`;
      contextSections += `- ${h.year}-${String(h.month).padStart(2, "0")}: Starting ${h.starting_headcount}, Ending ${h.ending_headcount} (${changeStr})\n`;
    }
  }

  // Turnover entries (detailed)
  if (turnoverRes.data && turnoverRes.data.length > 0) {
    const entries = turnoverRes.data;
    const deptExits: Record<string, number> = {};
    const managerExits: Record<string, number> = {};
    const typeExits: Record<string, number> = {};
    const tierExits: Record<string, number> = {};
    const monthlyExits: Record<string, number> = {};

    for (const e of entries) {
      if (e.department) deptExits[e.department] = (deptExits[e.department] || 0) + 1;
      if (e.line_manager) managerExits[e.line_manager] = (managerExits[e.line_manager] || 0) + 1;
      if (e.termination_type) typeExits[e.termination_type] = (typeExits[e.termination_type] || 0) + 1;
      if (e.tier) tierExits[e.tier] = (tierExits[e.tier] || 0) + 1;
      const key = `${e.year}-${String(e.month).padStart(2, "0")}`;
      monthlyExits[key] = (monthlyExits[key] || 0) + 1;
    }

    contextSections += `\n\n## TURNOVER DATA (Detailed)\n`;
    contextSections += `- Total exits (recent): ${entries.length}\n`;
    contextSections += `- By department: ${Object.entries(deptExits).sort((a, b) => b[1] - a[1]).map(([d, c]) => `${d}: ${c}`).join(", ")}\n`;
    contextSections += `- By manager: ${Object.entries(managerExits).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([m, c]) => `${m}: ${c}`).join(", ")}\n`;
    contextSections += `- By termination type: ${Object.entries(typeExits).map(([t, c]) => `${t}: ${c}`).join(", ")}\n`;
    contextSections += `- By tier/level: ${Object.entries(tierExits).map(([t, c]) => `${t}: ${c}`).join(", ")}\n`;
    contextSections += `- Monthly trend: ${Object.entries(monthlyExits).sort().map(([m, c]) => `${m}: ${c} exits`).join(", ")}\n`;
    
    // Recent exits detail (last 20)
    contextSections += `- Recent exits:\n`;
    for (const e of entries.slice(0, 20)) {
      contextSections += `  • ${e.employee_name} | ${e.department || "N/A"} | ${e.termination_type} | ${e.termination_date} | Manager: ${e.line_manager || "N/A"} | Tier: ${e.tier || "N/A"}${e.notes ? ` | Note: ${e.notes}` : ""}\n`;
    }
  }

  // Performance snapshots (detailed)
  if (performanceRes.data && performanceRes.data.length > 0) {
    contextSections += `\n\n## PERFORMANCE DATA (Snapshots)\n`;
    for (const p of performanceRes.data) {
      contextSections += `\n### ${p.snapshot_name} (${p.snapshot_date})\n`;
      contextSections += `- Total employees: ${p.total_employees}\n`;
      contextSections += `- High performers: ${p.high_performers}\n`;
      contextSections += `- High potential: ${p.high_potential}\n`;
      contextSections += `- Red flags: ${p.red_flag_count}\n`;
      contextSections += `- Avg manager rating: ${p.avg_manager_rating?.toFixed(2) || "N/A"}\n`;
      
      if (p.nine_box_distribution && typeof p.nine_box_distribution === "object") {
        contextSections += `- 9-Box Distribution: ${JSON.stringify(p.nine_box_distribution)}\n`;
      }
      if (p.department_breakdown && Array.isArray(p.department_breakdown)) {
        contextSections += `- Department breakdown:\n`;
        for (const d of (p.department_breakdown as any[])) {
          contextSections += `  • ${d.department || d.name || "Unknown"}: ${d.count || d.employees || 0} employees, avg rating: ${d.avgRating?.toFixed(2) || d.avg_rating?.toFixed(2) || "N/A"}\n`;
        }
      }
    }
  }

  // Surveys with response stats
  if (surveysRes.data && surveysRes.data.length > 0) {
    const responses = surveyResponsesRes.data || [];
    contextSections += `\n\n## SURVEYS DATA\n`;
    for (const s of surveysRes.data) {
      const surveyResponses = responses.filter((r: any) => r.survey_id === s.id);
      const completed = surveyResponses.filter((r: any) => r.status === "completed").length;
      const inProgress = surveyResponses.filter((r: any) => r.status === "in_progress").length;
      const deptBreakdown: Record<string, number> = {};
      for (const r of surveyResponses) {
        if (r.respondent_department) deptBreakdown[r.respondent_department] = (deptBreakdown[r.respondent_department] || 0) + 1;
      }
      contextSections += `- "${s.title}" (${s.category}) — Status: ${s.status} — ${completed} completed, ${inProgress} in progress`;
      if (Object.keys(deptBreakdown).length > 0) {
        contextSections += ` — Departments: ${Object.entries(deptBreakdown).map(([d, c]) => `${d}: ${c}`).join(", ")}`;
      }
      contextSections += `\n`;
    }
  }

  // Candidate context from frontend
  if (context?.candidate) {
    const c = context.candidate;
    contextSections += `\n\n## CURRENT CANDIDATE CONTEXT\n`;
    contextSections += `- Full Name: ${c.fullName}\n- Email: ${c.email || "N/A"}\n- Location: ${c.location || "N/A"}\n- Nationality: ${c.nationality || "N/A"}\n- Pipeline Stage: ${c.status}\n- CV File: ${c.cvFileName || "No CV uploaded"}\n- Applied Date: ${c.appliedDate || "N/A"}\n`;

    if (c.screeningAnswers && Object.keys(c.screeningAnswers).length > 0) {
      contextSections += `\n### Screening Answers\n`;
      for (const [qId, answer] of Object.entries(c.screeningAnswers)) {
        const qText = context.screeningQuestions?.[qId] || qId;
        contextSections += `- Q: ${qText}\n  A: ${answer}\n`;
      }
    }

    if (c.aiAnalysis) {
      const ai = c.aiAnalysis;
      contextSections += `\n### AI Analysis Results\n`;
      contextSections += `- Fit Score: ${ai.fitScore}/100 (${ai.fitLevel})\n- Confidence: ${ai.confidence}\n- Recommendation: ${ai.recommendation}\n- Justification: ${ai.recommendationJustification || "N/A"}\n- Summary: ${ai.summary}\n- Skills Coverage: ${ai.skillsCoveragePercent ?? "N/A"}%\n`;
      if (ai.strengths?.length) contextSections += `- Strengths:\n${ai.strengths.map((s: string) => `  • ${s}`).join("\n")}\n`;
      if (ai.gaps?.length) contextSections += `- Gaps:\n${ai.gaps.map((g: string) => `  • ${g}`).join("\n")}\n`;
      if (ai.riskIndicators?.length) contextSections += `- Risk Indicators:\n${ai.riskIndicators.map((r: string) => `  • ${r}`).join("\n")}\n`;
      if (ai.interviewQuestions?.length) contextSections += `- Suggested Questions:\n${ai.interviewQuestions.map((q: string) => `  • ${q}`).join("\n")}\n`;
      if (ai.skillsAlignment?.length) {
        contextSections += `- Skills Alignment:\n`;
        for (const s of ai.skillsAlignment) contextSections += `  • ${s.requiredSkill}: ${s.evidence} — ${s.detail}\n`;
      }
      if (ai.experienceVerification) {
        const ev = ai.experienceVerification;
        contextSections += `- Experience: ${ev.totalYears} years, Seniority: ${ev.seniorityAlignment}, Industry: ${ev.industryRelevance}\n`;
      }
      if (ai.detectedSkills?.length) contextSections += `- Detected Skills: ${ai.detectedSkills.join(", ")}\n`;
      if (ai.missingSkills?.length) contextSections += `- Missing Skills: ${ai.missingSkills.join(", ")}\n`;
      contextSections += `- Organizational Fit: ${ai.organizationalFit || "N/A"}\n- Growth Potential: ${ai.growthPotential || "N/A"}\n- Feedback: ${ai.feedback || "N/A"}\n`;
    }
  }

  if (context?.job) {
    const j = context.job;
    contextSections += `\n\n## CURRENT JOB CONTEXT\n`;
    contextSections += `- Title: ${j.title}\n- Department: ${j.department}\n- Location: ${j.location}\n- Type: ${j.type}\n- Status: ${j.status}\n`;
    if (j.summary) contextSections += `- Summary: ${j.summary}\n`;
    if (j.description) contextSections += `- Description: ${j.description}\n`;
    if (j.responsibilities?.length) contextSections += `- Responsibilities:\n${j.responsibilities.map((r: string) => `  • ${r}`).join("\n")}\n`;
    if (j.requirements?.length) contextSections += `- Requirements:\n${j.requirements.map((r: string) => `  • ${r}`).join("\n")}\n`;
    if (j.salaryRange) contextSections += `- Salary: ${j.salaryRange} ${j.salaryCurrency || ""}\n`;
  }

  if (context?.allJobs?.length) {
    contextSections += `\n\n## ALL JOBS IN SYSTEM\n`;
    for (const j of context.allJobs) {
      contextSections += `- ${j.title} (${j.department}, ${j.location}, ${j.status}) — ${j.applicantCount || 0} applicants\n`;
    }
  }

  if (context?.allApplicants?.length) {
    contextSections += `\n\n## ALL APPLICANTS SUMMARY\n`;
    for (const a of context.allApplicants) {
      contextSections += `- ${a.fullName} → ${a.jobTitle} | Stage: ${a.status} | AI Score: ${a.aiScore ?? "Pending"}${a.recommendation ? ` | Rec: ${a.recommendation}` : ""}${a.daysInStage != null ? ` | Days in stage: ${a.daysInStage}` : ""}\n`;
    }
  }

  // Cross-module from frontend (legacy support)
  if (context?.surveys?.length && !surveysRes.data?.length) {
    contextSections += `\n\n## SURVEYS DATA\n`;
    for (const s of context.surveys) {
      contextSections += `- "${s.title}" (${s.category}) — Status: ${s.status} — ${s.responseCount} responses\n`;
    }
  }

  if (context?.turnover && !turnoverRes.data?.length) {
    const t = context.turnover;
    contextSections += `\n\n## TURNOVER DATA (${t.period})\n`;
    contextSections += `- Total exits: ${t.totalExits}\n- Voluntary exits: ${t.voluntaryExits}\n`;
    if (t.topDepartments?.length) {
      contextSections += `- Top departments by exits:\n`;
      for (const d of t.topDepartments) contextSections += `  • ${d.dept}: ${d.count} exits\n`;
    }
  }

  if (context?.performance && !performanceRes.data?.length) {
    const p = context.performance;
    contextSections += `\n\n## PERFORMANCE DATA (${p.snapshotName})\n`;
    contextSections += `- Total employees: ${p.totalEmployees}\n- High performers: ${p.highPerformers}\n- High potential: ${p.highPotential}\n- Red flags: ${p.redFlags}\n- Avg manager rating: ${p.avgRating?.toFixed(2) || "N/A"}\n`;
  }

  // Memory & personality context
  if (memoryRes.data && memoryRes.data.length > 0) {
    contextSections += `\n\n## USER MEMORY & PREFERENCES\n`;
    for (const m of memoryRes.data) {
      contextSections += `- ${m.key}: ${JSON.stringify(m.value)}\n`;
    }
  }

  // User reactions/feedback context
  if (context?.reactionSummary) {
    contextSections += `\n\n## USER FEEDBACK PATTERNS\n`;
    contextSections += `- Thumbs up topics: ${context.reactionSummary.liked?.join(", ") || "none yet"}\n`;
    contextSections += `- Thumbs down topics: ${context.reactionSummary.disliked?.join(", ") || "none yet"}\n`;
  }

  // Language preference from frontend
  if (context?.language) {
    contextSections += `\n\n## LANGUAGE PREFERENCE\n- User preferred language: ${context.language}\n`;
  }

  return { policyContext, contextSections };
}
