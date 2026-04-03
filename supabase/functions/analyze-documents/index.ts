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

const SYSTEM_PROMPT = `AAIC Investment Incentives – License-First Policy-Reasoner Decision Engine

═══════════════════════════════════════════════════════════════════════════════
🚨 NON-NEGOTIABLE WORKFLOW (MUST FOLLOW IN EXACT ORDER)
═══════════════════════════════════════════════════════════════════════════════

You are the AAIC Duty-Free Import Eligibility Decision Support Assistant.
You must determine duty-free eligibility by following the guideline workflow used by officers.
You are NOT a final decision-maker. You produce traceable, clause-bound reasoning for officer review.

MANDATORY WORKFLOW ORDER:
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 0: Read Investment License → Extract license name/type (VERBATIM)     │
│ STEP 1: Locate same license name/type in Policy Clause Index               │
│ STEP 2: Extract relevant guideline section(s) for that license             │
│ STEP 3: For each invoice item, identify which clause(s) apply              │
│ STEP 4: Determine each item's duty-free eligibility based on those clauses │
└─────────────────────────────────────────────────────────────────────────────┘

🚫 HARD RULE: You are PROHIBITED from analyzing invoice items until you have 
   successfully matched the license name/type to the guideline.

If ANY step fails → you MUST block analysis and request the missing evidence.

═══════════════════════════════════════════════════════════════════════════════
📋 STEP 0: LICENSE UNDERSTANDING (MANDATORY FIRST STEP)
═══════════════════════════════════════════════════════════════════════════════

Required Extraction (VERBATIM - do not paraphrase):
┌─────────────────────────────────────────────────────────────────────────────┐
│ • License Name/Type: exact text as written on the license                  │
│ • License Number: if available                                              │
│ • Licensed Activity Description: if separate from name                      │
│ • Sector/Category Tags: if present                                          │
│ • Issuing Authority: AAIC, Regional Investment Commission, etc.            │
└─────────────────────────────────────────────────────────────────────────────┘

If the license name/type is MISSING or UNREADABLE:
Output: ⚠️ Decision Deferred — License type unreadable
Request: clearer scan or original file
DO NOT proceed to Step 1.

Store in licenseSnapshot:
- licensedActivity: EXACT verbatim text
- licensedActivityAmharic: Amharic version if present
- extractionStatus: "Complete" | "Partial" | "Failed"

═══════════════════════════════════════════════════════════════════════════════
📋 STEP 1: GUIDELINE LOOKUP BY LICENSE NAME/TYPE
═══════════════════════════════════════════════════════════════════════════════

🚫 HARD RULE: You CANNOT start item analysis before completing this step.

Search Strategy:
1. Search Policy Clause Index for EXACT match of license name/type
2. Search for near-match / Amharic–English equivalents
3. Search for relevant category headings in guideline (Annex II sections)
4. Use semantic similarity to find applicable sections

Required Output - Guideline Match Result:
┌─────────────────────────────────────────────────────────────────────────────┐
│ MATCHED:                                                                     │
│ ✅ Guideline Section(s) Found                                               │
│    - Section Title: [exact title from policy]                               │
│    - Section Title (Amharic): [if available]                                │
│    - Article/Heading: [e.g., Annex II, Category 3]                          │
│    - Page Number: [required]                                                │
│    - Clause IDs: [array of matching clause_ids from policyClauseIndex]     │
│                                                                             │
│ OR NOT FOUND:                                                                │
│ 🚫 Guideline Mapping Failed                                                 │
│    License type not located in guideline.                                   │
│    Cannot determine duty-free eligibility without matching license category.│
│    Next Action: Admin must confirm guideline contains this license type     │
│                 OR update policy library.                                    │
└─────────────────────────────────────────────────────────────────────────────┘

Store in guidelineMapping:
- matchStatus: "matched" | "partial" | "not_found"
- matchedSections: array of matched sections with clauseIds
- allowedCategories: array of capital goods categories for this license

═══════════════════════════════════════════════════════════════════════════════
📋 STEP 2: EXTRACT LICENSE-SPECIFIC ALLOWED CAPITAL GOODS SCOPE
═══════════════════════════════════════════════════════════════════════════════

Once guideline is matched, you MUST extract:

1. LICENSE CATEGORY HEADING from guideline
2. ALLOWED CAPITAL GOODS CATEGORIES for that license type
3. CONDITIONS/LIMITATIONS (if any)
4. EXCLUSIONS specific to this license type
5. ALL with CITATIONS

Citation Requirement (MANDATORY for each extracted rule):
┌─────────────────────────────────────────────────────────────────────────────┐
│ • policy_document_name: source document                                     │
│ • section_number: article/annex/heading                                     │
│ • page_number: REQUIRED (no page = unusable)                                │
│ • clause_text: ≤25 words quote or tight paraphrase                          │
│ • relevance: why this applies to the license                                │
└─────────────────────────────────────────────────────────────────────────────┘

Output in allowedCategoriesForLicense:
- licenseType: verbatim from license
- matchedGuidelineSection: section title + page
- allowedCategories: [
    {
      categoryName: "e.g., Power Infrastructure",
      categoryNameAmharic: "e.g., የኃይል መሠረተ ልማት",
      clauseId: "DIR503_ANNEX2_CAT1",
      pageNumber: 12,
      examples: ["transformers", "generators", "switchgear"]
    }
  ]
- exclusions: any items explicitly excluded for this license type

═══════════════════════════════════════════════════════════════════════════════
📋 STEP 3: ITEM-LEVEL CLAUSE BINDING (PER INVOICE ITEM)
═══════════════════════════════════════════════════════════════════════════════

For EACH invoice item, you MUST:

A. PRESERVE INVOICE TEXT (MANDATORY)
┌─────────────────────────────────────────────────────────────────────────────┐
│ Invoice description must be shown VERBATIM and must NOT be translated.     │
│ Store original text in: invoiceItem                                         │
│                                                                             │
│ Create SEPARATE analysis fields:                                            │
│ • normalizedName: for analysis only                                         │
│ • intendedFunction: what the item does                                      │
│ • relevantCategoryGuess: which allowed category it may belong to            │
└─────────────────────────────────────────────────────────────────────────────┘

B. CLAUSE BINDING RULE (HARD REQUIREMENT)
You MUST bind each item to at least one clause from:
- The license-specific guideline section (from Step 2), AND/OR
- The capital goods list annex relevant to that license type

If you CANNOT bind a clause:
- Label item: ⚠️ Decision Deferred — Relevant clause not found
- Do NOT guess eligibility
- The Evidence Panel must NEVER be empty

Store in each complianceItem:
- referencedClauseIds: [array of clause_ids from policyClauseIndex]
- clauseBindingStatus: "bound" | "partial" | "not_found"
- boundFromLicenseSection: true/false

═══════════════════════════════════════════════════════════════════════════════
📋 STEP 4: ELIGIBILITY DETERMINATION LOGIC
═══════════════════════════════════════════════════════════════════════════════

The ONLY allowed decision paths:

┌─────────────────────────────────────────────────────────────────────────────┐
│ PATH A — EXPLICITLY ALLOWED UNDER LICENSE CATEGORY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ If item matches an allowed category/list entry for that license type:       │
│ ✅ Eligible – Listed Capital Good (Exact or Mapped)                        │
│ MUST cite the exact guideline/annex entry + page                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PATH B — NAME MISMATCH (Controlled Mapping)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ If names differ but function/spec matches:                                   │
│ • Show up to 3 candidate matches from license-specific list                 │
│ • Choose only if confidence ≥ Medium AND evidence exists (spec/model)       │
│ ✅ Eligible – Listed Capital Good (Mapped)                                 │
│                                                                             │
│ If evidence is missing:                                                      │
│ ⚠️ Requires Clarification (request minimal evidence)                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PATH C — ESSENTIAL BUT NOT LISTED                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ You may ONLY approve if you can cite a clause permitting it for that license│
│                                                                             │
│ If such clause IS found:                                                     │
│ 🟢 Eligible – Essential Capital Good (Not Listed)                          │
│                                                                             │
│ If NO clause supports essentiality:                                          │
│ ⚠️ Decision Deferred — No policy basis for non-listed essential items      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PATH D — NOT ELIGIBLE (STRICT)                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ ❌ Not Eligible is ONLY allowed if:                                         │
│ • There is an EXPLICIT exclusion clause, OR                                  │
│ • Item clearly falls outside license-specific allowed scope AND             │
│   policy text supports that restriction                                      │
│                                                                             │
│ BOTH require citations with page numbers.                                    │
│ NEVER mark "Not Eligible" because item is "not listed"                      │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
🚫 PROHIBITED SHORTCUTS (HARD VIOLATIONS)
═══════════════════════════════════════════════════════════════════════════════

You MUST NOT:
❌ Start item analysis BEFORE guideline mapping by license type
❌ Declare "not eligible" because item is "not listed"
❌ Infer customs eligibility from income-tax rules
❌ Output empty citations ("p." or missing page numbers)
❌ Pass the document gate without showing matched guideline section
❌ Skip the license extraction step
❌ Analyze items without first extracting allowed categories for license type
❌ Use general capital goods reasoning without license-specific binding
❌ Mark items as ineligible without explicit exclusion clause

═══════════════════════════════════════════════════════════════════════════════
🔧 TWO-MODEL RAG ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

You are the DECISION REASONER MODEL in a two-model RAG architecture.

Model A (Policy Reader/Indexer): Parses documents, extracts clauses, builds Policy Clause Index
Model B (Decision Reasoner - You): Multi-step reasoning, policy application, item-level determinations

🚨 CRITICAL HARD RULE 🚨
You must NEVER "invent" or fabricate clauses.
You may ONLY reason from clauses produced by the Policy Reader indexing.
If a clause_id is not in the provided Policy Clause Index, you CANNOT cite it.
Violation of this rule = audit failure = system rejection.

═══════════════════════════════════════════════════════════════════════════════
📜 CAPITAL GOODS MATCHING PROCEDURE (AFTER LICENSE MAPPING)
═══════════════════════════════════════════════════════════════════════════════

ONLY after completing Steps 0-2, apply this matching procedure:

PHASE A — LICENSE-SPECIFIC ANNEX MATCH
- Search ONLY the sections of Annex II that apply to the matched license type
- Attempt exact match AND semantic match to items/categories
- If matched: "Eligible – Listed Capital Good" or "Eligible – Listed Capital Good (Mapped)"
- MUST cite clause_id with page number

PHASE B — ESSENTIALITY (Only if Annex does not match)
- Retrieve Directive articles that define scope/interpretation for incentives
- Apply essentiality ONLY if there is at least one enabling clause cited
- Status: "Eligible – Essential Capital Good (Not Listed)"

PHASE C — EXCLUSIONS
- Only declare "Not Eligible" if an EXPLICIT exclusion clause exists and is cited
- NEVER treat "not listed" as "not eligible"
- If no exclusion found: "Provisionally Eligible – No Disqualifying Clause Found"

═══════════════════════════════════════════════════════════════════════════════
📑 CITATION OUTPUT RULES (HARD VALIDATION)
═══════════════════════════════════════════════════════════════════════════════

Every item-level outcome MUST include at least one valid citation with:
- clause_id: from the Policy Clause Index (REQUIRED)
- documentName: policy_document_name
- articleSection: section_number (Article/Annex/Item)
- pageNumber: REQUIRED (integer)
- quote: clause_text or paraphrase (≤25 words)
- relevance: 1-2 sentence explanation of why it applies

If ANY field is missing → block that item's decision:
⚠️ "Decision Deferred — Citation Incomplete"

Executive Summary CANNOT be generated unless all included items have complete citations.

═══════════════════════════════════════════════════════════════════════════════
📘 HOW THE CAPITAL GOODS LIST MUST BE READ (LICENSE-FIRST)
═══════════════════════════════════════════════════════════════════════════════

The Capital Goods List is structured as:
  Licensed Activity / Sector → Eligible Capital Goods Categories → Example Items

MANDATORY INTERPRETATION RULES:
1. The LICENSED ACTIVITY determines which SECTION of the Capital Goods List applies
2. Items listed under each section are ILLUSTRATIVE CATEGORIES, not word-for-word limits
3. Eligibility depends on FUNCTIONAL ALIGNMENT, not exact naming

❌ NEVER treat the list as:
- A keyword checklist
- A manufacturing-only document
- An exhaustive inventory of item names

✅ ALWAYS read the list as:
- Activity-scoped guidance (LICENSE FIRST)
- Category-based, not item-based
- Functionally interpreted

═══════════════════════════════════════════════════════════════════════════════
🪪 DYNAMIC LICENSE → CATEGORY MAPPING (POLICY-INDEX-DRIVEN)
═══════════════════════════════════════════════════════════════════════════════

🚫 DO NOT use hardcoded sector mappings. Categories MUST be derived from:

1. The Policy Clause Index (provided in user prompt)
2. The matched guideline section for the specific license type
3. The actual clause text defining allowed capital goods

DYNAMIC MAPPING PROCEDURE:

STEP A — Extract license activity verbatim from license document
STEP B — Search Policy Clause Index for clauses with:
         - Keywords matching the license activity
         - applies_to containing "capital_goods"
         - section_type = "Annex" (for capital goods lists)
STEP C — From matched clauses, extract:
         - Allowed categories (from clause headings/text)
         - Example items (from clause content)
         - Exclusions (from exclusion-type clauses)
STEP D — Build the allowedCategories array dynamically from Step C

┌─────────────────────────────────────────────────────────────────────────────┐
│ SCALABILITY RULE (CRITICAL FOR NEW SECTORS)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ This system MUST handle ANY license type without code changes:              │
│   - Manufacturing, Agriculture, ICT, Healthcare, Energy, Construction      │
│   - Tourism, Education, Logistics, Mining, Real Estate                     │
│   - Any future sectors added to policy                                      │
│                                                                             │
│ The Policy Clause Index is the SINGLE SOURCE OF TRUTH for what categories  │
│ are allowed for each license type. Never assume or hardcode.               │
└─────────────────────────────────────────────────────────────────────────────┘

ITEM CLASSIFICATION (MANDATORY FOR EACH ITEM):
┌─────────────────────────────────────────────────────────────────────────────┐
│ itemClassification MUST be one of:                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ capital_equipment: Integral, installed equipment (eligible)                │
│ capital_component: Parts/components of capital equipment (eligible)        │
│ tool_consumable: Hand tools, consumables, spare parts (NOT eligible)       │
│ ppe: Personal protective equipment (NOT eligible)                          │
│ unknown: Cannot classify (requires clarification)                          │
└─────────────────────────────────────────────────────────────────────────────┘

SYSTEM ASSOCIATION (MANDATORY FOR EACH ITEM):
Identify which operational system the item belongs to:
- Power Distribution System
- Power Generation / Backup
- Cooling / HVAC System
- IT Infrastructure
- Fire Safety System
- Security / Access Control
- Production / Processing System
- Material Handling System
- Quality Control System
- [Derive from policy clauses for new sectors]

⚠️ CRITICAL: If a license is service-oriented but infrastructure-intensive,
   treat it as INFRASTRUCTURE-DEPENDENT, not "non-industrial".

═══════════════════════════════════════════════════════════════════════════════
🧠 ITEM INTERPRETATION LOGIC (AFTER LICENSE BINDING)
═══════════════════════════════════════════════════════════════════════════════

For EACH invoice line item (AFTER Steps 0-2 are complete):

STEP 1: IDENTIFY ITEM FUNCTION
- What SYSTEM does the item belong to? (power, cooling, control, production, safety, IT)
- What is its FUNCTION? (generation, distribution, transformation, control, protection)
- Is it CORE, SUPPORTING, or CONSUMABLE?

STEP 2: MAP TO LICENSE-SPECIFIC ALLOWED CATEGORIES
- Which allowed category (from Step 2 extraction) does this item belong to?
- Is the function served by this item covered under the license's scope?

STEP 3: LICENSE CONSISTENCY TEST
Confirm:
✓ The licensed activity CANNOT OPERATE without this class of equipment
✓ The item is INSTALLED INFRASTRUCTURE, not resale inventory
✓ The item will be USED OVER MULTIPLE YEARS (capital nature)

If ALL THREE are YES → ELIGIBLE (unless explicitly excluded)

═══════════════════════════════════════════════════════════════════════════════
🧠 CORE LEGAL REASONING PRINCIPLES (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════════════════════

1️⃣ FUNCTIONAL-USE TEST (PRIMARY TEST)
An item qualifies as a Capital Good if it is:
✓ Functionally required to perform the licensed activity
✓ Used over multiple years (not consumable)
✓ Not intended for resale or consumption
✓ Integrated into operations or infrastructure

This test applies EVEN IF the item is not named verbatim in any list.

2️⃣ ANNEX & LIST INTERPRETATION RULE
If a Capital Goods List (Annex) exists:
- Use it for GUIDANCE and ANALOGY
- DO NOT treat it as exhaustive unless explicitly stated
- Apply FUNCTIONAL EQUIVALENCE logic

3️⃣ SILENCE ≠ PROHIBITION (CRITICAL)
If:
- No clause explicitly EXCLUDES an item
- No clause explicitly DISQUALIFIES an item
Then:
✓ The item MUST NOT be rejected
✓ Apply functional-use test and determine eligibility

4️⃣ HARD POLICY SEPARATION RULE
Income Tax Incentives ≠ Customs Duty Incentives
❌ PROHIBITED: Using income tax exclusion to infer customs duty ineligibility

═══════════════════════════════════════════════════════════════════════════════
📊 REQUIRED OUTPUTS
═══════════════════════════════════════════════════════════════════════════════

A) GUIDELINE MAPPING PANEL (NEW - MANDATORY)
Show in output:
- licenseType: verbatim from license
- matchedGuidelineSection: section title (Amharic-first)
- articleHeading: Article/heading + page
- allowedCategories: list of allowed capital goods categories for this license

B) ITEMIZED TABLE
Per item:
- invoiceItem: verbatim from invoice (NEVER TRANSLATE)
- normalizedName: for analysis only
- clausesBound: clause_id + doc + section + page
- decisionLabel: one of the valid labels
- reasoningBullets: step-by-step logic

C) EVIDENCE REVIEW PANEL
Must display bound clause text and page reference for each item.

═══════════════════════════════════════════════════════════════════════════════
📊 DECISION LABELS (ONLY THESE ARE VALID)
═══════════════════════════════════════════════════════════════════════════════

✅ Eligible – Listed Capital Good
✅ Eligible – Listed Capital Good (Mapped)
🟢 Eligible – Essential Capital Good (Not Listed)
🟡 Provisionally Eligible – No Disqualifying Clause Found
⚠️ Requires Clarification
⚠️ Decision Deferred — Relevant clause not found
⚠️ Decision Deferred — License type unreadable
🚫 Guideline Mapping Failed — Admin Action Required
❌ Not Eligible (ONLY with explicit exclusion clause + justification)

═══════════════════════════════════════════════════════════════════════════════
✅ SUCCESS STANDARD (LICENSE-FIRST WORKFLOW)
═══════════════════════════════════════════════════════════════════════════════

A senior officer must be able to:
1. See the LICENSE TYPE extracted verbatim
2. See which GUIDELINE SECTION was matched to that license
3. See the ALLOWED CATEGORIES for that license type
4. See each ITEM linked to a specific clause from the allowed categories
5. Verify PAGE NUMBERS for all citations
6. Understand eligibility outcomes without guessing
7. Defend the decision without AI explanations

If any of these are missing → block and request clarification.

═══════════════════════════════════════════════════════════════════════════════
🧠 PHASE-BASED WORKFLOW (POLICY-FIRST ANALYSIS)
═══════════════════════════════════════════════════════════════════════════════

You MUST proceed in this order. Each phase must be explicitly completed.

═══════════════════════════════════════════════════════════════════════════════
PHASE 1 — DOCUMENT COMPREHENSION & CONTEXT BUILDING
═══════════════════════════════════════════════════════════════════════════════

BEFORE any item analysis:

1. READ AND UNDERSTAND THE LICENSE
   - Extract: Licensed activity, sector, nature of operations
   - Identify: What infrastructure/equipment is REQUIRED for this license type
   - Build: Operational dependency map

2. READ AND UNDERSTAND POLICY DOCUMENTS HOLISTICALLY
   - Identify: General capital goods definition
   - Note: What the policy ENCOURAGES vs PROHIBITS
   - Understand: Whether annexes are illustrative or exhaustive

3. USE THE PRE-INDEXED POLICY CLAUSE INDEX
   - The clause index is provided to you
   - Search for applicable clauses using: keywords, applies_to, semantic similarity
   - Expand searches beyond exact matches

Gate Status = "PASSED" if:
✅ License understood with activity extracted
✅ Policy clauses available
✅ Invoice items countable

═══════════════════════════════════════════════════════════════════════════════
PHASE 2 — ITEM-LEVEL ANALYSIS (FUNCTIONAL-USE FIRST)
═══════════════════════════════════════════════════════════════════════════════

For EACH invoice item, follow this EXACT workflow:

STEP 1: TECHNICAL UNDERSTANDING
- What is this item?
- What function does it perform?
- What system does it belong to?

STEP 2: OPERATIONAL DEPENDENCY TEST
Ask: "Can the licensed activity operate WITHOUT this item?"
- If NO → Item is functionally necessary (strong eligibility signal)
- Document the operational link explicitly

STEP 3: POLICY CLAUSE SEARCH (EXPANDED)
Search the Policy Clause Index using:
1. Exact keywords from item name
2. EXPANDED keywords (e.g., "transformer" → "electrical equipment", "power infrastructure", "machinery")
3. Category match (applies_to: capital_goods)
4. General incentive clauses

Show the search process:
"Keywords expanded to: [list]"
"Searching clauses for: [categories]"

STEP 4: CLAUSE BINDING
- If matching clause found → Bind clause_id, cite with page number
- If NO specific clause but item passes functional-use test → Use general capital goods definition
- NEVER reject solely because specific clause not found

STEP 5: ELIGIBILITY DETERMINATION
Apply this logic:

┌─────────────────────────────────────────────────────────────────────┐
│ DECISION TREE:                                                       │
│                                                                      │
│ 1. Is item in Capital Goods Annex/List?                              │
│    YES → ✅ Eligible – Listed Capital Good                          │
│                                                                      │
│ 2. Is item functionally equivalent to listed item?                   │
│    YES → ✅ Eligible – Listed Capital Good (Mapped)                 │
│                                                                      │
│ 3. Does item pass Functional-Use Test?                               │
│    (Required for operations? Used over years? Not for resale?)       │
│    YES → 🟢 Eligible – Essential Capital Good (Not Listed)          │
│                                                                      │
│ 4. Is there an EXPLICIT exclusion clause?                            │
│    YES → ❌ Not Eligible (cite exclusion clause)                    │
│    NO → 🟡 Provisionally Eligible – No Disqualifying Clause Found   │
│                                                                      │
│ 5. Is critical document missing?                                     │
│    YES → ⚠️ Requires Clarification                                  │
└─────────────────────────────────────────────────────────────────────┘

STEP 6: REASONING OUTPUT
Show the complete reasoning path:
- Item interpretation
- Operational necessity
- Policy clauses consulted (with keyword expansion)
- Why clause applies
- Final determination

═══════════════════════════════════════════════════════════════════════════════
PHASE 3 — DECISION REPORT GENERATION
═══════════════════════════════════════════════════════════════════════════════

📘 REPORT STRUCTURE
1. Document Comprehension (gate status, documents reviewed)
2. License Understanding (activity, sector, operational needs)
3. Executive Summary (counts, overall status)
4. Itemized Analysis (EVERY item, full reasoning)
5. Officer Actions Needed
6. Conclusion

📊 FOR EACH ITEM:
- itemNumber (sequential)
- invoiceItem (original text, never translated)
- normalizedName (for analysis)
- functionalRole (what it does in operations)
- operationalNecessity (can operations work without it?)
- eligibilityStatus (one clear label)
- eligibilityPath (how eligibility was determined)
- licenseAlignment (how it relates to licensed activity)
- referencedClauseIds [array]
- citations (with clause_id, page, quote)
- reasoning (step-by-step)
- essentialityAnalysis (for non-listed items)

📌 VALID DECISION LABELS (UPDATED)
✅ Eligible – Listed Capital Good
✅ Eligible – Listed Capital Good (Mapped)
🟢 Eligible – Essential Capital Good (Not Listed)
🟡 Provisionally Eligible – No Disqualifying Clause Found
⚠️ Requires Clarification
🚫 Policy Gap – Admin Action Required
❌ Not Eligible (ONLY with explicit exclusion clause cited)

🧾 LEGAL SAFETY LANGUAGE
Use:
- "Based on the reviewed documents…"
- "Subject to officer verification…"
- "Preliminary determination…"

Never use:
- "Approved" / "Rejected" / "Final decision"
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
    "licensedActivity": "exact wording from license - VERBATIM",
    "licensedActivityAmharic": "የተፈቀደ እንቅስቃሴ",
    "licenseType": "license type/category as written on license",
    "licenseTypeAmharic": "የፈቃድ ዓይነት",
    "sector": "sector/sub-sector",
    "scopeOfOperation": "description",
    "restrictions": "any limitations",
    "licenseNumber": "if present",
    "issueDate": "if present",
    "extractionStatus": "Complete | Partial | Failed"
  },
  "guidelineMapping": {
    "matchStatus": "matched | partial | not_found",
    "licenseTypeVerbatim": "exact license type text used for matching",
    "matchedSections": [
      {
        "sectionTitle": "matched guideline section title",
        "sectionTitleAmharic": "የመመሪያ ክፍል ርዕስ",
        "articleHeading": "Annex II, Category X",
        "pageNumber": 0,
        "clauseIds": ["clause_id_1", "clause_id_2"],
        "matchConfidence": "High | Medium | Low"
      }
    ],
    "allowedCategories": [
      {
        "categoryName": "Power Infrastructure",
        "categoryNameAmharic": "የኃይል መሠረተ ልማት",
        "clauseId": "DIR503_ANNEX2_CAT1",
        "pageNumber": 12,
        "examples": ["transformers", "generators", "switchgear"]
      }
    ],
    "exclusionsForLicense": ["any explicitly excluded items for this license type"],
    "mappingNote": "explanation of how license was matched to guideline"
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
      "itemClassification": "capital_equipment | capital_component | tool_consumable | ppe | unknown (REQUIRED)",
      "systemAssociation": "Power Distribution | Cooling/HVAC | IT Infrastructure | Fire Safety | Security | Production (REQUIRED)",
      "systemAssociationAmharic": "የኃይል ስርጭት | ማቀዝቀዣ | የአይቲ መሠረተ ልማት (Amharic)",
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
      "referencedClauseIds": ["clause_id_1", "clause_id_2"],
      "citations": [
        {
          "clause_id": "REQUIRED - from Policy Clause Index",
          "documentName": "policy document name",
          "articleSection": "Article/Annex/Item X.Y.Z",
          "pageNumber": 0,
          "quote": "≤25 word quote in original language (REQUIRED - NO EMPTY CITATIONS)",
          "relevance": "why this clause applies",
          "file_url": "URL to source document (for external linking)"
        }
      ],
      "essentialityAnalysis": {
        "functionalNecessity": "REQUIRED for non-listed items: explanation of why item is/is not essential",
        "operationalLink": "direct technical/operational role",
        "capitalNature": "enduring use assessment",
        "noProhibition": "no explicit exclusion found OR explicit exclusion clause cited",
        "testResult": "PASSED | FAILED | INCONCLUSIVE",
        "supportingClauseIds": ["clause_ids supporting essentiality determination"]
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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
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

    console.log("Calling Anthropic API (claude-3-5-sonnet)...");

    // Anthropic messages API with tool use to force structured JSON output
    const body: any = {
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 32000,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          name: "return_policy_analysis",
          description: "Return the full analysis as a single JSON object matching the required output format.",
          input_schema: {
              type: "object",
              properties: {
                documentComprehension: { 
                  type: "object",
                  required: ["gateStatus"],
                  properties: {
                    gateStatus: { type: "string", enum: ["PASSED", "BLOCKED"] },
                    blockedReason: { type: "string" },
                    documents: { 
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          documentName: { type: "string" },
                          documentType: { type: "string" },
                          issuingAuthority: { type: "string" },
                          languagesDetected: { type: "array", items: { type: "string" } },
                          pageCount: { type: "number" },
                          ocrConfidence: { type: "string" },
                          readStatus: { type: "string" }
                        }
                      }
                    },
                    policyIndex: { 
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          documentName: { type: "string" },
                          articleSection: { type: "string" },
                          pageNumber: { type: "number" },
                          clauseHeading: { type: "string" },
                          clauseText: { type: "string" }
                        }
                      }
                    },
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
                  required: ["licensedActivity", "extractionStatus"],
                  properties: {
                    licensedActivity: { type: "string" },
                    licensedActivityAmharic: { type: "string" },
                    licenseType: { type: "string" },
                    licenseTypeAmharic: { type: "string" },
                    sector: { type: "string" },
                    scopeOfOperation: { type: "string" },
                    restrictions: { type: "string" },
                    licenseNumber: { type: "string" },
                    extractionStatus: { type: "string", enum: ["Complete", "Partial", "Failed"] }
                  }
                },
                guidelineMapping: {
                  type: "object",
                  required: ["matchStatus"],
                  properties: {
                    matchStatus: { type: "string", enum: ["matched", "partial", "not_found"] },
                    licenseTypeVerbatim: { type: "string" },
                    matchedSections: { 
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          sectionTitle: { type: "string" },
                          sectionTitleAmharic: { type: "string" },
                          articleHeading: { type: "string" },
                          pageNumber: { type: "number" },
                          clauseIds: { type: "array", items: { type: "string" } },
                          matchConfidence: { type: "string" }
                        }
                      }
                    },
                    allowedCategories: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          categoryName: { type: "string" },
                          categoryNameAmharic: { type: "string" },
                          clauseId: { type: "string" },
                          pageNumber: { type: "number" },
                          examples: { type: "array", items: { type: "string" } }
                        }
                      }
                    },
                    exclusionsForLicense: { type: "array", items: { type: "string" } },
                    mappingNote: { type: "string" }
                  }
                },
                complianceItems: { 
                  type: "array", 
                  minItems: 1,
                  items: { 
                    type: "object",
                    required: ["itemNumber", "invoiceItem", "normalizedName", "eligibilityStatus", "licenseAlignment", "itemClassification"],
                    properties: {
                      itemNumber: { type: "number" },
                      invoiceItem: { type: "string" },
                      normalizedName: { type: "string" },
                      eligibilityStatus: { type: "string" },
                      licenseAlignment: { type: "string" },
                      // NEW: Spec 4️⃣ - Item Classification (mandatory)
                      itemClassification: { 
                        type: "string", 
                        enum: ["capital_equipment", "capital_component", "tool_consumable", "ppe", "unknown"],
                        description: "Classification: capital_equipment (integral/installed), capital_component (parts), tool_consumable (tools/consumables), ppe (safety gear), unknown"
                      },
                      // NEW: Spec 4️⃣ - System Association (functional grouping)
                      systemAssociation: { 
                        type: "string",
                        description: "Functional system the item belongs to (e.g., Power Distribution, Cooling/HVAC, IT Infrastructure, Fire Safety)"
                      },
                      systemAssociationAmharic: { type: "string" },
                      // NEW: Spec 6️⃣ - Document URL for external linking
                      documentUrl: {
                        type: "string",
                        description: "URL to source policy document for external citation linking"
                      },
                      referencedClauseIds: { type: "array", items: { type: "string" } },
                      citations: { 
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            clause_id: { type: "string" },
                            documentName: { type: "string" },
                            articleSection: { type: "string" },
                            pageNumber: { type: "number" },
                            quote: { type: "string" },
                            relevance: { type: "string" },
                            file_url: { type: "string", description: "URL to source document for external linking" }
                          }
                        }
                      },
                      essentialityAnalysis: {
                        type: "object",
                        properties: {
                          functionalNecessity: { type: "string" },
                          operationalLink: { type: "string" },
                          capitalNature: { type: "string" },
                          noProhibition: { type: "string" },
                          testResult: { type: "string", enum: ["PASSED", "FAILED", "INCONCLUSIVE"] },
                          supportingClauseIds: { type: "array", items: { type: "string" } }
                        }
                      },
                      reasoning: { 
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            point: { type: "string" },
                            type: { type: "string" }
                          }
                        }
                      }
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
                "guidelineMapping",
                "complianceItems",
                "analysisCompleteness",
                "officerActionsNeeded",
              ],
              additionalProperties: true,
          },
        },
      ],
      tool_choice: { type: "tool", name: "return_policy_analysis" },
    };

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutMs = 120_000;
    const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
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
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            response.status === 429
              ? "Rate limit exceeded. Please try again later."
              : response.status === 402 || response.status === 529
                ? "Anthropic API quota exceeded. Please check your API key and billing."
                : "AI service returned an error. Please retry.",
          code: `ANTHROPIC_${response.status}`,
          rawErrorSnippet: errorText.slice(0, 1500),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let aiResponse: any;
    try {
      aiResponse = await response.json();
    } catch (jsonError) {
      console.error("Failed to parse Anthropic response as JSON:", jsonError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid response from AI service. Please try again.",
          code: "ANTHROPIC_INVALID_JSON",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.log("Anthropic response received, stop_reason:", aiResponse?.stop_reason);

    const truncate = (s: string, max = 8000) =>
      s.length > max ? `${s.slice(0, max)}\n...[truncated ${s.length - max} chars]` : s;

    // Anthropic returns content as an array; find the tool_use block
    const contentBlocks: any[] = aiResponse?.content ?? [];
    const toolUseBlock = contentBlocks.find((b: any) => b.type === "tool_use");
    const textBlock = contentBlocks.find((b: any) => b.type === "text");

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

    let analysisResult: any = null;

    // Prefer structured tool_use input (already parsed JSON object from Anthropic)
    if (toolUseBlock?.input && typeof toolUseBlock.input === "object") {
      analysisResult = toolUseBlock.input;
    } else if (toolUseBlock?.input && typeof toolUseBlock.input === "string") {
      analysisResult = parseFromText(toolUseBlock.input);
    } else if (textBlock?.text) {
      analysisResult = parseFromText(textBlock.text);
    }

    const finishReason = aiResponse?.stop_reason;

    if (!analysisResult) {
      const aiSnippet = truncate(JSON.stringify(aiResponse ?? {}), 2000);
      console.error("Anthropic response had no parseable content", { finishReason, aiSnippet });
      return new Response(
        JSON.stringify({
          success: false,
          error: finishReason === "max_tokens"
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
