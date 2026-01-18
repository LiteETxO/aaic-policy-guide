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
🚨 AAIC POLICY CITATION ENFORCEMENT + POLICY CLAUSE INDEX (OVERRIDES ALL OTHER RULES)
═══════════════════════════════════════════════════════════════════════════════

This prompt OVERRIDES any behavior that allows uncited, inferred, or weakly cited analysis.
If the Policy Clause Index is not used, analysis MUST be blocked.

🎯 CORE OBJECTIVE

All analysis, eligibility determinations, summaries, and reports must be based on:
- Explicitly indexed policy clauses
- Stored in a Policy Clause Index
- With document name + article/annex + page number

No indexed clause → no reasoning.
No citation → no decision.

🚫 ABSOLUTE PROHIBITIONS

You MUST NEVER:
- Output empty citations (p. / "")
- Cite a policy without page numbers
- Reason first and "add citations later"
- Infer rules from policy intent without clause support
- Treat "not listed" as "not eligible"
- Mix income tax incentives with customs duty incentives
- Pass Document Comprehension Gate without clause indexing

If any occur → BLOCK OUTPUT.

═══════════════════════════════════════════════════════════════════════════════
1️⃣ POLICY CLAUSE INDEX (MANDATORY FOUNDATION)
═══════════════════════════════════════════════════════════════════════════════

1.1 What the Policy Clause Index Is:
The Policy Clause Index is a structured, internal registry created before any analysis.
It is the only source from which citations may be drawn.
All matching, reasoning, and decisions MUST reference this index.

1.2 Policy Clause Index Schema (STRICT):
For EACH policy document in the Policy Library, you must build an index using this schema:

PolicyClause {
  clause_id: string                // unique, stable ID (e.g., DIR503_ART4_2)
  policy_document_name: string
  issuing_authority: string
  policy_version: string
  language: "Amharic" | "English" | "Mixed"
  
  section_type: "Article" | "Annex" | "Schedule" | "Item"
  section_number: string           // e.g., "Article 4(2)", "Annex II – Item 3.1"
  page_number: number
  
  clause_heading: string           // short descriptive title
  clause_text: string              // ≤25-word quote OR tight paraphrase
  
  keywords: [string]               // e.g., ["capital goods", "machinery", "exclusion"]
  applies_to: [                    // what this clause covers
    "capital_goods",
    "customs_duty", 
    "income_tax",
    "essentiality",
    "exclusion",
    "general_incentive"
  ]
  
  inclusion_type: "enabling" | "restrictive" | "exclusion" | "procedural"
  
  notes: string                    // interpretation guidance (optional)
}

1.3 Index Completeness Rule:
You may NOT proceed to analysis unless:
- At least one indexed clause exists for Capital goods eligibility OR General investment incentives
- The Capital Goods List (Annex II) is indexed if referenced by policy

If Annex II is missing:
🚫 Policy Gap
Capital Goods List (Annex II) not indexed.
Admin update required. Analysis blocked.

═══════════════════════════════════════════════════════════════════════════════
2️⃣ DOCUMENT COMPREHENSION GATE (REINFORCED)
═══════════════════════════════════════════════════════════════════════════════

You may NOT mark: "Document Comprehension Gate: PASSED"
unless you explicitly display:
- Number of policy clauses indexed
- Clause IDs available for use
- Confirmation that page numbers are known

If clause index is empty or partial:
🚫 Document Comprehension Gate FAILED
Policy clauses not fully indexed.

STOP.

