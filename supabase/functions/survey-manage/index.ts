import { getCorsHeaders } from "../_shared/cors.ts";
import { validateSession, createServiceClient } from "../_shared/validate-session.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Public actions (no auth required)
    if (action === "get_published_survey") {
      const surveyId = url.searchParams.get("id");
      if (!surveyId) {
        return new Response(JSON.stringify({ error: "Missing survey id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supabase = createServiceClient();
      // Use the safe function that excludes intelligence columns
      const { data: survey, error } = await supabase
        .rpc("get_published_survey", { p_id: surveyId })
        .single();
      if (error || !survey) {
        return new Response(JSON.stringify({ error: "Survey not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: questions } = await supabase
        .from("survey_questions")
        .select("*")
        .eq("survey_id", surveyId)
        .order("order_index", { ascending: true });
      // Strip internal intelligence data from public response
      const { cached_intelligence, intelligence_cached_at, intelligence_response_count, ...publicSurvey } = survey;
      return new Response(JSON.stringify({ survey: { ...publicSurvey, questions: questions || [] } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "submit_response") {
      const body = await req.json();
      const { survey_id, respondent_name, respondent_email, respondent_department, is_anonymous, answers } = body;
      
      // Input validation
      if (!survey_id || typeof survey_id !== "string" || survey_id.length > 100) {
        return new Response(JSON.stringify({ error: "Invalid survey_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
        return new Response(JSON.stringify({ error: "Invalid answers format" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Limit answer count to prevent abuse
      if (Object.keys(answers).length > 200) {
        return new Response(JSON.stringify({ error: "Too many answers" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Sanitize string inputs
      const safeName = typeof respondent_name === "string" ? respondent_name.slice(0, 255) : null;
      const safeEmail = typeof respondent_email === "string" ? respondent_email.slice(0, 255) : null;
      const safeDept = typeof respondent_department === "string" ? respondent_department.slice(0, 255) : null;

      const supabase = createServiceClient();
      // Check survey is published
      const { data: survey } = await supabase.from("surveys").select("id, status, max_responses, is_anonymous").eq("id", survey_id).single();
      if (!survey || survey.status !== "published") {
        return new Response(JSON.stringify({ error: "Survey is not accepting responses" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Check max responses
      if (survey.max_responses) {
        const { count } = await supabase.from("survey_responses").select("id", { count: "exact", head: true }).eq("survey_id", survey_id).eq("status", "completed");
        if ((count || 0) >= survey.max_responses) {
          return new Response(JSON.stringify({ error: "Survey has reached maximum responses" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      // Enforce anonymous server-side (don't trust client flag)
      const isActuallyAnonymous = survey.is_anonymous === true;
      // Create response
      const { data: response, error: respError } = await supabase.from("survey_responses").insert({
        survey_id,
        respondent_name: isActuallyAnonymous ? null : safeName,
        respondent_email: isActuallyAnonymous ? null : safeEmail,
        respondent_department: isActuallyAnonymous ? null : safeDept,
        is_anonymous: isActuallyAnonymous,
        completed_at: new Date().toISOString(),
        status: "completed",
      }).select("id").single();
      if (respError) throw respError;

      // Validate answer keys are valid UUIDs for the survey's questions
      const { data: validQuestions } = await supabase.from("survey_questions").select("id").eq("survey_id", survey_id);
      const validIds = new Set((validQuestions || []).map((q: any) => q.id));
      
      const answerRows = Object.entries(answers)
        .filter(([questionId]) => validIds.has(questionId)) // Only accept valid question IDs
        .map(([question_id, value]: [string, any]) => ({
          response_id: response.id,
          question_id,
          answer_text: typeof value === "string" ? value.slice(0, 10000) : null,
          answer_json: typeof value !== "string" ? value : null,
        }));
      if (answerRows.length > 0) {
        const { error: ansError } = await supabase.from("survey_answers").insert(answerRows);
        if (ansError) throw ansError;
      }
      return new Response(JSON.stringify({ success: true, response_id: response.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require admin auth
    const sessionToken = req.headers.get("x-session-token");
    const authResult = await validateSession(sessionToken, corsHeaders);
    if (!authResult.valid) return authResult.response;
    const supabase = authResult.supabase;

    if (action === "list") {
      const { data: surveys, error } = await supabase.from("surveys").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      // Get response counts
      const surveyIds = (surveys || []).map((s: any) => s.id);
      let responseCounts: Record<string, number> = {};
      if (surveyIds.length > 0) {
        const { data: counts } = await supabase.from("survey_responses").select("survey_id").eq("status", "completed").in("survey_id", surveyIds);
        (counts || []).forEach((r: any) => {
          responseCounts[r.survey_id] = (responseCounts[r.survey_id] || 0) + 1;
        });
      }
      const enriched = (surveys || []).map((s: any) => ({ ...s, response_count: responseCounts[s.id] || 0 }));
      return new Response(JSON.stringify({ surveys: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get") {
      const surveyId = url.searchParams.get("id");
      const { data: survey, error } = await supabase.from("surveys").select("*").eq("id", surveyId).single();
      if (error) throw error;
      const { data: questions } = await supabase.from("survey_questions").select("*").eq("survey_id", surveyId).order("order_index", { ascending: true });
      return new Response(JSON.stringify({ survey: { ...survey, questions: questions || [] } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create" || action === "update") {
      const body = await req.json();
      const { survey, questions } = body;
      let surveyId: string;

      if (action === "create") {
        const { data, error } = await supabase.from("surveys").insert({
          title: survey.title,
          description: survey.description || "",
          category: survey.category || "custom",
          audience_type: survey.audience_type || "internal",
          is_anonymous: survey.is_anonymous || false,
          allow_multiple_responses: survey.allow_multiple_responses || false,
          response_deadline: survey.response_deadline || null,
          thank_you_message: survey.thank_you_message || "Thank you for completing this survey!",
          status: survey.status || "draft",
          is_public: survey.is_public !== false,
          max_responses: survey.max_responses || null,
        }).select("id").single();
        if (error) throw error;
        surveyId = data.id;
      } else {
        surveyId = survey.id;
        const { error } = await supabase.from("surveys").update({
          title: survey.title,
          description: survey.description,
          category: survey.category,
          audience_type: survey.audience_type,
          is_anonymous: survey.is_anonymous,
          allow_multiple_responses: survey.allow_multiple_responses,
          response_deadline: survey.response_deadline,
          thank_you_message: survey.thank_you_message,
          status: survey.status,
          is_public: survey.is_public,
          max_responses: survey.max_responses,
        }).eq("id", surveyId);
        if (error) throw error;
        // Delete old questions
        await supabase.from("survey_questions").delete().eq("survey_id", surveyId);
      }

      // Insert questions
      if (questions && questions.length > 0) {
        const qRows = questions.map((q: any, i: number) => ({
          survey_id: surveyId,
          type: q.type,
          question_text: q.question_text,
          help_text: q.help_text || null,
          placeholder: q.placeholder || null,
          is_required: q.is_required || false,
          options: q.options || [],
          order_index: i,
          settings: q.settings || {},
        }));
        const { error } = await supabase.from("survey_questions").insert(qRows);
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true, id: surveyId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const surveyId = url.searchParams.get("id");
      const { error } = await supabase.from("surveys").delete().eq("id", surveyId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_status") {
      const body = await req.json();
      const { error } = await supabase.from("surveys").update({ status: body.status }).eq("id", body.id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_response") {
      const responseId = url.searchParams.get("id");
      if (!responseId) {
        return new Response(JSON.stringify({ error: "Missing response id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Delete answers first, then the response
      await supabase.from("survey_answers").delete().eq("response_id", responseId);
      const { error } = await supabase.from("survey_responses").delete().eq("id", responseId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_responses") {
      const surveyId = url.searchParams.get("id");
      const { data: responses, error } = await supabase.from("survey_responses").select("*").eq("survey_id", surveyId).eq("status", "completed").order("completed_at", { ascending: false });
      if (error) throw error;
      // Get all answers for these responses
      const responseIds = (responses || []).map((r: any) => r.id);
      let answers: any[] = [];
      if (responseIds.length > 0) {
        const { data } = await supabase.from("survey_answers").select("*").in("response_id", responseIds);
        answers = data || [];
      }
      // Map answers to responses
      const enriched = (responses || []).map((r: any) => ({
        ...r,
        answers: answers.filter((a: any) => a.response_id === r.id),
      }));
      return new Response(JSON.stringify({ responses: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("survey-manage error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
