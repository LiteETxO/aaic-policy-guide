import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an AI Policy Interpretation and Decision Support Assistant for the Addis Ababa Investment Commission (AAIC).

Your primary responsibility is to accurately read, comprehend, and index all relevant documents before performing any policy interpretation or compliance analysis.

❗ You are PROHIBITED from performing policy analysis unless document comprehension is explicitly completed and verified.

═══════════════════════════════════════════════════════════════════════════════
1️⃣ MANDATORY DOCUMENT READING PHASE (NO EXCEPTIONS)
═══════════════════════════════════════════════════════════════════════════════

Before issuing any compliance reasoning, you must complete Document Comprehension Mode.

Documents to be read:
- Policy Library documents (admin-managed)
- Capital Goods List / Annexes
- Uploaded case documents:
  - Investment License
  - Invoice(s)
  - Supporting documents

═══════════════════════════════════════════════════════════════════════════════
2️⃣ DOCUMENT COMPREHENSION CHECKLIST (REQUIRED OUTPUT)
═══════════════════════════════════════════════════════════════════════════════

You must explicitly confirm that you have read and understood each document.

For each document, produce:

📄 Document Acknowledgment Block:
- Document Name
- Document Type (Policy / License / Invoice / Annex / Supporting)
- Language(s) detected (Amharic / English / Mixed)
- Page count
- OCR confidence (High / Medium / Low)
- Key sections detected (articles, annexes, tables)
- Any unreadable or missing pages

❌ If any required document is missing or unreadable:
- STOP analysis
- Output: "Document ingestion incomplete — analysis blocked."

═══════════════════════════════════════════════════════════════════════════════
3️⃣ POLICY DOCUMENT INDEXING (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════

For each Policy Library document, you must build an internal index before analysis:

🧭 Policy Index (Internal + Displayable):
- Article / Section number
- Page number
- Clause heading (short)
- Scope of application
- Keywords (capital goods, machinery, equipment, exclusions, etc.)

If a referenced annex (e.g., Capital Goods List) is missing:
Output: "Referenced policy annex not found in Policy Library — compliance analysis cannot proceed."

═══════════════════════════════════════════════════════════════════════════════
4️⃣ LICENSE & INVOICE UNDERSTANDING GATE
═══════════════════════════════════════════════════════════════════════════════

Investment License Understanding:
Extract and summarize:
- Licensed activity (exact wording)
- Scope limitations
- Conditions or restrictions

Invoice Understanding:
For each invoice:
- Number of line items
- Presence of specs/models
- Ambiguous or unclear item names

If understanding is partial:
- Flag what is missing
- Do NOT infer

═══════════════════════════════════════════════════════════════════════════════
5️⃣ ANALYSIS PERMISSION GATE (STRICT)
═══════════════════════════════════════════════════════════════════════════════

You may proceed to Policy Analysis Mode ONLY if:
✅ All policy documents are read
✅ Capital Goods List is present (if required)
✅ License text is clearly extracted
✅ Invoice items are readable
✅ No unresolved ingestion errors remain

If all conditions are met, explicitly state:
"All required documents have been read, indexed, and understood. Proceeding to policy-based compliance analysis."

═══════════════════════════════════════════════════════════════════════════════
6️⃣ POLICY ANALYSIS RULES (Post-Gate Only)
═══════════════════════════════════════════════════════════════════════════════

Once the gate is passed:

A) NAME MISMATCH HANDLING
Invoice item names often differ from policy list entries. You must NOT rely on string matching alone.

STEP 1 — Normalize the Invoice Item:
- Clean item name (remove brand marketing wording)
- Category (electrical, mechanical, ICT, safety, infrastructure)
- Specs/model numbers (voltage, capacity, kVA, kW, dimensions)
- Intended use (if stated)

STEP 2 — Matching Strategy (Strict Order):

1. Exact Match (High confidence)
   - Item matches a policy entry directly (or near-identical wording)
   - Proceed to license alignment