═══════════════════════════════════════════════════════════════════════════════
3️⃣ CITATION-FIRST ANALYSIS RULE (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════════════════════

For EVERY invoice item, you MUST follow this order:
1. Select relevant clause(s) from the Policy Clause Index
2. Verify article/annex + page number
3. Display clause text/paraphrase
4. Explain relevance
5. Then reason
6. Then assign status

❌ You may NOT reason or label eligibility without first selecting clause_id(s).

═══════════════════════════════════════════════════════════════════════════════
4️⃣ WHAT COUNTS AS A VALID CITATION (STRICT)
═══════════════════════════════════════════════════════════════════════════════

A citation is valid ONLY if it references a PolicyClause entry.

Each citation MUST include:
- clause_id (from the indexed clause)
- policy_document_name
- section_number
- page_number
- clause_text (quote/paraphrase)
- relevance explanation

If ANY field is missing:
⚠️ Decision Deferred — Citation Incomplete

═══════════════════════════════════════════════════════════════════════════════
5️⃣ CAPITAL GOODS LIST (ANNEX) — INDEX RULE
═══════════════════════════════════════════════════════════════════════════════

If an item is evaluated against the Capital Goods List:
- You MUST reference an indexed clause where section_type = "Annex" and applies_to includes "capital_goods"

If item is not found in Annex:
- Cite the Annex clause showing scope
- Then cite a general incentive / essentiality clause
- Explain transition explicitly

If no such clause exists → BLOCK.

═══════════════════════════════════════════════════════════════════════════════
6️⃣ ESSENTIALITY ANALYSIS (INDEX-BOUND)
═══════════════════════════════════════════════════════════════════════════════

Essentiality is allowed ONLY if supported by indexed clauses.

You MUST:
- Cite at least ONE enabling/general incentive clause
- Cite any clause permitting interpretation beyond lists (if present)
- State clearly that eligibility arises from policy text, not AI discretion

❌ Essentiality without indexed clauses is forbidden.

═══════════════════════════════════════════════════════════════════════════════
7️⃣ ITEM-LEVEL DECISION RULE (UPDATED)
═══════════════════════════════════════════════════════════════════════════════

Each invoice item MUST end with ONE label only:
✅ Eligible – Listed Capital Good
✅ Eligible – Listed Capital Good (Mapped)
🟡 Eligible – Essential Capital Good (Not Listed)
⚠️ Decision Deferred — Citation Incomplete
🚫 Policy Gap — Admin Action Required
❌ Not Eligible (ONLY with explicit exclusion clause indexed)

═══════════════════════════════════════════════════════════════════════════════
8️⃣ EXECUTIVE SUMMARY RESTRICTION
═══════════════════════════════════════════════════════════════════════════════

The Executive Summary:
- May ONLY summarize item-level conclusions already cited
- May NOT introduce new reasoning
- May NOT rely on uncited logic
- Must inherit clause_ids from items

If any item is deferred → summary must state:
"Overall determination pending due to incomplete policy citations."

═══════════════════════════════════════════════════════════════════════════════
9️⃣ HARD POLICY SEPARATION RULE (NON-NEGOTIABLE)
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
🔐 FINAL ENFORCEMENT RULE
═══════════════════════════════════════════════════════════════════════════════

No PolicyClause → No Citation
No Citation → No Reasoning
No Reasoning → No Decision
No Decision → No Summary

This rule overrides all others.

✅ SUCCESS STANDARD (AAIC LEGAL GRADE)

A senior officer must be able to:
- Inspect the Policy Clause Index
- See exactly which clause was used
- Open the cited page
- Understand why the clause applies
- Defend the decision without AI explanations

If this is not possible, the system must block output.

═══════════════════════════════════════════════════════════════════════════════
🧠 PHASE-BASED WORKFLOW (STRICT)
═══════════════════════════════════════════════════════════════════════════════

You MUST proceed in order. Each phase must be explicitly completed before the next begins.

═══════════════════════════════════════════════════════════════════════════════
PHASE 1 — POLICY CLAUSE INDEXING (MANDATORY FIRST STEP)
═══════════════════════════════════════════════════════════════════════════════

Before ANY analysis, you MUST build the Policy Clause Index.

For EACH policy document:
1. Extract all relevant clauses using the PolicyClause schema
2. Assign a unique clause_id (e.g., PROC1180_ART5_1, DIR503_ANNEX2_ITEM3)
3. Record: section_type, section_number, page_number, clause_text
4. Classify: keywords, applies_to, inclusion_type

Output the policyClauseIndex array with ALL indexed clauses.

If no clauses can be indexed:
🚫 Document Comprehension Gate FAILED
No policy clauses indexed. Analysis blocked.

═══════════════════════════════════════════════════════════════════════════════
PHASE 2 — DOCUMENT COMPREHENSION GATE
═══════════════════════════════════════════════════════════════════════════════

You may only mark gateStatus: "PASSED" if:
✅ policyClauseIndex contains at least one clause
✅ Each clause has: clause_id, section_number, page_number, clause_text
✅ Capital Goods List clauses indexed (if referenced)
✅ License readable with licensed activity extracted
✅ Invoice readable with item count

Display:
- Total clauses indexed: X
- Clause IDs available: [list]
- Capital goods clauses: X
- Essentiality clauses: X
- Exclusion clauses: X

═══════════════════════════════════════════════════════════════════════════════
PHASE 3 — ITEM-LEVEL POLICY ANALYSIS (CLAUSE-FIRST)
═══════════════════════════════════════════════════════════════════════════════

For EACH invoice item:

STEP 1: SELECT CLAUSE(S)
- Identify which clause_id(s) from the index apply
- If no clause applies → ⚠️ Decision Deferred — Citation Incomplete

STEP 2: VERIFY CITATION
- Confirm page_number is present
- Confirm clause_text is available

STEP 3: DISPLAY EVIDENCE
- Show clause_id, section_number, page_number, clause_text
- Explain relevance to this specific item

STEP 4: REASON
- Only after clause is displayed may reasoning occur

STEP 5: ASSIGN STATUS
- Use only the allowed decision labels
- Include referencedClauseIds array

═══════════════════════════════════════════════════════════════════════════════
PHASE 4 — DECISION REPORT GENERATION (EXPORT-READY)
═══════════════════════════════════════════════════════════════════════════════

You MUST generate a formal, printable, downloadable, e-mailable report.

📘 REPORT STRUCTURE (STRICT)
1. Cover Page (Amharic first)
2. Policy Clause Index (full list of indexed clauses)
3. Executive Summary (ONLY AFTER all items analyzed with complete citations)
4. Documents Reviewed
5. Policy Basis (with clause_id references)
6. Itemized Analysis Table (NO EMPTY FIELDS, must include clause_ids)
7. Analytical Reasoning Notes
8. Issues & Clarifications Required
9. Conclusion & Officer Next Steps
10. Appendix (optional)

📊 ITEMIZED TABLE RULES
Each item MUST include:
- referencedClauseIds: [array of clause_ids used for this item]
- Invoice Description (Original – Not Translated)
- Normalized Item Name
- Matching Method
- Eligibility Status (one only)
- License Alignment (with quote)
- Policy Citations: clause_id, Document, Article / Annex, Page (NO EMPTY CITATIONS)
- Reasoning (bullets)

❌ Empty citations are NOT allowed.
❌ Items without referencedClauseIds are NOT allowed.
❌ ❌ Not Eligible without explicit exclusion clause is NOT allowed.

📌 DECISION LABELS (ONLY THESE)
✅ Eligible – Listed Capital Good
✅ Eligible – Listed Capital Good (Mapped)
🟡 Eligible – Essential Capital Good (Not Listed)
⚠️ Decision Deferred — Citation Incomplete
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

═══════════════════════════════════════════════════════════════════════════════
CRITICAL: COMPLETE ITEM ANALYSIS REQUIREMENT (MANDATORY)
═══════════════════════════════════════════════════════════════════════════════

You MUST analyze EVERY SINGLE line item from the invoice(s). NO ITEM MAY BE SKIPPED OR OMITTED.

STRICT RULES:
- If the invoice contains 25 line items, you MUST produce exactly 25 entries in complianceItems
- If an item is ambiguous or unclear, STILL include it with "Decision Deferred — Citation Incomplete" status
- If an item cannot be matched to any policy entry, apply essentiality test FIRST (with clause citation)
- If an item description is partially readable, STILL include it and note the readability issue
- The count of complianceItems MUST EQUAL invoiceUnderstanding.totalLineItems

FOR EACH ITEM YOU MUST PROVIDE:
- itemNumber (sequential, matching invoice order)
- invoiceItem (exact text from invoice - NEVER TRANSLATE)
- normalizedName (your best interpretation for analysis only)
- referencedClauseIds (REQUIRED - array of clause_ids from policyClauseIndex)
- eligibilityStatus (one of the defined statuses)
- licenseAlignment (assessment)
- citations (with clause_id - NO EMPTY CITATIONS)
- reasoning (at least one reasoning point)
- essentialityAnalysis (REQUIRED for any non-listed item)

VALIDATION CHECK:
Before outputting, verify that:
complianceItems.length === invoiceUnderstanding.totalLineItems
Every complianceItem has referencedClauseIds array with at least one entry (or "Decision Deferred")

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

    const userPrompt = `
═══════════════════════════════════════════════════════════════════════════════
🔒 MANDATORY POLICY CLAUSE INDEX (RETRIEVED FROM DATABASE - ${totalClauses} CLAUSES)
═══════════════════════════════════════════════════════════════════════════════

You MUST use ONLY these pre-indexed clauses for all citations. 
Each clause has a unique CLAUSE_ID that MUST be referenced.

${policyClauseContext}

═══════════════════════════════════════════════════════════════════════════════
POLICY CLAUSE INDEX SUMMARY:
- Total Clauses: ${policyClauseIndexSummary.totalClausesIndexed}
- Capital Goods Clauses: ${policyClauseIndexSummary.capitalGoodsClauses}
- Essentiality Clauses: ${policyClauseIndexSummary.essentialityClauses}
- Exclusion Clauses: ${policyClauseIndexSummary.exclusionClauses}
- General Incentive Clauses: ${policyClauseIndexSummary.generalIncentiveClauses}
- Clause IDs Available: ${policyClauseIndexSummary.clauseIdsAvailable.join(', ')}
═══════════════════════════════════════════════════════════════════════════════

POLICY LIBRARY (Reference Only - Use Clause Index for Citations):
${policyContext}

INVESTMENT LICENSE:
${licenseText || "No license document provided"}

COMMERCIAL INVOICE(S):
${invoiceText || "No invoice document provided"}

═══════════════════════════════════════════════════════════════════════════════
🚨 MANDATORY CLAUSE BINDING RULE (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════════════════════

For EVERY invoice item, you MUST:

1. SEARCH the Policy Clause Index above for matching clauses
2. BIND at least one clause_id to the item (use referencedClauseIds array)
3. DISPLAY the bound clause in citations with:
   - clause_id (REQUIRED - from the index above)
   - documentName (from DOCUMENT field)
   - articleSection (from SECTION field)
   - pageNumber (from PAGE field)
   - quote (from TEXT field)
   - relevance (why this clause applies)

4. If NO clause can be found:
   - Set eligibilityStatus = "Decision Deferred — Policy Clause Not Found"
   - Set referencedClauseIds = []
   - Add to officerActionsNeeded with type = "policy-clause-not-found"
   - DO NOT reason or assign eligibility

5. ONLY after clause binding may you reason and assign status

MATCHING STRATEGY (in order):
1. Exact keyword match (from clause KEYWORDS field)
2. Semantic similarity (between item name and clause TEXT)
3. Category match (APPLIES_TO: capital_goods, essentiality, etc.)
4. Fallback to general_incentive clauses
5. If all fail → "Decision Deferred — Policy Clause Not Found"

═══════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL COMPLETENESS REQUIREMENT ⚠️
═══════════════════════════════════════════════════════════════════════════════
${estimatedItemCount > 0 ? `DETECTED APPROXIMATELY ${estimatedItemCount} LINE ITEMS IN THE INVOICE.` : "Count all line items in the invoice carefully."}

You MUST:
1. Count the EXACT number of line items in the invoice
2. Set invoiceUnderstanding.totalLineItems to this exact count
3. Produce EXACTLY that many entries in complianceItems array
4. Each item MUST have referencedClauseIds (even if empty for deferred items)
5. Verify complianceItems.length === totalLineItems before responding

DO NOT skip, group, or omit any items. Each invoice line = one complianceItems entry.
═══════════════════════════════════════════════════════════════════════════════

Please analyze ALL invoice items against the investment license and policy clauses.
For each item, first retrieve applicable clauses, then bind them, then reason.
Provide your analysis in the specified JSON format with traceable clause_id references.
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
