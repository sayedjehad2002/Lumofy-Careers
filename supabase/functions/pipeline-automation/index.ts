import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp, isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { validateSession, createServiceClient } from "../_shared/validate-session.ts";

interface PipelineRule {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  condition_type: string;
  condition_operator: string;
  condition_value: string;
  condition_stage: string | null;
  condition_job_id: string | null;
  action_type: string;
  action_value: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit: 60 requests per minute per IP
  const ip = getClientIp(req);
  const rl = isRateLimited(`pipeline-auto:${ip}`, { maxRequests: 60, windowMs: 60_000 });
  if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const sessionToken = req.headers.get("x-session-token");

    // "evaluate" action can be called by cron (no session needed) or manually
    if (action === "evaluate") {
      return await handleEvaluate(corsHeaders);
    }

    // All other actions need auth
    const authResult = await validateSession(sessionToken, corsHeaders);
    if (!authResult.valid) return authResult.response;
    const supabase = authResult.supabase;

    if (action === "list") {
      const { data, error } = await supabase
        .from("pipeline_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ rules: data }, corsHeaders);
    }

    if (action === "create" || action === "update") {
      const body = await req.json();
      const rule = body.rule;
      if (!rule?.name) throw new Error("Rule name is required");

      if (action === "create") {
        const { data, error } = await supabase.from("pipeline_rules").insert({
          name: rule.name,
          description: rule.description || "",
          is_active: rule.is_active ?? true,
          condition_type: rule.condition_type,
          condition_operator: rule.condition_operator,
          condition_value: rule.condition_value,
          condition_stage: rule.condition_stage || null,
          condition_job_id: rule.condition_job_id || null,
          action_type: rule.action_type,
          action_value: rule.action_value,
        }).select().single();
        if (error) throw error;
        return json({ rule: data }, corsHeaders);
      } else {
        const { data, error } = await supabase.from("pipeline_rules").update({
          name: rule.name,
          description: rule.description || "",
          is_active: rule.is_active,
          condition_type: rule.condition_type,
          condition_operator: rule.condition_operator,
          condition_value: rule.condition_value,
          condition_stage: rule.condition_stage || null,
          condition_job_id: rule.condition_job_id || null,
          action_type: rule.action_type,
          action_value: rule.action_value,
          updated_at: new Date().toISOString(),
        }).eq("id", rule.id).select().single();
        if (error) throw error;
        return json({ rule: data }, corsHeaders);
      }
    }

    if (action === "delete") {
      const body = await req.json();
      const { error } = await supabase.from("pipeline_rules").delete().eq("id", body.id);
      if (error) throw error;
      return json({ success: true }, corsHeaders);
    }

    if (action === "toggle") {
      const body = await req.json();
      const { data, error } = await supabase.from("pipeline_rules")
        .update({ is_active: body.is_active, updated_at: new Date().toISOString() })
        .eq("id", body.id).select().single();
      if (error) throw error;
      return json({ rule: data }, corsHeaders);
    }

    if (action === "logs") {
      const body = await req.json();
      const query = supabase.from("pipeline_automation_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(body.limit || 50);
      if (body.rule_id) query.eq("rule_id", body.rule_id);
      const { data, error } = await query;
      if (error) throw error;
      return json({ logs: data }, corsHeaders);
    }

    return json({ error: "Unknown action" }, corsHeaders, 400);
  } catch (error) {
    console.error("pipeline-automation error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, corsHeaders, 500);
  }
});

// ─── Evaluate all active rules against candidates ──────────
async function handleEvaluate(corsHeaders: Record<string, string>) {
  const supabase = createServiceClient();

  // Fetch active rules
  const { data: rules, error: rulesErr } = await supabase
    .from("pipeline_rules")
    .select("*")
    .eq("is_active", true);
  if (rulesErr) throw rulesErr;
  if (!rules || rules.length === 0) return json({ evaluated: 0, affected: 0 }, corsHeaders);

  // Fetch all non-terminal applicants
  const { data: applicants, error: appErr } = await supabase
    .from("applicants")
    .select("id, job_id, status, ai_analysis, stage_entered_at, created_at, full_name")
    .not("status", "in", '("rejected","hired")');
  if (appErr) throw appErr;
  if (!applicants || applicants.length === 0) return json({ evaluated: rules.length, affected: 0 }, corsHeaders);

  let totalAffected = 0;
  const logs: any[] = [];
  const now = new Date();

  for (const rule of rules as PipelineRule[]) {
    let affected = 0;

    for (const app of applicants) {
      // Check stage filter
      if (rule.condition_stage && app.status !== rule.condition_stage) continue;
      // Check job filter
      if (rule.condition_job_id && app.job_id !== rule.condition_job_id) continue;

      const matches = evaluateCondition(rule, app, now);
      if (!matches) continue;

      // Execute action
      const actionResult = await executeAction(supabase, rule, app);
      if (actionResult) {
        affected++;
        logs.push({
          rule_id: rule.id,
          applicant_id: app.id,
          action_taken: `${rule.action_type}:${rule.action_value}`,
          details: { rule_name: rule.name, applicant_name: app.full_name, previous_status: app.status },
        });
      }
    }

    // Update rule stats
    await supabase.from("pipeline_rules").update({
      last_run_at: now.toISOString(),
      last_run_affected: affected,
      total_affected: (rule as any).total_affected + affected,
      updated_at: now.toISOString(),
    }).eq("id", rule.id);

    totalAffected += affected;
  }

  // Insert logs
  if (logs.length > 0) {
    await supabase.from("pipeline_automation_log").insert(logs);
  }

  return json({ evaluated: rules.length, affected: totalAffected }, corsHeaders);
}

function evaluateCondition(rule: PipelineRule, app: any, now: Date): boolean {
  const op = rule.condition_operator;
  const targetValue = parseFloat(rule.condition_value);

  switch (rule.condition_type) {
    case "ai_score": {
      const analysis = app.ai_analysis as any;
      if (!analysis?.fitScore) return false;
      const score = analysis.fitScore;
      return compare(score, op, targetValue);
    }
    case "days_in_stage": {
      const enteredAt = app.stage_entered_at ? new Date(app.stage_entered_at) : new Date(app.created_at);
      const days = (now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24);
      return compare(days, op, targetValue);
    }
    case "missing_rating": {
      // True if no AI analysis exists
      return !app.ai_analysis;
    }
    case "stage_match": {
      return app.status === rule.condition_value;
    }
    default:
      return false;
  }
}

function compare(actual: number, op: string, target: number): boolean {
  switch (op) {
    case "gte": return actual >= target;
    case "lte": return actual <= target;
    case "gt": return actual > target;
    case "lt": return actual < target;
    case "eq": return actual === target;
    default: return false;
  }
}

async function executeAction(supabase: any, rule: PipelineRule, app: any): Promise<boolean> {
  try {
    switch (rule.action_type) {
      case "move_stage": {
        // Don't move if already in target stage
        if (app.status === rule.action_value) return false;
        await supabase.from("applicants").update({
          status: rule.action_value,
          stage_entered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", app.id);
        return true;
      }
      case "add_note": {
        const { data: current } = await supabase.from("applicants").select("notes").eq("id", app.id).single();
        const notes = Array.isArray(current?.notes) ? current.notes : [];
        notes.push(`[Auto] ${rule.action_value} (Rule: ${rule.name})`);
        await supabase.from("applicants").update({
          notes,
          updated_at: new Date().toISOString(),
        }).eq("id", app.id);
        return true;
      }
      case "flag": {
        const { data: current } = await supabase.from("applicants").select("notes").eq("id", app.id).single();
        const notes = Array.isArray(current?.notes) ? current.notes : [];
        const flagNote = `⚠️ FLAGGED: ${rule.action_value} (Rule: ${rule.name})`;
        if (notes.includes(flagNote)) return false; // Already flagged
        notes.push(flagNote);
        await supabase.from("applicants").update({
          notes,
          updated_at: new Date().toISOString(),
        }).eq("id", app.id);
        return true;
      }
      default:
        return false;
    }
  } catch (err) {
    console.error(`Action failed for rule ${rule.id}, applicant ${app.id}:`, err);
    return false;
  }
}

function json(data: any, corsHeaders: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