2. Semantic / Alias Match (AI judgment allowed, but controlled)
   - If no exact match, propose up to 3 candidate policy entries
   - For each candidate, provide:
     - Similarities (function/spec/category)
     - Differences (spec/terminology)
     - Match confidence: High / Medium / Low
   - Accept semantic match ONLY if:
     - Confidence is ≥ Medium, AND
     - Supporting evidence exists in documents

EVIDENCE GATE:
If evidence is missing or match confidence is Low:
- Do NOT approve
- Output: "Requires Clarification" + request minimum missing evidence

B) LICENSE ALIGNMENT CHECK (Always Required)
Even if listed/mapped, confirm item supports the licensed investment activity.
If not aligned: Not Eligible.

C) ESSENTIALITY RULE (Not Listed but Necessary)
If item cannot be reliably matched to Capital Goods List, apply essentiality:
An item may qualify if ALL are true:
1. Essential: operation cannot run safely/at-scale without it
2. Direct operational role (not admin/luxury)
3. Capital nature (non-consumable, durable)
4. Not explicitly excluded by Policy Library

═══════════════════════════════════════════════════════════════════════════════
7️⃣ BEHAVIORAL GUARDRAILS
═══════════════════════════════════════════════════════════════════════════════

- NEVER assume policy content
- NEVER analyze based on partial reading
- NEVER proceed silently if a document is unclear
- Prefer blocking analysis over guessing
- NEVER invent matches
- NEVER approve based on intuition without evidence
- If uncertain: choose Requires Clarification, not approval
- Be conservative, transparent, and consistent
- Support Amharic and English, including mixed-language content

═══════════════════════════════════════════════════════════════════════════════
8️⃣ WHAT GOOD LOOKS LIKE (AAIC Standard)
═══════════════════════════════════════════════════════════════════════════════

An AAIC officer should see:
1️⃣ Proof that the AI read the documents
2️⃣ Clear identification of policy structure
3️⃣ Transparent reasoning grounded in cited clauses
4️⃣ Zero "black box" jumps

═══════════════════════════════════════════════════════════════════════════════
9️⃣ CRITICAL: COMPLETE ITEM ANALYSIS REQUIREMENT (MANDATORY)
═══════════════════════════════════════════════════════════════════════════════

You MUST analyze EVERY SINGLE line item from the invoice(s). NO ITEM MAY BE SKIPPED OR OMITTED.

STRICT RULES:
- If the invoice contains 25 line items, you MUST produce exactly 25 entries in complianceItems
- If an item is ambiguous or unclear, STILL include it with "Requires Clarification" status
- If an item cannot be matched to any policy entry, STILL include it with appropriate reasoning
- If an item description is partially readable, STILL include it and note the readability issue
- The count of complianceItems MUST EQUAL invoiceUnderstanding.totalLineItems

FOR EACH ITEM YOU MUST PROVIDE:
- itemNumber (sequential, matching invoice order)
- invoiceItem (exact text from invoice, even if unclear)
- normalizedName (your best interpretation)
- eligibilityStatus (one of the defined statuses)
- licenseAlignment (assessment)
- citations (at least one policy reference)
- reasoning (at least one reasoning point)

VALIDATION CHECK:
Before outputting, verify that:
complianceItems.length === invoiceUnderstanding.totalLineItems

If they don't match, you MUST add the missing items before responding.

NEVER:
- Skip items because they seem similar to others
- Group multiple items into one entry
- Omit items because analysis is uncertain
- Stop early due to length constraints

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON - REQUIRED)
═══════════════════════════════════════════════════════════════════════════════

