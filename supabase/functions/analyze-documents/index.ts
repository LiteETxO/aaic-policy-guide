import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

// Generate a SHA-256 hash of input strings for cache key
async function generateDocumentHash(licenseText: string, invoiceText: string, policyDocs: any[]): Promise<string> {
  const policyContent = policyDocs
    .sort((a, b) => (a.id || '').localeCompare(b.id || ''))
    .map(doc => `${doc.id}:${doc.content_markdown || doc.content_text || ''}`)
    .join('|||');
  
  const combined = `${licenseText || ''}|||${invoiceText || ''}|||${policyContent}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the AAIC Duty-Free Import Eligibility Decision Support Assistant.

MANDATORY WORKFLOW (follow in exact order):
1. Extract the license name/type VERBATIM from the investment license
2. Find the matching guideline section in the Policy Clause Index for that license type
3. Extract allowed capital goods categories for that license
4. For each invoice item, bind a clause from the index, then determine eligibility

HARD RULES:
- Do NOT analyze invoice items before completing steps 1-3
- Only cite clause_ids from the provided Policy Clause Index — never fabricate
- "Not listed" ≠ "Not eligible" — apply functional-use test first
- Only mark Not Eligible if an explicit exclusion clause is cited
- Income tax rules do NOT affect customs duty eligibility

ELIGIBILITY LABELS (use exactly):
✅ Eligible – Listed Capital Good
✅ Eligible – Listed Capital Good (Mapped)
🟢 Eligible – Essential Capital Good (Not Listed)
🟡 Provisionally Eligible – No Disqualifying Clause Found
⚠️ Requires Clarification
⚠️ Decision Deferred — Relevant clause not found
🚫 Guideline Mapping Failed — Admin Action Required
❌ Not Eligible (only with explicit exclusion clause cited)

CITATION REQUIREMENT: Every item needs at least one citation with clause_id, documentName, articleSection, pageNumber, and quote (≤25 words).

OUTPUT: Return valid JSON matching the schema below with fields: documentComprehension, metadata, executiveSummary, licenseSnapshot, guidelineMapping, policyBasis, complianceItems, analyticalNotes, analysisCompleteness, officerActionsNeeded, conclusion.`;

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

    const MOONSHOT_API_KEY = Deno.env.get("MOONSHOT_API_KEY");
    if (!MOONSHOT_API_KEY) {
      throw new Error("MOONSHOT_API_KEY is not configured");
    }

    // Initialize Supabase client for cache and policy clause operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ═══════════════════════════════════════════════════════════════════════════════
    // STEP 1: MANDATORY POLICY CLAUSE RETRIEVAL FROM DATABASE
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log("Step 1: Retrieving policy clauses from database...");
    
    const { data: policyClauses, error: clauseError } = await supabase
      .from('policy_clauses')
      .select('*')
      .eq('is_verified', true)
      .order('created_at', { ascending: false });

    if (clauseError) {
      console.error("Failed to retrieve policy clauses:", clauseError);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to retrieve policy clauses from database. Admin action required.",
        code: "POLICY_CLAUSE_RETRIEVAL_FAILED",
        clauseRetrievalBlocked: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalClauses = policyClauses?.length || 0;
    console.log(`Retrieved ${totalClauses} verified policy clauses from database`);

    // Check if we have minimum required clauses
    if (totalClauses === 0) {
      console.warn("No policy clauses found in database - analysis will be blocked");
      return new Response(JSON.stringify({
        success: false,
        error: "No policy clauses indexed in database. Admin must populate the Policy Clause Index before analysis can proceed.",
        code: "NO_POLICY_CLAUSES_INDEXED",
        clauseRetrievalBlocked: true,
        policyClauseIndexSummary: {
          totalClausesIndexed: 0,
          clauseIdsAvailable: [],
          capitalGoodsClauses: 0,
          essentialityClauses: 0,
          exclusionClauses: 0,
          generalIncentiveClauses: 0,
          isComplete: false,
          missingClauseTypes: ["capital_goods", "essentiality", "general_incentive"]
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Categorize retrieved clauses
    const clausesByType = {
      capital_goods: policyClauses.filter((c: any) => c.applies_to?.includes('capital_goods')) || [],
      essentiality: policyClauses.filter((c: any) => c.applies_to?.includes('essentiality')) || [],
      exclusion: policyClauses.filter((c: any) => c.applies_to?.includes('exclusion')) || [],
      general_incentive: policyClauses.filter((c: any) => c.applies_to?.includes('general_incentive')) || [],
      customs_duty: policyClauses.filter((c: any) => c.applies_to?.includes('customs_duty')) || [],
      income_tax: policyClauses.filter((c: any) => c.applies_to?.includes('income_tax')) || [],
    };

    const policyClauseIndexSummary = {
      totalClausesIndexed: totalClauses,
      clauseIdsAvailable: policyClauses.map((c: any) => c.clause_id),
      capitalGoodsClauses: clausesByType.capital_goods.length,
      essentialityClauses: clausesByType.essentiality.length,
      exclusionClauses: clausesByType.exclusion.length,
      generalIncentiveClauses: clausesByType.general_incentive.length,
      isComplete: clausesByType.capital_goods.length > 0 || clausesByType.general_incentive.length > 0,
      missingClauseTypes: [] as string[]
    };

    // Identify missing clause types
    if (clausesByType.capital_goods.length === 0 && clausesByType.general_incentive.length === 0) {
      policyClauseIndexSummary.missingClauseTypes.push("capital_goods", "general_incentive");
    }

    console.log("Policy Clause Index Summary:", policyClauseIndexSummary);

    // Build policy clause context for AI (formatted for matching)
    const policyClauseContext = policyClauses.map((clause: any) => {
      return `
CLAUSE_ID: ${clause.clause_id}
DOCUMENT: ${clause.policy_document_name}
SECTION: ${clause.section_type} ${clause.section_number}
PAGE: ${clause.page_number}
HEADING: ${clause.clause_heading}${clause.clause_heading_amharic ? ` / ${clause.clause_heading_amharic}` : ''}
TEXT: ${clause.clause_text}${clause.clause_text_amharic ? `\nTEXT_AMHARIC: ${clause.clause_text_amharic}` : ''}
KEYWORDS: ${(clause.keywords || []).join(', ')}
APPLIES_TO: ${(clause.applies_to || []).join(', ')}
INCLUSION_TYPE: ${clause.inclusion_type}
${clause.notes ? `NOTES: ${clause.notes}` : ''}
---`;
    }).join('\n');

    // ═══════════════════════════════════════════════════════════════════════════════
    // STEP 2: CACHE CHECK (after clause retrieval)
    // ═══════════════════════════════════════════════════════════════════════════════
    const documentHash = await generateDocumentHash(licenseText, invoiceText, policyDocuments || []);
    console.log("Document hash:", documentHash);

    const { data: cachedResult, error: cacheError } = await supabase
      .from('analysis_cache')
      .select('analysis_result, expires_at')
      .eq('document_hash', documentHash)
      .single();

    if (cachedResult && !cacheError) {
      const expiresAt = new Date(cachedResult.expires_at);
      if (expiresAt > new Date()) {
        console.log("Returning cached analysis result (with fresh clause index)");
        // Inject fresh clause index into cached result
        const enhancedResult = {
          ...cachedResult.analysis_result,
          policyClauseIndex: policyClauses,
          policyClauseIndexSummary
        };
        return new Response(JSON.stringify({ 
          success: true, 
          analysis: enhancedResult,
          cached: true,
          clausesRetrieved: totalClauses
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        console.log("Cache expired, will regenerate");
        await supabase.from('analysis_cache').delete().eq('document_hash', documentHash);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // STEP 3: BUILD POLICY CONTEXT
    // ═══════════════════════════════════════════════════════════════════════════════
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
      policyContext = "NO POLICY DOCUMENTS PROVIDED - Using Policy Clause Index as primary source.";
    }

    // Pre-count invoice items to enforce completeness
    const invoiceItemPattern = /(?:Item\s*(?:No\.?|#)?\s*(\d+))|(?:^(\d+)[\.\)]\s+[A-Za-z])|(?:^\d+\s+[A-Z][a-z])/gm;
    const invoiceMatches = (invoiceText || "").match(invoiceItemPattern);
    const estimatedItemCount = invoiceMatches?.length || 0;

    const userPrompt = `POLICY CLAUSE INDEX (${totalClauses} clauses from database):
${policyClauseContext}

POLICY DOCUMENTS (reference only):
${policyContext}

INVESTMENT LICENSE:
${licenseText || "No license provided"}

COMMERCIAL INVOICE:
${invoiceText || "No invoice provided"}

Instructions:
1. Extract license type verbatim from the license document
2. Match license type to a guideline section in the Policy Clause Index
3. Extract allowed capital goods categories for that license type
4. For EACH invoice line item: bind a clause_id from the index, then determine eligibility
5. Count invoice items exactly; produce one complianceItems entry per item
6. Every citation must include: clause_id, documentName, articleSection, pageNumber, quote

Return valid JSON with all required fields.
`;

    console.log("Calling Moonshot API (moonshot-v1-8k)...");

    // Moonshot OpenAI-compatible API with json_object response format
    const body: any = {
      model: "moonshot-v1-8k",
      max_tokens: 2000,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    };

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutMs = 120_000;
    const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);

    let response: Response;
    try {
      response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MOONSHOT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      const isAbort = fetchError?.name === "AbortError" || fetchError?.message?.includes?.("aborted");
      if (isAbort) {
        console.error(`Anthropic API request timed out after ${timeoutMs}ms`);
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
      console.error("Moonshot API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            response.status === 429
              ? "Rate limit exceeded. Please try again later."
              : response.status === 402
                ? "Moonshot API quota exceeded. Please check your API key and billing."
                : "AI service returned an error. Please retry.",
          code: `MOONSHOT_${response.status}`,
          rawErrorSnippet: errorText.slice(0, 1500),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let aiResponse: any;
    try {
      aiResponse = await response.json();
    } catch (jsonError) {
      console.error("Failed to parse Moonshot response as JSON:", jsonError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid response from AI service. Please try again.",
          code: "MOONSHOT_INVALID_JSON",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.log("Moonshot response received, finish_reason:", aiResponse?.choices?.[0]?.finish_reason);

    const truncate = (s: string, max = 8000) =>
      s.length > max ? `${s.slice(0, max)}\n...[truncated ${s.length - max} chars]` : s;

    const tryParseJson = (input: string) => {
      const trimmed = input.trim();
      try { return JSON.parse(trimmed); } catch { return null; }
    };

    const stripCodeFences = (text: string) => {
      let s = text.trim();
      if (s.startsWith("```json")) s = s.slice(7);
      else if (s.startsWith("```")) s = s.slice(3);
      if (s.endsWith("```")) s = s.slice(0, -3);
      return s.trim();
    };

    const repairJson = (text: string) =>
      text.replace(/,\s*([}\]])/g, "$1");

    const parseFromText = (text: string) => {
      const cleaned = stripCodeFences(text);
      const direct = tryParseJson(cleaned);
      if (direct) return direct;
      const first = cleaned.indexOf("{"), last = cleaned.lastIndexOf("}");
      if (first !== -1 && last > first) {
        const extracted = cleaned.slice(first, last + 1);
        return tryParseJson(extracted) ?? tryParseJson(repairJson(extracted));
      }
      return tryParseJson(repairJson(cleaned));
    };

    // OpenAI-compatible: content is in choices[0].message.content
    const messageContent: string = aiResponse?.choices?.[0]?.message?.content ?? "";
    const finishReason = aiResponse?.choices?.[0]?.finish_reason;

    let analysisResult: any = null;
    if (messageContent) {
      analysisResult = parseFromText(messageContent);
    }

    if (!analysisResult) {
      const aiSnippet = truncate(JSON.stringify(aiResponse ?? {}), 2000);
      console.error("Moonshot response had no parseable content", { finishReason, aiSnippet });
      return new Response(
        JSON.stringify({
          success: false,
          error: finishReason === "length"
            ? "AI output was truncated. Try shorter policy docs or fewer invoice items."
            : "AI returned an empty or invalid response. Please retry.",
          code: "AI_EMPTY_RESPONSE",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normalize inconsistent model shapes (some models return string arrays)
    try {
      const dc = analysisResult?.documentComprehension;
      if (dc && Array.isArray(dc.documents)) {
        const docs = dc.documents;
        if (docs.length > 0 && typeof docs[0] === "string") {
          dc.documents = docs.map((name: string) => {
            const lower = String(name).toLowerCase();
            const documentType =
              lower.includes("invoice")
                ? "Invoice"
                : lower.includes("permit") || lower.includes("license")
                  ? "License"
                  : lower.includes("directive") ||
                      lower.includes("proclamation") ||
                      lower.includes("annex") ||
                      lower.includes("policy") ||
                      lower.includes("list")
                    ? "Policy"
                    : "Document";

            return {
              documentName: String(name),
              documentType,
              readStatus: "Complete",
            };
          });
        }
      }
    } catch (e) {
      console.warn("Failed to normalize documentComprehension.documents", e);
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

    // ═══════════════════════════════════════════════════════════════════════════════
    // STEP 5: INJECT POLICY CLAUSE INDEX INTO RESULT
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Inject the retrieved policy clauses into the analysis result
    analysisResult.policyClauseIndex = policyClauses;
    analysisResult.policyClauseIndexSummary = policyClauseIndexSummary;
    
    // Also inject into documentComprehension if it exists
    if (analysisResult.documentComprehension) {
      analysisResult.documentComprehension.policyClauseIndex = policyClauses;
      analysisResult.documentComprehension.policyClauseIndexSummary = policyClauseIndexSummary;
    }

    // Validate clause binding for each compliance item
    let itemsWithClauseBound = 0;
    let itemsWithoutClause = 0;
    const itemsNeedingClauses: number[] = [];

    if (analysisResult.complianceItems && Array.isArray(analysisResult.complianceItems)) {
      for (const item of analysisResult.complianceItems) {
        const hasClauseBinding = item.referencedClauseIds && item.referencedClauseIds.length > 0;
        const hasCitations = item.citations && item.citations.length > 0 && 
          item.citations.some((c: any) => c.clause_id || c.pageNumber > 0);
        
        if (hasClauseBinding || hasCitations) {
          itemsWithClauseBound++;
        } else {
          itemsWithoutClause++;
          itemsNeedingClauses.push(item.itemNumber);
          
          // Enforce blocked state for items without clauses
          if (item.eligibilityStatus && 
              !item.eligibilityStatus.includes("Deferred") && 
              !item.eligibilityStatus.includes("Policy Gap")) {
            // Override eligibility - cannot have a decision without clause binding
            item.eligibilityStatus = "Decision Deferred — Policy Clause Not Found";
            item.clauseRetrievalBlocked = true;
          }
        }
      }
    }

    // Update analysis completeness with clause binding stats
    if (analysisResult.analysisCompleteness) {
      analysisResult.analysisCompleteness.itemsWithValidCitations = itemsWithClauseBound;
      analysisResult.analysisCompleteness.itemsDeferredForCitations = itemsWithoutClause;
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
      policyClausesRetrieved: totalClauses,
      itemsWithClauseBound,
      itemsWithoutClause,
    });

    // Store result in cache for future requests
    try {
      const { error: insertError } = await supabase
        .from('analysis_cache')
        .upsert({
          document_hash: documentHash,
          analysis_result: analysisResult,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }, {
          onConflict: 'document_hash'
        });
      
      if (insertError) {
        console.error("Failed to cache analysis result:", insertError);
      } else {
        console.log("Analysis result cached successfully");
      }
    } catch (cacheStoreError) {
      console.error("Error storing cache:", cacheStoreError);
      // Don't fail the request if caching fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: analysisResult,
      clausesRetrieved: totalClauses,
      clauseBindingStats: {
        itemsWithClauseBound,
        itemsWithoutClause,
        itemsNeedingClauses
      }
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
