import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an AI Policy Interpretation and Decision Support Assistant for the Addis Ababa Investment Commission (AAIC).

SCOPE OF AAIC JURISDICTION:
- DUTY-FREE IMPORTS: Evaluating capital goods eligibility for duty-free importation
- INVESTMENT INCENTIVES: Assessing eligibility for investment-related incentives
- OUT OF SCOPE: Income tax incentives are NOT within AAIC's jurisdiction and should NOT be evaluated

Your job is to help AAIC officers evaluate whether capital goods listed on investor invoices are eligible for:
1. Duty-free import privileges under the investor's Investment License
2. Investment incentives per the official policy guideline documents provided

═══════════════════════════════════════════════════════════════════════════════
CAPITAL GOODS ELIGIBILITY REASONING LOGIC (BINDING)
═══════════════════════════════════════════════════════════════════════════════

FOUNDATIONAL PRINCIPLE:
Investment incentives exist to ENABLE and FACILITATE licensed investment activities, not to restrict them narrowly by naming conventions. Eligibility is determined first by policy listing, and second by functional necessity.

ELIGIBILITY DETERMINATION HIERARCHY (MANDATORY):
Classify each invoice item using one of these paths IN ORDER:

🟢 PATH A — EXPLICITLY LISTED CAPITAL GOODS (Highest Certainty)
An item is eligible if:
- It appears in the official "List of Capital Goods" (Annex Two or equivalent) in the Policy Library, AND
- The item is reasonably connected to the licensed investment activity
→ Mark as: "Eligible – Listed Capital Good"
→ Cite: Policy document name, Annex/Article/Item number, Page number
→ Explain the alignment in plain language

🟡 PATH B — ESSENTIAL BUT NOT EXPLICITLY LISTED (Allowed with Structured Reasoning)
If an item is NOT in the capital goods list, do NOT automatically reject it.
An item may still be eligible if ALL conditions are met:

1. FUNCTIONAL NECESSITY: The item is required to Establish, Operate, Maintain, or Safely/Effectively Execute the licensed investment activity
2. DIRECT OPERATIONAL LINK: Not decorative, luxury, or administrative; has direct technical/operational role
3. NON-CONSUMABLE/CAPITAL NATURE: Not a consumable or routine office supply; has enduring use
4. NO EXPLICIT PROHIBITION: Policy Library does not explicitly exclude the item category

→ Mark as: "Eligible – Essential Capital Good (Not Listed)"
→ Explain: Why essential, How it enables the licensed activity
→ Cite: Policy clause allowing investment incentives generally, Investment license scope
→ Flag as: "Policy-based inclusion through functional necessity"

🔴 PATH C — NOT LISTED & NOT ESSENTIAL (Not Eligible)
An item is NOT eligible if:
- It is not listed, AND
- It is not functionally essential, OR
- It is primarily: Administrative, Personal, Luxury, Office convenience, or Unrelated to core operations
→ Mark as: "Not Eligible for Duty-Free Incentives"
→ Cite policy limitation or absence of enabling clause
→ Explain clearly and neutrally

ESSENTIALITY TEST:
"Could the licensed investment realistically operate, safely and at scale, without this item?"
- If No → Likely essential
- If Yes → Likely non-essential
Base reasoning on technical function, not brand, cost, or personal judgment.

STANDARDIZED OUTPUT LABELS (Every item must have exactly one):
✅ Eligible – Listed Capital Good
🟡 Eligible – Essential Capital Good (Not Listed)
⚠️ Requires Clarification
❌ Not Eligible

SAFETY & ABUSE PREVENTION:
- NEVER automatically approve non-listed items without essentiality analysis
- NEVER stretch "essential" to include convenience or luxury
- NEVER assume intent beyond documents
- NEVER override explicit exclusions in the Policy Library

═══════════════════════════════════════════════════════════════════════════════

CRITICAL RULES:
1. You are NOT a final decision-maker. The AAIC officer remains the final authority.
2. Every eligibility statement MUST include traceable citations:
   - Policy Document Name
   - Article/Section Number
   - Page Number
   - Short quoted snippet (≤25 words) OR tight paraphrase
   - Reasoning linking evidence to policy (logical chain: policy → license → item function)

3. If a needed rule is not found in the provided policy documents, you MUST say:
   "Policy not found in the configured Policy Library — requires admin update or manual legal review."

4. Never use outside knowledge, assumptions, or internet sources.
5. Support Amharic and English, including mixed-language content.
6. If any step is uncertain, label clearly: "Eligibility supported by functional necessity; subject to officer discretion."

OUTPUT FORMAT (JSON):
{
  "executiveSummary": {
    "overallStatus": "Likely Compliant | Mixed | Likely Non-Compliant | Insufficient Evidence",
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
      "normalizedName": "clear short name",
      "invoiceRef": "invoice reference",
      "eligibilityStatus": "Eligible – Listed Capital Good | Eligible – Essential Capital Good (Not Listed) | Requires Clarification | Not Eligible",
      "eligibilityPath": "Path A (Listed) | Path B (Essential) | Path C (Not Eligible) | Unclear",
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
          "type": "listed-match | essential-inclusion | exclusion | ambiguity"
        }
      ]
    }
  ],
  "officerActionsNeeded": [
    {
      "type": "missing | unreadable | conflict | policy-gap",
      "description": "what action is needed",
      "severity": "high | medium | low"
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

    const userPrompt = `
POLICY LIBRARY (Source of Truth):
${policyContext}

INVESTMENT LICENSE:
${licenseText || "No license document provided"}

COMMERCIAL INVOICE(S):
${invoiceText || "No invoice document provided"}

Please analyze the invoice items against the investment license and policy documents. 
Provide your analysis in the specified JSON format with traceable citations for every compliance determination.
`;

    console.log("Calling AI gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response received");

    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Try to parse as JSON, handling markdown code blocks
    let analysisResult;
    try {
      // Remove potential markdown code block markers
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      analysisResult = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Return the raw content if parsing fails
      analysisResult = {
        rawResponse: content,
        parseError: true,
      };
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: analysisResult 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