{
  "documentComprehension": {
    "gateStatus": "PASSED | BLOCKED",
    "blockedReason": "reason if blocked, null otherwise",
    "documents": [
      {
        "documentName": "name",
        "documentType": "Policy | License | Invoice | Annex | Supporting",
        "languagesDetected": ["English", "Amharic"],
        "pageCount": 0,
        "ocrConfidence": "High | Medium | Low",
        "keySectionsDetected": ["articles", "annexes", "tables"],
        "unreadablePages": [],
        "readStatus": "Complete | Partial | Failed"
      }
    ],
    "policyIndex": [
      {
        "documentName": "policy doc name",
        "articleSection": "Article X / Section Y",
        "pageNumber": 0,
        "clauseHeading": "short heading",
        "scopeOfApplication": "what it covers",
        "keywords": ["capital goods", "machinery"]
      }
    ],
    "licenseUnderstanding": {
      "licensedActivity": "exact wording",
      "scopeLimitations": "limitations",
      "conditions": "restrictions",
      "extractionStatus": "Complete | Partial | Failed"
    },
    "invoiceUnderstanding": {
      "totalLineItems": 0,
      "itemsWithSpecs": 0,
      "ambiguousItems": 0,
      "readabilityStatus": "Good | Partial | Poor"
    },
    "analysisPermissionStatement": "All required documents have been read, indexed, and understood. Proceeding to policy-based compliance analysis." 
  },
  "executiveSummary": {
    "overallStatus": "Likely Compliant | Mixed | Likely Non-Compliant | Insufficient Evidence | Analysis Blocked",
    "eligibleCount": 0,
    "clarificationCount": 0,
    "notEligibleCount": 0,
    "topIssues": ["issue1", "issue2", "issue3"],
    "additionalInfoNeeded": ["info1", "info2"]
  },
  "licenseSnapshot": {
    "licensedActivity": "exact wording from license",
    "sector": "sector/sub-sector",
    "scopeOfOperation": "description",
    "restrictions": "any limitations",
    "licenseNumber": "if present",
    "issueDate": "if present"
  },
  "complianceItems": [
    {
      "itemNumber": 1,
      "invoiceItem": "raw text from invoice",
      "normalizedName": "clean short name",
      "category": "electrical | mechanical | ICT | safety | infrastructure | other",
      "specs": "voltage, capacity, model numbers if available",
      "invoiceRef": "invoice reference",
      "matchResult": "Exact | Mapped | Not Matched",
      "matchCandidates": [
        {
          "policyEntry": "entry from Capital Goods List",
          "similarities": "function/spec/category similarities",
          "differences": "spec/terminology differences",
          "confidence": "High | Medium | Low"
        }
      ],
      "eligibilityStatus": "Eligible – Listed Capital Good | Eligible – Listed Capital Good (Mapped) | Eligible – Essential Capital Good (Not Listed) | Requires Clarification | Not Eligible",
      "eligibilityPath": "Path A (Listed) | Path A (Mapped) | Path B (Essential) | Path C (Not Eligible) | Unclear",
      "licenseAlignment": "Aligned | Conditional | Needs Clarification | Not Aligned",
      "licenseEvidence": "quote or paraphrase from license",
      "citations": [
        {
          "documentName": "policy document name",
          "articleSection": "Article/Annex/Item X.Y.Z",
          "pageNumber": 0,
          "quote": "≤25 word quote",
          "relevance": "why this clause applies"
        }
      ],
      "essentialityAnalysis": {
        "functionalNecessity": "explanation if Path B",
        "operationalLink": "direct technical/operational role",
        "capitalNature": "enduring use assessment",
        "noProhibition": "no explicit exclusion found"
      },
      "reasoning": [
        {
          "point": "reasoning statement (policy → license → item function)",
          "type": "listed-match | mapped-match | essential-inclusion | exclusion | ambiguity"
        }
      ]
    }
  ],
  "analysisCompleteness": {
    "totalInvoiceItems": 0,
    "analyzedItems": 0,
    "isComplete": true,
    "skippedItems": [],
    "completenessNote": "All X items from invoice have been analyzed"
  },
  "officerActionsNeeded": [
    {
      "type": "missing-evidence | unreadable | conflict | policy-gap | ambiguous-mapping | document-ingestion-blocked",
      "description": "what action is needed",
      "severity": "high | medium | low",
      "relatedItems": [1, 2]
    }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { licenseText, invoiceText, policyDocuments } = await req.json();

    console.log("Starting document analysis...");
    console.log("License text length:", licenseText?.length || 0);
    console.log("Invoice text length:", invoiceText?.length || 0);
    console.log("Policy documents count:", policyDocuments?.length || 0);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build policy context from all provided policy documents
    let policyContext = "";
    if (policyDocuments && policyDocuments.length > 0) {
      policyContext = policyDocuments.map((doc: any, index: number) => {
        return `
=== POLICY DOCUMENT ${index + 1}: ${doc.name} ===
Directive Number: ${doc.directive_number || "N/A"}
Effective Date: ${doc.effective_date || "N/A"}
Version: ${doc.version || "1.0"}

CONTENT:
${doc.content_markdown || doc.content_text || "No content available"}
===END OF DOCUMENT ${index + 1}===
`;
      }).join("\n\n");
    } else {
      policyContext = "NO POLICY DOCUMENTS PROVIDED - Cannot perform compliance analysis without policy library.";
    }

    // Pre-count invoice items to enforce completeness
    const invoiceItemPattern = /(?:Item\s*(?:No\.?|#)?\s*(\d+))|(?:^(\d+)[\.\)]\s+[A-Za-z])|(?:^\d+\s+[A-Z][a-z])/gm;
    const invoiceMatches = (invoiceText || "").match(invoiceItemPattern);
    const estimatedItemCount = invoiceMatches?.length || 0;

    const userPrompt = `
POLICY LIBRARY (Source of Truth):
${policyContext}

INVESTMENT LICENSE:
${licenseText || "No license document provided"}

COMMERCIAL INVOICE(S):
${invoiceText || "No invoice document provided"}

═══════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL COMPLETENESS REQUIREMENT ⚠️
═══════════════════════════════════════════════════════════════════════════════
${estimatedItemCount > 0 ? `DETECTED APPROXIMATELY ${estimatedItemCount} LINE ITEMS IN THE INVOICE.` : "Count all line items in the invoice carefully."}

You MUST:
1. Count the EXACT number of line items in the invoice
2. Set invoiceUnderstanding.totalLineItems to this exact count
3. Produce EXACTLY that many entries in complianceItems array
4. Verify complianceItems.length === totalLineItems before responding
5. Set analysisCompleteness.isComplete = true ONLY if all items are analyzed

DO NOT skip, group, or omit any items. Each invoice line = one complianceItems entry.
═══════════════════════════════════════════════════════════════════════════════

Please analyze ALL invoice items against the investment license and policy documents. 
First complete the mandatory Document Comprehension Phase, then proceed to policy-based compliance analysis only if the gate is passed.
Provide your analysis in the specified JSON format with traceable citations for every compliance determination.
REMEMBER: Every single invoice item must appear in your complianceItems array.
`;

    console.log("Calling AI gateway...");

    const body: any = {
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 32000,
      // Use tool-calling to force a valid JSON payload (much more reliable than free-form JSON text).
      tools: [
        {
          type: "function",
          function: {
            name: "return_policy_analysis",
            description: "Return the full analysis as a single JSON object matching the required output format.",
            parameters: {
              type: "object",
              properties: {
                documentComprehension: { 
                  type: "object",
                  required: ["gateStatus"],
                  properties: {
                    gateStatus: { type: "string", enum: ["PASSED", "BLOCKED"] },
                    blockedReason: { type: "string" },
                    documents: { type: "array" },
                    policyIndex: { type: "array" },
                    licenseUnderstanding: { type: "object" },
                    invoiceUnderstanding: { type: "object" },
                    analysisPermissionStatement: { type: "string" }
                  }
                },
                executiveSummary: { 
                  type: "object",
                  required: ["overallStatus", "topIssues"],
                  properties: {
                    overallStatus: { type: "string" },
                    eligibleCount: { type: "number" },
                    clarificationCount: { type: "number" },
                    notEligibleCount: { type: "number" },
                    topIssues: { type: "array", items: { type: "string" } },
                    additionalInfoNeeded: { type: "array", items: { type: "string" } }
                  }
                },
                licenseSnapshot: { 
                  type: "object",
                  required: ["licensedActivity"],
                  properties: {
                    licensedActivity: { type: "string" },
                    sector: { type: "string" },
                    scopeOfOperation: { type: "string" },
                    restrictions: { type: "string" }
                  }
                },
                complianceItems: { 
                  type: "array", 
                  minItems: 1,
                  items: { 
                    type: "object",
                    required: ["itemNumber", "invoiceItem", "normalizedName", "eligibilityStatus", "licenseAlignment"],
                    properties: {
                      itemNumber: { type: "number" },
                      invoiceItem: { type: "string" },
                      normalizedName: { type: "string" },
                      eligibilityStatus: { type: "string" },
                      licenseAlignment: { type: "string" },
                      citations: { type: "array" },
                      reasoning: { type: "array" }
                    }
                  }
                },
                analysisCompleteness: { 
                  type: "object",
                  required: ["totalInvoiceItems", "analyzedItems", "isComplete"],
                  properties: {
                    totalInvoiceItems: { type: "number" },
                    analyzedItems: { type: "number" },
                    isComplete: { type: "boolean" },
                    completenessNote: { type: "string" }
                  }
                },
                officerActionsNeeded: { type: "array", items: { type: "object" } },
              },
              required: [
                "documentComprehension",
                "executiveSummary",
                "licenseSnapshot",
                "complianceItems",
                "analysisCompleteness",
                "officerActionsNeeded",
              ],
              additionalProperties: true,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_policy_analysis" } },
    };

    // Create abort controller for timeout (keep under typical client/proxy limits)
    const controller = new AbortController();
    const timeoutMs = 55_000;
    const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      const isAbort = fetchError?.name === "AbortError" || fetchError?.message?.includes?.("aborted");
      if (isAbort) {
        console.error(`AI gateway request timed out after ${timeoutMs}ms`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Analysis timed out. Try again with fewer invoice items or shorter policy documents.",
            code: "TIMEOUT",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            response.status === 429
              ? "Rate limit exceeded. Please try again later."
              : response.status === 402
                ? "AI credits exhausted. Please add funds to continue."
                : "AI service returned an error. Please retry.",
          code: `AI_GATEWAY_${response.status}`,
          rawErrorSnippet: errorText.slice(0, 1500),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let aiResponse: any;
    try {
      aiResponse = await response.json();
    } catch (jsonError) {
      console.error("Failed to parse AI gateway response as JSON:", jsonError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid response from AI service. Please try again.",
          code: "AI_GATEWAY_INVALID_JSON",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.log("AI response received");

    // OpenAI-compatible responses typically use `choices[0].message`.
    // Some providers return structured content (arrays/parts). Be defensive.
    const choice = aiResponse?.choices?.[0];
    const msg = choice?.message;
    const finishReason = choice?.finish_reason ?? choice?.finishReason ?? null;

    const tryParseJson = (input: string) => {
      const trimmed = input.trim();
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    };

    const stripCodeFences = (text: string) => {
      let s = text.trim();
      if (s.startsWith("```json")) s = s.slice(7);
      else if (s.startsWith("```")) s = s.slice(3);
      if (s.endsWith("```")) s = s.slice(0, -3);
      return s.trim();
    };

    const extractJsonObject = (text: string) => {
      const s = stripCodeFences(text);
      const first = s.indexOf("{");
      const last = s.lastIndexOf("}");
      if (first !== -1 && last !== -1 && last > first) return s.slice(first, last + 1);
      return null;
    };

    const repairJson = (text: string) => {
      // Remove common trailing commas that break JSON parsing.
      return text.replace(/,\s*([}\]])/g, "$1");
    };

    const parseFromText = (text: string) => {
      const cleaned = stripCodeFences(text);
      const direct = tryParseJson(cleaned);
      if (direct) return direct;

      const extracted = extractJsonObject(cleaned);
      if (extracted) {
        const extractedDirect = tryParseJson(extracted);
        if (extractedDirect) return extractedDirect;
        const repaired = tryParseJson(repairJson(extracted));
        if (repaired) return repaired;
      }

      const repairedDirect = tryParseJson(repairJson(cleaned));
      if (repairedDirect) return repairedDirect;

      return null;
    };

    const truncate = (s: string, max = 8000) =>
      s.length > max ? `${s.slice(0, max)}\n...[truncated ${s.length - max} chars]` : s;

    const extractText = (value: any): string => {
      if (!value) return "";
      if (typeof value === "string") return value;
      if (Array.isArray(value)) {
        // e.g. [{type:"text", text:"..."}] or [{text:"..."}] etc.
        return value.map((p) => (typeof p === "string" ? p : (p?.text ?? p?.content ?? ""))).join("");
      }
      if (typeof value === "object") {
        // e.g. { text: "..." } or { parts: [...] }
        if (typeof (value as any).text === "string") return (value as any).text;
        if (Array.isArray((value as any).parts)) return extractText((value as any).parts);
        if (Array.isArray((value as any).content)) return extractText((value as any).content);
      }
      return "";
    };

    // Prefer tool-call arguments (forced JSON), otherwise fallback to text parsing.
    const toolArgsCandidate = (msg as any)?.tool_calls?.[0]?.function?.arguments ??
      (msg as any)?.function_call?.arguments ??
      (msg as any)?.toolCalls?.[0]?.function?.arguments;

    const toolArgs = typeof toolArgsCandidate === "string"
      ? toolArgsCandidate
      : (toolArgsCandidate ? JSON.stringify(toolArgsCandidate) : undefined);

    // Some models return structured content arrays; extract into a plain string.
    const content: string = extractText((msg as any)?.content);

    let analysisResult: any = null;

    if (toolArgs) {
      analysisResult = parseFromText(toolArgs);
    }

    if (!analysisResult && content) {
      analysisResult = parseFromText(content);
    }

    // If the gateway returned an error-like payload with no message, surface that.
    if (!analysisResult && !toolArgs && !content) {
      const aiSnippet = truncate(JSON.stringify(aiResponse ?? {}), 2000);
      console.error("AI response had no content/tool args", { finishReason, aiSnippet });
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI returned an empty response. Please retry.",
          code: "AI_EMPTY_RESPONSE",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!analysisResult) {
      const raw = toolArgs || content || "";
      const reason = finishReason === "length" ? "MODEL_OUTPUT_TRUNCATED" : "INVALID_JSON";
      console.error("Failed to parse AI response as JSON", {
        finishReason,
        reason,
        hasToolArgs: !!toolArgs,
        contentLen: content.length,
      });

      // IMPORTANT: Do NOT echo the full raw model output back to the client (it can be huge and break the connection).
      return new Response(
        JSON.stringify({
          success: false,
          error:
            reason === "MODEL_OUTPUT_TRUNCATED"
              ? "AI output was truncated. Try shorter policy docs or fewer invoice items."
              : "AI returned an invalid response. Please retry.",
          parseError: true,
          parseErrorReason: reason,
          rawResponseSnippet: truncate(raw),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate that the analysis actually contains meaningful data
    const isEmptyAnalysis = (
      !analysisResult.parseError &&
      (!analysisResult.complianceItems || analysisResult.complianceItems.length === 0) &&
      (!analysisResult.documentComprehension?.gateStatus ||
        (analysisResult.documentComprehension?.gateStatus === "PASSED" && !analysisResult.executiveSummary?.overallStatus))
    );

    if (isEmptyAnalysis) {
      console.error("AI returned empty analysis structure:", {
        hasDocComprehension: !!analysisResult.documentComprehension,
        gateStatus: analysisResult.documentComprehension?.gateStatus,
        hasExecSummary: !!analysisResult.executiveSummary,
        complianceItemsCount: analysisResult.complianceItems?.length || 0,
        hasLicenseSnapshot: !!analysisResult.licenseSnapshot,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Analysis failed to produce results. Try with: (1) fewer invoice items, (2) shorter policy documents, or (3) simpler documents.",
          parseError: true,
          parseErrorReason: "EMPTY_ANALYSIS_RESULT",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Log analysis summary for debugging
    console.log("Analysis result summary:", {
      hasDocComprehension: !!analysisResult.documentComprehension,
      gateStatus: analysisResult.documentComprehension?.gateStatus,
      hasExecSummary: !!analysisResult.executiveSummary,
      overallStatus: analysisResult.executiveSummary?.overallStatus,
      complianceItemsCount: analysisResult.complianceItems?.length || 0,
      hasLicenseSnapshot: !!analysisResult.licenseSnapshot,
      isComplete: analysisResult.analysisCompleteness?.isComplete,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: analysisResult 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        code: "UNHANDLED_ERROR",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
