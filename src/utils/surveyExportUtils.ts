import { adminQuery } from "@/lib/adminQuery";
import type { SurveyResponse, SurveyQuestion } from "@/types/surveys";

export interface EnrichedRespondent {
  respondent_name: string;
  respondent_email: string;
  department: string;
  job_title: string;
  tier: string;
  line_manager: string;
  is_anonymous: boolean;
  completed_at: string;
  answers: any[];
  score_percent: number;
  score_label: string;
  answered_count: number;
  total_scorable: number;
}

interface Employee {
  full_name: string;
  email: string | null;
  department: string | null;
  job_title: string | null;
  tier: string | null;
  reports_to: string | null;
}

/**
 * Fetch all employees and create lookup maps by name and email
 */
export async function fetchEmployeeLookup(sessionToken: string): Promise<{
  byName: Map<string, Employee>;
  byEmail: Map<string, Employee>;
}> {
  const { data } = await adminQuery<Employee[]>(sessionToken, "select", "employees", {
    limit: 500,
  });

  const byName = new Map<string, Employee>();
  const byEmail = new Map<string, Employee>();

  (data || []).forEach((emp) => {
    if (emp.full_name) byName.set(emp.full_name.toLowerCase().trim(), emp);
    if (emp.email) byEmail.set(emp.email.toLowerCase().trim(), emp);
  });

  return { byName, byEmail };
}

/**
 * Calculate a percentage score for a respondent based on their answers.
 * - Rating questions: scored as (value / max) * 100
 * - NPS questions: scored as (value / 10) * 100
 * - Likert: mapped to percentage based on option position
 * - Yes/No: Yes = 100%, No = 0%
 * - Choice questions: answered = counted, not scored
 * - Text questions: not scored
 *
 * Returns score as percentage of maximum possible points from scorable questions.
 */
export function calculateRespondentScore(
  answers: any[],
  questions: SurveyQuestion[]
): { percent: number; label: string; answered: number; totalScorable: number } {
  let totalPoints = 0;
  let maxPoints = 0;
  let scorableCount = 0;

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  for (const ans of answers) {
    const q = questionMap.get(ans.question_id);
    if (!q) continue;

    if (q.type === "rating") {
      const val = parseFloat(ans.answer_text || "0");
      const max = q.settings?.max || 5;
      if (!isNaN(val)) {
        totalPoints += val;
        maxPoints += max;
        scorableCount++;
      }
    } else if (q.type === "nps") {
      const val = parseFloat(ans.answer_text || "0");
      if (!isNaN(val)) {
        totalPoints += val;
        maxPoints += 10;
        scorableCount++;
      }
    } else if (q.type === "likert") {
      const options = q.options || [];
      const idx = options.indexOf(ans.answer_text);
      if (idx >= 0 && options.length > 1) {
        // First option = lowest score, last = highest
        totalPoints += ((idx + 1) / options.length) * 100;
        maxPoints += 100;
        scorableCount++;
      }
    } else if (q.type === "yes_no") {
      const val = (ans.answer_text || "").toLowerCase();
      if (val === "yes") totalPoints += 100;
      maxPoints += 100;
      scorableCount++;
    }
  }

  const percent = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
  let label = "N/A";
  if (scorableCount > 0) {
    if (percent >= 90) label = "Excellent";
    else if (percent >= 75) label = "Good";
    else if (percent >= 60) label = "Average";
    else if (percent >= 40) label = "Below Average";
    else label = "Low";
  }

  return { percent, label, answered: scorableCount, totalScorable: scorableCount };
}

/**
 * Match a respondent to employee data and enrich with score
 */
export function enrichResponses(
  responses: SurveyResponse[],
  questions: SurveyQuestion[],
  employeeLookup: { byName: Map<string, Employee>; byEmail: Map<string, Employee> }
): EnrichedRespondent[] {
  return responses.map((r) => {
    const name = (r.respondent_name || "").trim();
    const email = (r.respondent_email || "").trim();

    // Try to find employee match
    let emp: Employee | undefined;
    if (email) emp = employeeLookup.byEmail.get(email.toLowerCase());
    if (!emp && name) emp = employeeLookup.byName.get(name.toLowerCase());

    const score = calculateRespondentScore(r.answers || [], questions);

    return {
      respondent_name: r.is_anonymous ? "Anonymous" : (name || "Unknown"),
      respondent_email: r.is_anonymous ? "" : email,
      department: emp?.department || r.respondent_department || "",
      job_title: emp?.job_title || "",
      tier: emp?.tier || "",
      line_manager: emp?.reports_to || "",
      is_anonymous: r.is_anonymous,
      completed_at: r.completed_at || "",
      answers: r.answers || [],
      score_percent: score.percent,
      score_label: score.label,
      answered_count: score.answered,
      total_scorable: score.totalScorable,
    };
  });
}

/**
 * Get answer display text
 */
export function getAnswerText(ans: any): string {
  if (ans.answer_text) return ans.answer_text;
  if (ans.answer_json) {
    if (Array.isArray(ans.answer_json)) return ans.answer_json.join(", ");
    if (typeof ans.answer_json === "object" && ans.answer_json !== null) {
      return Object.entries(ans.answer_json).map(([k, v]) => `${k}: ${v}`).join(", ");
    }
    return String(ans.answer_json);
  }
  return "—";
}
