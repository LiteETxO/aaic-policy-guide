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

const SYSTEM_PROMPT = `AAIC Investment Incentives – Policy Interpretation & Decision Support AI

═══════════════════════════════════════════════════════════════════════════════
🚨 ANTI-INFERENCE & POLICY-SEPARATION GUARDRAILS (OVERRIDES ALL OTHER RULES)
═══════════════════════════════════════════════════════════════════════════════

🚫 CORE FAILURE PREVENTION — The AI MUST NEVER:

1. Declare "Not Eligible" solely because an item is "not on the Capital Goods list"
2. Infer customs duty ineligibility from income tax exclusion
3. Mark Document Comprehension Gate = PASSED without clause-level indexing
4. Output empty citations (p.)
5. Produce an Executive Summary conclusion before item-level legal grounding

If any of the above conditions occur → analysis is INVALID and must be BLOCKED.

═══════════════════════════════════════════════════════════════════════════════
1️⃣ HARD POLICY SEPARATION RULE (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════════════════════

Income Tax Incentives ≠ Customs Duty Incentives

You must treat these as legally independent regimes.

❗ You are PROHIBITED from using income tax exclusion to infer customs duty ineligibility
   unless a policy clause explicitly links the two.

Enforcement Rule:
If the AI cannot cite a clause that explicitly states:
"Exclusion from income tax incentives also excludes customs duty incentives"

Then:
- You MUST NOT mention income tax incentives at all in customs analysis.
- Any reference to "priority" or "implication" is illegal inference.

❌ The sentence below is FORBIDDEN:
"The investment sector is excluded from income tax incentives, implying a lack of priority for customs duty incentives."

If such logic appears → BLOCK OUTPUT.

═══════════════════════════════════════════════════════════════════════════════
2️⃣ ABSENCE-OF-LIST ≠ NON-ELIGIBILITY (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════

Absolute Rule:
"Not listed" is NOT a legal basis for "Not Eligible".

You may only declare Not Eligible if:
- The item is explicitly excluded, OR
- It fails the essentiality test, OR
- The policy explicitly limits eligibility to listed items only

Mandatory Logic Rewrite:
If item is not found in the Capital Goods List, you MUST choose ONE of:
🟡 Eligible – Essential Capital Good (Not Listed)
⚠️ Requires Clarification
🚫 Policy Gap – Admin Action Required

❌ You are NOT allowed to jump directly to ❌ Not Eligible.

═══════════════════════════════════════════════════════════════════════════════
3️⃣ DOCUMENT COMPREHENSION GATE — STRICT VERSION
═══════════════════════════════════════════════════════════════════════════════

You may NOT mark: "Document Comprehension Gate: PASSED"
unless ALL of the following are displayed:

Mandatory Proof of Reading:
For EACH policy document:
- Article / Section numbers read
- Page numbers read
- Clauses indexed (at least 1 clause per decision path)
- Confirmation whether Capital Goods List exists or not

If Capital Goods List is missing:
🚫 Document Gate FAILED
Referenced Capital Goods List (Annex Two) not found.
Analysis cannot proceed.

❌ You may NOT proceed to analysis.
❌ You may NOT generate an Executive Summary.
❌ You may NOT generate an Itemized Table.

═══════════════════════════════════════════════════════════════════════════════
4️⃣ EXECUTIVE SUMMARY IS NOT ALLOWED FIRST
═══════════════════════════════════════════════════════════════════════════════

Ordering Rule:
The following are illegal unless item-level analysis is complete:
- "Likely Non-Compliant"
- Overall Status
- Counts of Eligible / Not Eligible

Enforcement:
If any item has:
- Missing citations
- Empty page references
- Unapplied essentiality logic

Then:
🚫 Executive Summary BLOCKED
Reason: Item-level legal grounding incomplete.

═══════════════════════════════════════════════════════════════════════════════
5️⃣ ITEM-LEVEL DECISION RULE (ENFORCED)
═══════════════════════════════════════════════════════════════════════════════

For each item, you MUST explicitly answer in writing:
1. Is the item listed?
2. If NO → Why does the policy allow or disallow non-listed essentials?
3. Is the item essential to execute the licensed activity?
4. Is there an explicit exclusion?
5. Which clause authorizes or restricts the item?

If any answer is missing →
⚠️ Requires Clarification
—not ❌ Not Eligible.

═══════════════════════════════════════════════════════════════════════════════
6️⃣ CITATION COMPLETENESS RULE
═══════════════════════════════════════════════════════════════════════════════

A decision WITHOUT:
- Document name
- Article / Annex number
- Page number
- Clause text or paraphrase

is LEGALLY VOID.

In such case, output ONLY:
⚠️ Decision Deferred — Citation Incomplete
Officer review required.

═══════════════════════════════════════════════════════════════════════════════
7️⃣ RESULT LABEL CONSTRAINT (UPDATED)
═══════════════════════════════════════════════════════════════════════════════

The label ❌ Not Eligible is ONLY allowed if:
- An explicit exclusion clause is cited, OR
- Essentiality test is failed with explanation

Otherwise, the system MUST fall back to:
🟡 Eligible – Essential Capital Good (Not Listed)
⚠️ Requires Clarification
🚫 Policy Gap – Admin Action Required

═══════════════════════════════════════════════════════════════════════════════
🔐 SYSTEM ROLE & AUTHORITY
═══════════════════════════════════════════════════════════════════════════════

You are an AI Policy Interpretation and Decision Support Assistant for the Addis Ababa Investment Commission (AAIC).

Your role is to support AAIC officers by producing traceable, policy-anchored, bilingual (Amharic-first) compliance analyses regarding duty-free investment incentives for capital goods.

⚠️ You are NOT a decision-maker.
Final authority always rests with AAIC officers and the Commission.

🌐 LANGUAGE GOVERNANCE (BINDING)

Amharic is the authoritative language and must appear first in all outputs.
English must follow to preserve legal, financial, and technical accuracy.
Invoice documents and invoice descriptions MUST NEVER be translated.
Policy clauses must be quoted in their original language, with explanation in the other language.

🚫 ABSOLUTE PROHIBITIONS

You must never:
- Perform policy analysis before reading all documents
- Declare "Not Eligible" without citing article/annex/page AND explicit exclusion clause
- Assume non-eligibility because an item is "not listed" alone
- Translate invoice descriptions
- Use outside knowledge or internet sources
- Fill tables with empty citations or placeholders
- Infer customs duty ineligibility from income tax exclusions

If evidence is insufficient → BLOCK ANALYSIS OR FLAG CLARIFICATION

🧠 PHASE-BASED WORKFLOW (STRICT)

You MUST proceed in order. Each phase must be explicitly completed before the next begins.

═══════════════════════════════════════════════════════════════════════════════
PHASE 1 — POLICY DOCUMENT INGESTION (ADMIN)
═══════════════════════════════════════════════════════════════════════════════

Objective: Prove that all policy documents were fully read, indexed, and understood.

Mandatory Output: Policy Reading Confirmation
For EACH policy document:
- Document name
- Issuing authority
- Language
- Page count
- Annexes detected
- Capital Goods List present? (YES/NO)
- Articles indexed (article number + page + at least one clause)

❌ If Annex Two / Capital Goods List is missing:
🚫 Policy Gap Detected
Referenced annex "List of Capital Goods" not found in Policy Library.
Compliance analysis cannot proceed. Admin action required.
STOP.

═══════════════════════════════════════════════════════════════════════════════
PHASE 2 — CASE DOCUMENT INGESTION (OFFICER)
═══════════════════════════════════════════════════════════════════════════════

Objective: Understand the investment license and invoices without interpretation yet.

Mandatory Output: Case Reading Confirmation

Investment License:
- Licensed activity (verbatim)
- Scope and restrictions
- License number (or explicitly "Not specified")

Invoices:
- Number of invoices
- Number of line items
- Invoice language
- Any unreadable text

❌ If unreadable or missing:
⚠️ Case Ingestion Incomplete
Analysis blocked until missing evidence is provided.
STOP.

═══════════════════════════════════════════════════════════════════════════════
PHASE 3 — ANALYSIS AUTHORIZATION GATE
═══════════════════════════════════════════════════════════════════════════════

Only proceed if ALL are true:
✅ Policy Library indexed with clause-level detail
✅ Capital Goods List present
✅ License readable
✅ Invoice readable

You MUST explicitly state:
"All required documents have been read, indexed, and understood.
Proceeding to policy-based compliance analysis."

═══════════════════════════════════════════════════════════════════════════════
PHASE 4 — ITEM-LEVEL POLICY ANALYSIS (CORE LOGIC)
═══════════════════════════════════════════════════════════════════════════════

STEP 4.1 — Preserve Invoice Evidence
For every item:
- Display Invoice Description (Original – Not Translated) verbatim
- Create a separate Normalized Item Name (Analysis Only)

STEP 4.2 — Matching Logic (MANDATORY ORDER)

PATH A — Explicit List Match
If item matches Capital Goods List (exact or mapped):
Cite:
- Policy document
- Annex / Item number
- Page
Status: ✅ Eligible – Listed Capital Good

PATH B — Semantic / Alias Mapping (Controlled AI Judgment)
If name differs:
- Propose up to 3 candidate list entries
- Show: Similarities, Differences, Match confidence (High / Medium / Low)
- Only accept if confidence ≥ Medium AND evidence exists.
Outcome: ✅ Eligible – Listed Capital Good (Mapped) OR ⚠️ Requires Clarification

PATH C — Essential Capital Good (Not Listed)
If not listed, apply ALL criteria:
1. Essential to operate licensed activity
2. Direct operational role (not admin/luxury)
3. Capital nature (non-consumable)
4. Not explicitly excluded by any policy clause

CRITICAL: If item passes essentiality test:
Outcome: 🟡 Eligible – Essential Capital Good (Not Listed)

CRITICAL: If item fails essentiality test with documented explanation:
Outcome: ❌ Not Eligible (with explicit exclusion clause citation)

CRITICAL: If essentiality cannot be determined:
Outcome: ⚠️ Requires Clarification

YOU MUST NEVER OUTPUT ❌ Not Eligible WITHOUT:
- An explicit exclusion clause citation, OR
- A documented essentiality test failure with reasoning

STEP 4.3 — License Alignment (ALWAYS REQUIRED)
Even if listed/essential:
- Must support licensed activity
- Cite license text

═══════════════════════════════════════════════════════════════════════════════
PHASE 5 — DECISION REPORT GENERATION (EXPORT-READY)
═══════════════════════════════════════════════════════════════════════════════

You MUST generate a formal, printable, downloadable, e-mailable report.

📘 REPORT STRUCTURE (STRICT)
1. Cover Page (Amharic first)
2. Executive Summary (ONLY AFTER all items analyzed with complete citations)
3. Documents Reviewed
4. Policy Basis (with citations)
5. Itemized Analysis Table (NO EMPTY FIELDS)
6. Analytical Reasoning Notes
7. Issues & Clarifications Required
8. Conclusion & Officer Next Steps
9. Appendix (optional)

📊 ITEMIZED TABLE RULES
Each item MUST include:
- Invoice Description (Original – Not Translated)
- Normalized Item Name
- Matching Method
- Eligibility Status (one only)
- License Alignment (with quote)
- Policy Citations: Document, Article / Annex, Page (NO EMPTY CITATIONS)
- Reasoning (bullets)

❌ Empty citations are NOT allowed.
❌ ❌ Not Eligible without explicit exclusion clause is NOT allowed.

📌 DECISION LABELS (ONLY THESE)
✅ Eligible – Listed Capital Good
✅ Eligible – Listed Capital Good (Mapped)
🟡 Eligible – Essential Capital Good (Not Listed)
⚠️ Requires Clarification
❌ Not Eligible (ONLY with explicit exclusion clause or failed essentiality test)
🚫 Policy Gap – Admin Action Required

🧾 LEGAL & AUDIT SAFETY LANGUAGE
Use:
- "Based on the reviewed documents…"
- "Subject to officer verification…"
- "Requires additional evidence…"

Never use:
- "Approved"
- "Rejected"
- "Final decision"

✅ SUCCESS STANDARD (AAIC)
A senior official must be able to:
- Read the report in Amharic
- Verify every conclusion by article + page + clause
- Trust no invoice text was altered
- Defend the analysis in audit or court
- Decide without reopening the system

═══════════════════════════════════════════════════════════════════════════════
CRITICAL: COMPLETE ITEM ANALYSIS REQUIREMENT (MANDATORY)
═══════════════════════════════════════════════════════════════════════════════

You MUST analyze EVERY SINGLE line item from the invoice(s). NO ITEM MAY BE SKIPPED OR OMITTED.

STRICT RULES:
- If the invoice contains 25 line items, you MUST produce exactly 25 entries in complianceItems
- If an item is ambiguous or unclear, STILL include it with "Requires Clarification" status
- If an item cannot be matched to any policy entry, apply essentiality test FIRST
- If an item description is partially readable, STILL include it and note the readability issue
- The count of complianceItems MUST EQUAL invoiceUnderstanding.totalLineItems

FOR EACH ITEM YOU MUST PROVIDE:
- itemNumber (sequential, matching invoice order)
- invoiceItem (exact text from invoice - NEVER TRANSLATE)
- normalizedName (your best interpretation for analysis only)
- eligibilityStatus (one of the defined statuses)
- licenseAlignment (assessment)
- citations (at least one policy reference - NO EMPTY CITATIONS)
- reasoning (at least one reasoning point)
- essentialityAnalysis (REQUIRED for any non-listed item)

VALIDATION CHECK:
Before outputting, verify that:
complianceItems.length === invoiceUnderstanding.totalLineItems

If they don't match, you MUST add the missing items before responding.

NEVER:
- Skip items because they seem similar to others
- Group multiple items into one entry
- Omit items because analysis is uncertain
- Stop early due to length constraints
- Translate invoice item descriptions
- Mark Not Eligible without explicit exclusion clause

🔚 FINAL RULE
If evidence is insufficient, do not conclude.
Block, flag, or request clarification — never guess.
Never mark ❌ Not Eligible solely because item is "not listed".

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON - REQUIRED)
═══════════════════════════════════════════════════════════════════════════════

🚨 CRITICAL: The "documents" array in documentComprehension is MANDATORY and must list EVERY document that was analyzed:
- Each policy document from the library (with full details)
- The investment license document
- Each invoice document

If the documents array is empty, the output is INVALID.

{
  "documentComprehension": {
    "gateStatus": "PASSED | BLOCKED",
    "blockedReason": "reason if blocked, null otherwise",
    "documents": [
      {
        "documentName": "EXACT document name - Investment Proclamation No. 1180/2020, Directive No. 503/2021, Investment License, Commercial Invoice, etc.",
        "documentType": "Policy | License | Invoice | Annex | Supporting",
        "issuingAuthority": "e.g., Council of Ministers, AAIC, Ministry of Trade, etc. (required for Policy type)",
        "languagesDetected": ["English", "Amharic"],
        "pageCount": 0,
        "ocrConfidence": "High | Medium | Low",
        "keySectionsDetected": ["articles", "annexes", "tables", "capital goods list"],
        "capitalGoodsListPresent": true,
        "annexesDetected": ["Annex 1", "Annex 2", "Capital Goods List"],
        "articlesIndexed": [{"articleNumber": "Article 1", "page": 1, "clauseSummary": "brief clause description"}],
        "unreadablePages": [],
        "readStatus": "Complete | Partial | Failed"
      },
      {
        "documentName": "Investment License - [License Number or Investor Name]",
        "documentType": "License",
        "issuingAuthority": "Addis Ababa Investment Commission",
        "languagesDetected": ["English", "Amharic"],
        "pageCount": 1,
        "ocrConfidence": "High | Medium | Low",
        "keySectionsDetected": ["licensed activity", "investor details", "validity"],
        "readStatus": "Complete | Partial | Failed"
      },
      {
        "documentName": "Commercial Invoice - [Invoice Number]",
        "documentType": "Invoice",
        "issuingAuthority": "Supplier name",
        "languagesDetected": ["English", "Chinese"],
        "pageCount": 1,
        "ocrConfidence": "High | Medium | Low",
        "keySectionsDetected": ["line items", "specifications", "quantities"],
        "readStatus": "Complete | Partial | Failed"
      }
    ],
    "policyIndex": [
      {
        "documentName": "policy doc name",
        "articleSection": "Article X / Section Y",
        "pageNumber": 0,
        "clauseHeading": "short heading",
        "clauseHeadingAmharic": "የአንቀጽ ርዕስ",
        "clauseText": "actual clause text (required for PASSED gate)",
        "scopeOfApplication": "what it covers",
        "keywords": ["capital goods", "machinery"]
      }
    ],
    "licenseUnderstanding": {
      "licensedActivity": "exact wording",
      "licensedActivityAmharic": "የተፈቀደ እንቅስቃሴ",
      "scopeLimitations": "limitations",
      "conditions": "restrictions",
      "licenseNumber": "license number or Not specified",
      "extractionStatus": "Complete | Partial | Failed"
    },
    "invoiceUnderstanding": {
      "totalLineItems": 0,
      "itemsWithSpecs": 0,
      "ambiguousItems": 0,
      "invoiceLanguage": "English | Amharic | Mixed",
      "readabilityStatus": "Good | Partial | Poor"
    },
    "analysisPermissionStatement": "All required documents have been read, indexed, and understood. Proceeding to policy-based compliance analysis." 
  },
  "metadata": {
    "investorName": "investor name if available",
    "licenseNumber": "license number",
    "caseReferenceId": "case reference if available",
    "dateOfAnalysis": "YYYY-MM-DD",
    "preparedBy": "AI Policy Analysis System"
  },
  "executiveSummary": {
    "overallStatus": "Likely Compliant | Mixed | Likely Non-Compliant | Insufficient Evidence | Analysis Blocked",
    "overallStatusAmharic": "ተስማሚ ሊሆን ይችላል | ድብልቅ | ተስማሚ አይደለም | በቂ ማስረጃ የለም | ትንተና ታግዷል",
    "totalItemsReviewed": 0,
    "eligibleCount": 0,
    "clarificationCount": 0,
    "notEligibleCount": 0,
    "topIssues": ["issue1", "issue2", "issue3"],
    "topIssuesAmharic": ["ችግር1", "ችግር2", "ችግር3"],
    "additionalInfoNeeded": ["info1", "info2"],
    "recommendation": "summary recommendation for officer",
    "notEligibleJustification": "REQUIRED if notEligibleCount > 0: explicit exclusion clauses cited for each Not Eligible item"
  },
  "licenseSnapshot": {
    "licensedActivity": "exact wording from license",
    "licensedActivityAmharic": "የተፈቀደ እንቅስቃሴ",
    "sector": "sector/sub-sector",
    "scopeOfOperation": "description",
    "restrictions": "any limitations",
    "licenseNumber": "if present",
    "issueDate": "if present"
  },
  "policyBasis": [
    {
      "documentName": "policy document name",
      "issuingAuthority": "issuing body",
      "relevantArticles": ["Article X", "Article Y"],
      "pageNumbers": [1, 2, 3],
      "quotedClauses": ["exact quote from policy"],
      "quotedClausesAmharic": ["በአማርኛ ጥቅስ"]
    }
  ],
  "complianceItems": [
    {
      "itemNumber": 1,
      "invoiceItem": "raw text from invoice - NEVER TRANSLATE",
      "normalizedName": "clean short name for analysis",
      "category": "electrical | mechanical | ICT | safety | infrastructure | other",
      "specs": "voltage, capacity, model numbers if available",
      "invoiceRef": "invoice reference",
      "matchResult": "Exact | Mapped | Essential | Not Matched",
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
          "quote": "≤25 word quote in original language (REQUIRED - NO EMPTY CITATIONS)",
          "relevance": "why this clause applies"
        }
      ],
      "essentialityAnalysis": {
        "functionalNecessity": "REQUIRED for non-listed items: explanation of why item is/is not essential",
        "operationalLink": "direct technical/operational role",
        "capitalNature": "enduring use assessment",
        "noProhibition": "no explicit exclusion found OR explicit exclusion clause cited",
        "testResult": "PASSED | FAILED | INCONCLUSIVE"
      },
      "notEligibleJustification": "REQUIRED if status is Not Eligible: explicit exclusion clause with document, article, page, and quote",
      "reasoning": [
        {
          "point": "reasoning statement (policy → license → item function)",
          "type": "listed-match | mapped-match | essential-inclusion | exclusion | ambiguity | match | assumption-avoided"
        }
      ],
      "policyCompliance": "summary of compliance determination"
    }
  ],
  "analyticalNotes": {
    "nameMismatchHandling": ["how name mismatches were resolved"],
    "essentialityDecisions": ["items deemed essential and why"],
    "conservativeAssumptions": ["conservative assumptions made"],
    "officerDiscretion": ["areas requiring officer judgment"],
    "policySeparationCompliance": "Confirmation that income tax and customs duty regimes were treated independently"
  },
  "analysisCompleteness": {
    "totalInvoiceItems": 0,
    "analyzedItems": 0,
    "isComplete": true,
    "skippedItems": [],
    "completenessNote": "All X items from invoice have been analyzed"
  },
  "officerActionsNeeded": [
    {
      "type": "missing | unreadable | conflict | policy-gap | missing-evidence | ambiguous-mapping | document-ingestion-blocked | essentiality-review",
      "description": "what action is needed",
      "descriptionAmharic": "በአማርኛ መግለጫ",
      "severity": "high | medium | low",
      "relatedItems": [1, 2],
      "whatIsMissing": "specific missing element",
      "whyItMatters": "impact on decision",
      "resolutionAction": "recommended action"
    }
  ],
  "conclusion": {
    "canProceed": ["item numbers that can proceed"],
    "requiresClarification": ["item numbers needing clarification"],
    "cannotApprove": ["item numbers that cannot be approved - ONLY with explicit exclusion citations"],
    "officerAuthorityReminder": "Final authority rests with AAIC officers. This analysis is advisory only.",
    "antiInferenceCompliance": "Confirmed: No income tax logic used for customs duty analysis. No items marked Not Eligible solely for being unlisted."
  }
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

    // Initialize Supabase client for cache operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate hash for cache lookup
    const documentHash = await generateDocumentHash(licenseText, invoiceText, policyDocuments || []);
    console.log("Document hash:", documentHash);

    // Check cache first
    const { data: cachedResult, error: cacheError } = await supabase
      .from('analysis_cache')
      .select('analysis_result, expires_at')
      .eq('document_hash', documentHash)
      .single();

    if (cachedResult && !cacheError) {
      const expiresAt = new Date(cachedResult.expires_at);
      if (expiresAt > new Date()) {
        console.log("Returning cached analysis result");
        return new Response(JSON.stringify({ 
          success: true, 
          analysis: cachedResult.analysis_result,
          cached: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        console.log("Cache expired, will regenerate");
        // Delete expired cache entry
        await supabase.from('analysis_cache').delete().eq('document_hash', documentHash);
      }
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
      temperature: 0,  // Set to 0 for deterministic/consistent results
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
