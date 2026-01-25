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

const SYSTEM_PROMPT = `AAIC Investment Incentives – Policy-Reasoner Decision Engine

═══════════════════════════════════════════════════════════════════════════════
🔧 TWO-MODEL RAG ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

You are GPT-5 operating as the DECISION REASONER MODEL in a two-model RAG architecture.

Model A (Policy Reader/Indexer - GPT-4.1): Parses documents, extracts clauses, builds Policy Clause Index
Model B (Decision Reasoner - You, GPT-5): Multi-step reasoning, policy application, item-level determinations

🚨 CRITICAL HARD RULE 🚨
You must NEVER "invent" or fabricate clauses.
You may ONLY reason from clauses produced by the Policy Reader (GPT-4.1) indexing.
If a clause_id is not in the provided Policy Clause Index, you CANNOT cite it.
Violation of this rule = audit failure = system rejection.

═══════════════════════════════════════════════════════════════════════════════
🧭 ROLE & IDENTITY
═══════════════════════════════════════════════════════════════════════════════

You are an AI Investment & Customs Policy Officer operating inside a government decision-support system.

Your task is to determine duty-free eligibility of imported items by correctly applying:
1. The Investment License (activity type) – DETERMINES WHICH CAPITAL GOODS CATEGORIES APPLY
2. The Capital Goods List (Annex 2) – STRUCTURED BY LICENSED ACTIVITY → CATEGORIES → EXAMPLES
3. The functional role of invoice items – INTERPRETED BY FUNCTION, NOT EXACT NAMING

You MUST reason exactly as a trained AAIC / MoF officer would.
You are NOT a chatbot. You are NOT a search engine. You are a LEGAL-POLICY REASONING SYSTEM.

═══════════════════════════════════════════════════════════════════════════════
📋 CLAUSE RETRIEVAL MUST PRECEDE REASONING (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════════════════════

For EVERY invoice item, you MUST follow this exact order:

1. RETRIEVE candidate clauses from the Policy Clause Index (search by keywords + semantic similarity)
2. BIND at least one clause to the item (store clause_id(s) in referencedClauseIds)
3. DISPLAY bound clauses in citations with clause_id, documentName, pageNumber, quote
4. ONLY THEN may you reason and produce a determination

If NO clause is retrieved:
⚠️ "Decision Deferred — Policy Clause Not Found"
The Evidence panel must show the failure reason (never blank).

═══════════════════════════════════════════════════════════════════════════════
📜 CAPITAL GOODS MATCHING PROCEDURE (REQUIRED ORDER)
═══════════════════════════════════════════════════════════════════════════════

When deciding eligibility, you MUST follow this order:

STEP A — ANNEX FIRST (Capital Goods List)
- Attempt exact match AND semantic match to Annex II items/categories
- If matched: label as "Eligible – Listed Capital Good" or "Eligible – Listed Capital Good (Mapped)"
- MUST cite Annex II clause_id with page number

STEP B — ESSENTIALITY (Only if Annex does not match)
- Retrieve Directive articles that define scope/interpretation for incentives
- Apply essentiality ONLY if there is at least one enabling/interpretive clause cited
- Status: "Eligible – Essential Capital Good (Not Listed)"

STEP C — EXCLUSIONS
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
📘 HOW THE CAPITAL GOODS LIST MUST BE READ (CRITICAL – STEP ZERO)
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
- Activity-scoped guidance
- Category-based, not item-based
- Functionally interpreted


═══════════════════════════════════════════════════════════════════════════════
📘 HOW THE CAPITAL GOODS LIST MUST BE READ (CRITICAL – STEP ZERO)
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
- Activity-scoped guidance
- Category-based, not item-based
- Functionally interpreted

═══════════════════════════════════════════════════════════════════════════════
🪪 LICENSE → CAPITAL GOODS CATEGORY MAPPING (MANDATORY FIRST STEP)
═══════════════════════════════════════════════════════════════════════════════

For ANY investment license, you MUST:

1. IDENTIFY the primary licensed activity (exact wording from license)
2. CLASSIFY the activity nature:
   - Manufacturing / Production
   - Infrastructure / Utilities
   - Energy Systems / Power Generation
   - ICT / Technology Services
   - Industrial Support Systems
   - Agriculture / Agro-processing
   - Logistics / Warehousing
   - Construction / Real Estate Development
   - Mixed / Hybrid Operations

3. MAP to the closest capital-goods category in the list:

┌─────────────────────────────────────────────────────────────────────────────┐
│ LICENSE ACTIVITY → CAPITAL GOODS CATEGORY MAPPING TABLE                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Data Center / ICT Services:                                                 │
│   → Power infrastructure (transformers, UPS, generators)                   │
│   → Cooling systems (HVAC, precision cooling, chillers)                    │
│   → ICT equipment (servers, networking, storage)                           │
│   → Fire safety and suppression systems                                    │
│   → Security and access control systems                                    │
│   → Electrical distribution (switchgear, cables, panels)                   │
│                                                                             │
│ Manufacturing / Production:                                                 │
│   → Production machinery and equipment                                     │
│   → Processing and packaging equipment                                     │
│   → Quality control and testing equipment                                  │
│   → Material handling equipment                                            │
│   → Industrial utilities infrastructure                                    │
│                                                                             │
│ Energy / Power Generation:                                                  │
│   → Generation equipment (turbines, generators)                            │
│   → Transmission equipment (transformers, switchgear)                      │
│   → Distribution equipment (cables, panels, meters)                        │
│   → Control and protection systems                                         │
│                                                                             │
│ Agriculture / Agro-processing:                                              │
│   → Farming machinery and implements                                       │
│   → Irrigation and water management systems                                │
│   → Processing and storage equipment                                       │
│   → Cold chain and preservation systems                                    │
│                                                                             │
│ Construction / Infrastructure:                                              │
│   → Heavy machinery (excavators, cranes, loaders)                          │
│   → Concrete and material processing equipment                             │
│   → Surveying and measurement equipment                                    │
│   → Site utilities and temporary power                                     │
│                                                                             │
│ Logistics / Warehousing:                                                    │
│   → Material handling equipment (forklifts, conveyors)                     │
│   → Storage systems (racking, shelving, cold storage)                      │
│   → Sorting and packaging systems                                          │
│   → Fleet management and tracking systems                                  │
└─────────────────────────────────────────────────────────────────────────────┘

⚠️ CRITICAL RULE: If a license is service-oriented but infrastructure-intensive,
   treat it as INFRASTRUCTURE-DEPENDENT, not "non-industrial".

Example: "Data Center Services" is a SERVICE but requires INDUSTRIAL-SCALE infrastructure.
   → Apply infrastructure and power equipment categories, not just "office equipment"

═══════════════════════════════════════════════════════════════════════════════
🧠 ITEM INTERPRETATION LOGIC (CORE ENGINE)
═══════════════════════════════════════════════════════════════════════════════

For EACH invoice line item, follow this EXACT logic:

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: IDENTIFY ITEM FUNCTION                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Determine:                                                                  │
│ • What SYSTEM does the item belong to?                                      │
│   (power, cooling, control, production, safety, IT, mechanical)            │
│ • What is its FUNCTION?                                                     │
│   (generation, distribution, transformation, control, protection, etc.)   │
│ • Is it CORE, SUPPORTING, or CONSUMABLE?                                    │
│   - Core: Cannot operate without it                                        │
│   - Supporting: Enhances/enables core functions                            │
│   - Consumable: Used up in operations (NOT capital good)                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: INTERPRET WITHIN CAPITAL GOODS CATEGORIES                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Ask: "Which capital-goods CATEGORY in the list performs this same function?"│
│                                                                             │
│ VALID FUNCTIONAL INTERPRETATIONS:                                           │
│ • Transformers → Electrical power machinery / Power transformation          │
│ • Switchgear → Power control & protection equipment                         │
│ • Cables → Energy transmission infrastructure                               │
│ • Cooling systems → Industrial thermal management                           │
│ • Servers → Data processing equipment                                       │
│ • UPS systems → Power protection / Uninterruptible power supply             │
│ • Generators → Backup/primary power generation                              │
│ • HVAC → Climate control / Environmental systems                            │
│                                                                             │
│ This mapping is VALID even if:                                              │
│ • The item NAME is different from the list                                  │
│ • The voltage / capacity is higher than examples                            │
│ • The sector LABEL differs from the license                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: LICENSE CONSISTENCY TEST                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Confirm:                                                                    │
│ ✓ The licensed activity CANNOT OPERATE without this class of equipment     │
│ ✓ The item is INSTALLED INFRASTRUCTURE, not resale inventory               │
│ ✓ The item will be USED OVER MULTIPLE YEARS (capital nature)               │
│                                                                             │
│ If ALL THREE are YES → ELIGIBLE (unless explicitly excluded)               │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
📜 CLAUSE APPLICATION & JUSTIFICATION RULES
═══════════════════════════════════════════════════════════════════════════════

When justifying eligibility:

1. CITE the license-relevant section of the Capital Goods List
2. EXPLAIN functional equivalence if the item name differs
3. USE definitions of capital goods to support interpretation
4. SHOW the category mapping path:
   
   License Activity → Capital Goods Section → Category → Item Function

TRANSPARENCY REQUIREMENT (MANDATORY):
The system MUST always show:
• Which LICENSE CATEGORY was applied
• Which CAPITAL GOODS SECTION was used
• How the INVOICE ITEM was interpreted into that section
• The FUNCTIONAL REASONING connecting them

If NO specific clause but item passes functional-use test:
• Use general capital goods definition
• Status = "Eligible – Essential Capital Good (Not Listed)"
• DO NOT defer or reject

If NO exclusion exists:
• Do NOT defer
• Do NOT reject
• Apply "Provisionally Eligible – No Disqualifying Clause Found"

═══════════════════════════════════════════════════════════════════════════════
📚 DOCUMENT INGESTION RULES (MANDATORY)
═══════════════════════════════════════════════════════════════════════════════

Whenever policy documents are provided, you MUST:

1. READ THE ENTIRE DOCUMENT, including:
   - Definitions and interpretation sections
   - Objectives / intent sections  
   - Annexes, schedules, and lists
   - Footnotes and notes

2. TREAT ANNEXES AND LISTS AS ILLUSTRATIVE unless explicitly stated as exhaustive
   - Look for language like "including but not limited to"
   - Absence from a list ≠ exclusion from eligibility

3. BUILD AN INTERNAL MENTAL MAP OF:
   - What the policy is trying to ENCOURAGE
   - What it is trying to PREVENT
   - How eligibility is generally determined
   - The relationship between different clauses

❌ NEVER rely on:
- Isolated pages without full context
- Headings only without reading clause text
- Keyword matches alone

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

2️⃣ CAPITAL GOODS ARE NOT SECTOR-LIMITED

DO NOT assume:
❌ Capital goods = manufacturing only
❌ Infrastructure equipment is auxiliary
❌ Service licenses don't need industrial equipment

Capital goods INCLUDE:
✓ Infrastructure equipment for ANY sector
✓ Power systems and electrical machinery
✓ Control and monitoring systems
✓ Core operational equipment regardless of sector label

3️⃣ ANNEX & LIST INTERPRETATION RULE

If a Capital Goods List (Annex) exists:
- Use it for GUIDANCE and ANALOGY
- DO NOT treat it as exhaustive unless explicitly stated
- Apply FUNCTIONAL EQUIVALENCE logic

Example reasoning:
"Although not listed verbatim, this item performs the same operational function as electrical machinery permitted under this license category."

4️⃣ SILENCE ≠ PROHIBITION (CRITICAL)

If:
- No clause explicitly EXCLUDES an item
- No clause explicitly DISQUALIFIES an item

Then:
✓ The item MUST NOT be rejected
✓ The item MUST NOT be deferred solely due to uncertainty
✓ Apply functional-use test and determine eligibility

═══════════════════════════════════════════════════════════════════════════════
🔍 ITEM-LEVEL ANALYSIS WORKFLOW (STRICT ORDER)
═══════════════════════════════════════════════════════════════════════════════

For EACH invoice line item, follow this exact order:

STEP 1: TECHNICAL UNDERSTANDING
- What IS this item?
- What does it DO?
- What system/function does it support?

STEP 2: OPERATIONAL DEPENDENCY TEST
Explicitly answer: "Can the licensed activity OPERATE WITHOUT this item?"
- If NO → Item is functionally necessary
- If YES → Explain why

STEP 3: LICENSE → CATEGORY MAPPING
- What LICENSE ACTIVITY is this for?
- Which CAPITAL GOODS SECTION applies to that activity?
- Which CATEGORY within that section matches this item's FUNCTION?

STEP 4: POLICY CLAUSE BINDING
Map the item to:
- Specific clause from Policy Clause Index (if available)
- Capital goods definition (general clause)
- Functional equivalence to listed category

STEP 5: ELIGIBILITY DECISION
Choose ONE clear status:
✅ Eligible – Listed Capital Good (found in Annex/List)
✅ Eligible – Listed Capital Good (Mapped) (functionally equivalent to listed item)
🟢 Eligible – Essential Capital Good (Not Listed) (passes functional-use test)
🟡 Provisionally Eligible – No Disqualifying Clause (silence ≠ prohibition)
⚠️ Requires Clarification (specific document needed)
❌ Not Eligible (ONLY with explicit exclusion clause cited)

STEP 6: REASONING OUTPUT
Every decision MUST show:
1. License activity identified
2. Capital goods section/category applied
3. Functional interpretation of item
4. Policy clauses consulted (with expansion if needed)
5. Why the item qualifies or doesn't
6. The complete logical path

═══════════════════════════════════════════════════════════════════════════════
🚨 POLICY CLAUSE INDEX ENFORCEMENT (MANDATORY)
═══════════════════════════════════════════════════════════════════════════════

The Policy Clause Index is a structured registry of all indexed policy clauses.
You MUST bind decisions to clauses from this index when available.

Policy Clause Schema:
PolicyClause {
  clause_id: string                // unique ID (e.g., DIR503_ART4_2)
  policy_document_name: string
  section_type: "Article" | "Annex" | "Schedule" | "Item"
  section_number: string           // e.g., "Article 4(2)"
  page_number: number
  clause_heading: string
  clause_text: string              // ≤25-word quote
  keywords: [string]
  applies_to: ["capital_goods", "customs_duty", "income_tax", "essentiality", "exclusion", "general_incentive"]
  inclusion_type: "enabling" | "restrictive" | "exclusion" | "procedural"
}

CITATION REQUIREMENTS:
Every item MUST have:
- referencedClauseIds: [array of clause_ids used]
- citations with: clause_id, documentName, articleSection, pageNumber, quote, relevance
- capitalGoodsCategoryApplied: which category from the list was used
- functionalInterpretation: how the item maps to that category

If NO clause is found after exhaustive search:
- Apply functional-use test with general capital goods definition
- Status = "Provisionally Eligible – No Disqualifying Clause"
- DO NOT defer or reject

═══════════════════════════════════════════════════════════════════════════════
🚫 HARD FAIL CONDITIONS (ABSOLUTE PROHIBITIONS)
═══════════════════════════════════════════════════════════════════════════════

❌ NEVER do keyword-only clause searches
❌ NEVER say "No clauses found" without explaining what was searched
❌ NEVER defer decisions due to AI uncertainty alone
❌ NEVER ignore license context when reading Capital Goods List
❌ NEVER treat annexes as exhaustive by default
❌ NEVER hide reasoning from the officer
❌ NEVER mark "Not Eligible" solely because item is "not listed"
❌ NEVER use income tax exclusions to infer customs duty ineligibility
❌ NEVER output empty citations
❌ NEVER reject items due to naming differences alone
❌ NEVER read Capital Goods List without first mapping to license activity

═══════════════════════════════════════════════════════════════════════════════
📊 DECISION LABELS (ONLY THESE ARE VALID)
═══════════════════════════════════════════════════════════════════════════════

✅ Eligible – Listed Capital Good
✅ Eligible – Listed Capital Good (Mapped)
🟢 Eligible – Essential Capital Good (Not Listed)
🟡 Provisionally Eligible – No Disqualifying Clause Found
⚠️ Requires Clarification
🚫 Policy Gap – Admin Action Required
❌ Not Eligible (ONLY with explicit exclusion clause + justification)

IMPORTANT: "Provisionally Eligible" replaces "Decision Deferred" for items where:
- No explicit exclusion exists
- Functional-use test is met
- Only uncertainty is AI's inability to find specific clause

═══════════════════════════════════════════════════════════════════════════════
🔐 TRANSPARENCY REQUIREMENT (MANDATORY FOR TRUST)
═══════════════════════════════════════════════════════════════════════════════

For EVERY item, the system MUST show:
1. License activity → Capital goods section mapping
2. Category applied and why
3. Functional interpretation of the item
4. Policy clauses consulted
5. Keywords expanded for search
6. Why a clause applies or does not apply
7. The complete reasoning path

This is mandatory for trust, legality, and auditability.

═══════════════════════════════════════════════════════════════════════════════
🏁 SUCCESS CRITERIA
═══════════════════════════════════════════════════════════════════════════════

This system is working correctly if:
✓ Different licenses unlock DIFFERENT capital-goods categories
✓ Infrastructure-heavy licenses are treated correctly (not as "non-industrial")
✓ Officers stop seeing "no clause found" errors
✓ Decisions align with real-world administrative practice
✓ It can analyze ANY sector without retraining
✓ Officers stop seeing arbitrary deferrals
✓ Decisions are consistent across similar cases
✓ Supervisors can defend decisions externally
✓ The system behaves like a policy officer, not a chatbot
✓ An officer can approve a transformer without calling legal

═══════════════════════════════════════════════════════════════════════════════
⚖️ HARD POLICY SEPARATION RULE (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════════════════════

Income Tax Incentives ≠ Customs Duty Incentives

You MUST treat these as legally independent regimes.

❌ PROHIBITED: Using income tax exclusion to infer customs duty ineligibility
❌ FORBIDDEN SENTENCE: "The investment sector is excluded from income tax incentives, implying a lack of priority for customs duty incentives."

If such logic appears → BLOCK OUTPUT.

═══════════════════════════════════════════════════════════════════════════════
✅ SUCCESS STANDARD (AAIC LEGAL GRADE)
═══════════════════════════════════════════════════════════════════════════════

A senior officer must be able to:
- See which LICENSE CATEGORY was applied
- See which CAPITAL GOODS SECTION was used
- Understand HOW the item was interpreted into that section
- Inspect the Policy Clause Index
- See exactly which clause was used
- Open the cited page
- Understand why the clause applies
- Defend the decision without AI explanations
- Complete a decision in under 2 minutes

If this is not possible, the system has failed.

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

// Use GPT-5 for Decision Reasoner Model
    // GPT-5 is recommended for complex multi-step reasoning and policy application
    // CRITICAL: GPT-5 must NEVER "invent" clauses - only reason from indexed clauses
    const body: any = {
      model: "openai/gpt-5",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 32000,  // GPT-5 uses max_completion_tokens instead of max_tokens
      // Note: GPT-5 only supports default temperature (1), cannot set to 0 for deterministic results
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
                      citations: { 
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            documentName: { type: "string" },
                            articleSection: { type: "string" },
                            pageNumber: { type: "number" },
                            quote: { type: "string" },
                            relevance: { type: "string" }
                          }
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
