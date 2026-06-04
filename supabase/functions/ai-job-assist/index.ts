import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isRateLimited, rateLimitResponse } from "../_shared/rate-limit.ts";
import { chatCompletion } from "../_shared/ai.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type, sessionToken, jobTitle, department, location, employmentType, summary, description, responsibilities, requirements, jdFilePath, seniority, count, questionTypes, focusAreas } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session } = await supabase
      .from("admin_sessions")
      .select("id")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 30 AI job assist calls per hour per session
    const rl = isRateLimited(`ai-job-assist:${sessionToken}`, { maxRequests: 30, windowMs: 3_600_000 });
    if (rl.limited) return rateLimitResponse(corsHeaders, rl.retryAfterMs);

    // AI calls go through the shared OpenRouter helper (../_shared/ai.ts).

    // Try to extract JD text from uploaded PDF
    let jdExtractedText = "";
    if (jdFilePath) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("jds")
          .download(jdFilePath);
        if (!downloadError && fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          // For PDFs, send as base64 to the multimodal model
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          jdExtractedText = btoa(binary);
        }
      } catch (e) {
        console.error("JD download error:", e);
      }
    }

    const jobContext = `
Job Title: ${jobTitle || "Not provided"}
Department: ${department || "Not provided"}
Location: ${location || "Not provided"}
Employment Type: ${employmentType || "Not provided"}
Summary: ${summary || "Not provided"}
About the Role: ${description || "Not provided"}
Key Responsibilities: ${responsibilities?.length ? responsibilities.join("; ") : "Not provided"}
Requirements: ${requirements?.length ? requirements.join("; ") : "Not provided"}

Company Context: Lumofy is a B2B SaaS HRTech company. AI-powered talent management platform. Skills-first approach. Based in Bahrain, serving MENA region.`;

    let systemPrompt = "";
    let userPrompt = "";
    let toolsDef: any[] | undefined;
    let toolChoice: any | undefined;

    if (type === "summary") {
      systemPrompt = `You are an expert HR copywriter for Lumofy, a B2B SaaS HRTech company. Write concise, professional job summaries.

RULES:
- Maximum 180 characters
- 1-2 concise lines
- Professional and clear
- No buzzwords or fluff
- Do NOT mention AI or machine learning
- Do NOT fabricate information
- Base content ONLY on provided job data`;

      userPrompt = `Write a job summary for this role:\n${jobContext}`;

      toolsDef = [{
        type: "function",
        function: {
          name: "return_summary",
          description: "Return the generated job summary",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string", description: "The job summary, max 180 characters" }
            },
            required: ["summary"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "return_summary" } };

    } else if (type === "description") {
      systemPrompt = `You are an expert HR copywriter for Lumofy, a B2B SaaS HRTech company. Write compelling "About the Role" descriptions.

RULES:
- 2-4 paragraphs
- Professional and engaging tone
- Describe the role's purpose, impact, and team context
- Do NOT mention AI or machine learning unless the role is specifically about it
- Do NOT fabricate information
- Base content ONLY on provided job data
- Do NOT include responsibilities or requirements (those are separate sections)`;

      userPrompt = `Write an "About the Role" description for this position:\n${jobContext}`;

      toolsDef = [{
        type: "function",
        function: {
          name: "return_description",
          description: "Return the generated role description",
          parameters: {
            type: "object",
            properties: {
              description: { type: "string", description: "The About the Role description, 2-4 paragraphs" }
            },
            required: ["description"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "return_description" } };

    } else if (type === "requirements") {
      const numItems = count || 8;
      const seniorityLevel = seniority || "Mid";

      systemPrompt = `You are an expert HR content writer for Lumofy, a B2B SaaS HRTech company. Generate structured job requirements.

RULES:
- Generate exactly ${numItems} requirements
- Seniority level: ${seniorityLevel}
- Group into "must_have" and "nice_to_have"
- Each requirement should be 1 clear sentence
- Do NOT invent specific tools, certifications, or years of experience unless directly implied by the job data
- Do NOT fabricate company benefits
- Keep requirements realistic and relevant
- Base content ONLY on provided job data`;

      userPrompt = `Generate requirements for this role:\n${jobContext}`;

      toolsDef = [{
        type: "function",
        function: {
          name: "return_requirements",
          description: "Return grouped job requirements",
          parameters: {
            type: "object",
            properties: {
              must_have: { type: "array", items: { type: "string" } },
              nice_to_have: { type: "array", items: { type: "string" } }
            },
            required: ["must_have", "nice_to_have"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "return_requirements" } };

    } else if (type === "responsibilities") {
      const numItems = count || 8;

      systemPrompt = `You are an expert HR content writer for Lumofy, a B2B SaaS HRTech company. Generate clear, action-driven job responsibilities.

RULES:
- Generate exactly ${numItems} responsibilities
- Each should start with an action verb
- Keep each to 1 clear sentence
- Do NOT fabricate tools or technologies not implied by the role
- Base content ONLY on provided job data`;

      userPrompt = `Generate responsibilities for this role:\n${jobContext}`;

      toolsDef = [{
        type: "function",
        function: {
          name: "return_responsibilities",
          description: "Return job responsibilities",
          parameters: {
            type: "object",
            properties: {
              responsibilities: { type: "array", items: { type: "string" } }
            },
            required: ["responsibilities"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "return_responsibilities" } };

    } else if (type === "screening_questions") {
      const numQuestions = count || 5;
      const seniorityLevel = seniority || "Mid";
      const focus = focusAreas || ["Role Skills"];
      const types = questionTypes || ["short_text", "yes_no"];

      systemPrompt = `You are an expert HR assessment designer for Lumofy, a B2B SaaS HRTech company. Generate grounded screening questions.

RULES:
- Generate exactly ${numQuestions} questions
- Seniority target: ${seniorityLevel}
- Focus areas: ${focus.join(", ")}
- Allowed question types: ${types.join(", ")}
- Each question MUST be grounded in the job data provided
- Do NOT ask about information not relevant to the role
- Include internal assessment notes for each question
- For multiple_choice type, provide 3-5 options
- Questions should help identify the best candidates efficiently`;

      userPrompt = `Generate screening questions for this role:\n${jobContext}`;

      toolsDef = [{
        type: "function",
        function: {
          name: "return_questions",
          description: "Return screening questions",
          parameters: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    type: { type: "string", enum: ["short_text", "long_text", "yes_no", "number", "multiple_choice"] },
                    options: { type: "array", items: { type: "string" } },
                    required: { type: "boolean" },
                    assesses: { type: "string", description: "What this question assesses" },
                    ideal_indicators: { type: "string", description: "Ideal answer indicators" }
                  },
                  required: ["question", "type", "required", "assesses", "ideal_indicators"],
                  additionalProperties: false
                }
              }
            },
            required: ["questions"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "return_questions" } };

    } else {
      return new Response(JSON.stringify({ error: "Invalid type. Use: summary, requirements, responsibilities, screening_questions" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // If we have JD file as base64 and type is screening_questions, send multimodal
    if (jdExtractedText && type === "screening_questions") {
      const ext = jdFilePath?.split(".").pop()?.toLowerCase() || "pdf";
      let mimeType = "application/pdf";
      if (ext === "doc") mimeType = "application/msword";
      else if (ext === "docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${jdExtractedText}` } },
        ],
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const response = await chatCompletion({
      model: "google/gemini-3-flash-preview",
      messages,
      tools: toolsDef,
      tool_choice: toolChoice,
      hasImages: Boolean(jdExtractedText && type === "screening_questions"),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    if (toolCall) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse tool call:", toolCall);
        throw new Error("Failed to parse AI response");
      }
    } else {
      // Fallback: try to parse content as JSON
      const content = data.choices?.[0]?.message?.content || "";
      try {
        let cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const jsonStart = cleaned.indexOf("{");
        const jsonEnd = cleaned.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
        }
        result = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse AI content:", content);
        throw new Error("Failed to parse AI response");
      }
    }

    return new Response(JSON.stringify({ result, type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-job-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
