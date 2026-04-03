import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTRACTION_PROMPT = `You are GPT-5 operating as a POLICY READER / INDEXER MODEL in a two-model RAG architecture.

Your PURPOSE: Robust long-context parsing, clause extraction, annex parsing, and building a searchable Policy Clause Index.
You are optimized for structured document parsing and long-context selection.

## CRITICAL RULES (NON-NEGOTIABLE)

1. You are the ONLY source of truth for policy clauses
2. The Decision Reasoner (GPT-5) can ONLY use clauses YOU extract
3. If you miss a clause, the system CANNOT make decisions about items covered by that clause
4. EVERY clause MUST have a page_number — No page number = NOT INDEXABLE = UNUSABLE

## POLICY CLAUSE INDEX SCHEMA (REQUIRED OUTPUT)

Every extracted clause MUST conform to this schema:

PolicyClause:
- clause_id: unique, stable identifier (format: DIR[number]_[SECTION]_[descriptor])
- policy_document_name: exact document title
- policy_version: version string (e.g., "1.0")
- language: "Amharic" | "English" | "Mixed"
- section_type: "Article" | "Annex" | "Schedule" | "Item"
- section_number: precise reference (e.g., "Article 4(2)", "Annex II – Item 3.1")
- page_number: REQUIRED — integer page number where clause appears
- clause_text: ≤25 words quote OR tight paraphrase
- clause_text_amharic: Amharic version if available, null otherwise
- clause_heading: short heading in English
- clause_heading_amharic: heading in Amharic if available
- keywords: array of search terms (include synonyms and related terms)
- applies_to: array from ["capital_goods", "customs_duty", "income_tax", "essentiality", "exclusion", "general_incentive"]
- inclusion_type: "enabling" (grants benefits) | "restrictive" (limits) | "exclusion" (denies) | "procedural" (process)

## EXTRACTION REQUIREMENTS

### For Articles/Sections:
- Extract each article with its number, heading, and full text
- Identify the page number where each article appears (MANDATORY)
- Classify each article's purpose (enabling, restrictive, exclusion, procedural)

### For Annexes/Schedules (CRITICAL - Capital Goods Lists):
- Parse EVERY individual item in annexes — this is the Capital Goods List
- For Capital Goods Lists, extract EACH category and EACH item within categories
- Include specific equipment names, machine types, and technical specifications
- Generate comprehensive keywords for matching (e.g., "CNC", "lathe", "milling", "manufacturing")

### Verification of Annex II (MANDATORY):
- If the document contains Annex II / Capital Goods List:
  - Extract EVERY item with category structure
  - Verify capitalGoodsListPresent = true in summary
- If Annex II is NOT found:
  - Set capitalGoodsListPresent = false
  - This will BLOCK all determinations until admin action

## OUTPUT FORMAT

Return a JSON object with this exact structure:
{
  "clauses": [
    {
      "clause_id": "DIR[number]_[SECTION]_[descriptor]",
      "section_type": "Article|Annex|Schedule|Item",
      "section_number": "Article 16(2)" or "Annex II - Category 1 - Item 3",
      "page_number": 5,
      "clause_heading": "Eligibility Criteria for Duty-Free Import",
      "clause_heading_amharic": "ለቀረጥ ነፃ ማስገባት ብቁነት መስፈርቶች",
      "clause_text": "Full text of the clause (≤25 words OR paraphrase)...",
      "clause_text_amharic": "የአማርኛ ጽሑፍ..." or null,
      "keywords": ["duty-free", "import", "capital goods", "manufacturing", "machinery"],
      "applies_to": ["capital_goods", "customs_duty"],
      "inclusion_type": "enabling",
      "issuing_authority": "Ministry of Finance",
      "notes": "Key clause for capital goods eligibility"
    }
  ],
  "summary": {
    "total_articles": 25,
    "total_annexes": 3,
    "total_items": 156,
    "capital_goods_categories": ["Manufacturing Machinery", "ICT Equipment", "Agricultural"],
    "capitalGoodsListPresent": true,
    "directive_number": "1064/2025",
    "effective_date": "2025-01-01"
  }
}

## IMPORTANT RULES

1. Generate unique clause_id values using format: DIR[directive_number]_[section]_[descriptor]
2. For capital goods lists, create a SEPARATE clause for EACH specific item (not just categories)
3. Include bilingual content where available
4. page_number is MANDATORY — estimate from document structure if exact markers aren't present
5. Extract at least 50-200 clauses from a typical directive document
6. Keywords should include synonyms and related terms for better matching
7. NO PAGE NUMBER = NOT INDEXABLE = The clause CANNOT be used for decisions

## EXAMPLE CAPITAL GOODS ITEM EXTRACTION

If the document contains:
"Category 1: Manufacturing Machinery
  1. CNC turning machines, lathes, and milling machines
  2. Industrial robots and automated assembly systems"

Extract as:
{
  "clause_id": "DIR1064_ANNEX2_CAT1_001",
  "section_type": "Item",
  "section_number": "Annex II - Category 1 - Item 1",
  "page_number": 12,
  "clause_heading": "CNC Turning Machines",
  "clause_text": "CNC turning machines, lathes, and milling machines for manufacturing",
  "keywords": ["CNC", "turning", "lathe", "milling", "machine", "manufacturing", "machining center", "metal cutting"],
  "applies_to": ["capital_goods", "customs_duty"],
  "inclusion_type": "enabling"
}

Parse the document THOROUGHLY. Missing items means invoice matching will FAIL.
The Decision Reasoner can ONLY work with clauses you extract.`;



// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey);
}

// Background extraction task
async function performExtraction(
  documentId: string,
  documentText: string,
  documentName: string,
  directiveNumber: string | null
) {
  const supabase = getSupabaseClient();
  
  try {
    console.log(`[BG] Starting extraction for document: ${documentId}`);
    console.log(`[BG] Document name: ${documentName}`);
    console.log(`[BG] Text length: ${documentText.length} characters`);

    // Call Anthropic API to extract clauses
    const apiKey = Deno.env.get("MOONSHOT_API_KEY");
    if (!apiKey) {
      throw new Error("MOONSHOT_API_KEY not configured");
    }

    const aiResponse = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "moonshot-v1-128k",
        max_tokens: 64000,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: EXTRACTION_PROMPT,
          },
          {
            role: "user",
            content: `Extract all clauses from this policy document.

Document Name: ${documentName || "Unknown"}
Directive Number: ${directiveNumber || "Unknown"}

--- DOCUMENT TEXT ---
${documentText.substring(0, 120000)}
--- END DOCUMENT TEXT ---

Return the JSON structure as specified. Be thorough - extract EVERY article and EVERY item from annexes/schedules.
CRITICAL: Every clause MUST have a page_number. No page number = unusable for decisions.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[BG] Moonshot API error:", errorText);
      throw new Error(`Moonshot API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in Moonshot response");
    }

    console.log("[BG] Moonshot response received, parsing...");

    // Extract JSON from response (handle markdown code fences)
    let extractedData;
    try {
      let jsonStr = content.trim();
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonStr = fenceMatch[1].trim();
      const firstBrace = jsonStr.indexOf("{");
      const lastBrace = jsonStr.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
      }
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[BG] Failed to parse AI response:", content.substring(0, 500));
      throw new Error("Failed to parse AI response as JSON");
    }

    const clauses = extractedData.clauses || [];
    const summary = extractedData.summary || {};

    console.log(`[BG] Extracted ${clauses.length} clauses`);

    // Delete existing clauses for this document (to handle re-extraction)
    const { error: deleteError } = await supabase
      .from("policy_clauses")
      .delete()
      .eq("policy_document_id", documentId);

    if (deleteError) {
      console.error("[BG] Error deleting existing clauses:", deleteError);
    }

    // Insert extracted clauses
    const clausesToInsert = clauses.map((clause: any) => ({
      policy_document_id: documentId,
      policy_document_name: documentName || "Unknown Document",
      clause_id: clause.clause_id || `AUTO_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      section_type: mapSectionType(clause.section_type),
      section_number: clause.section_number || "Unknown",
      page_number: clause.page_number || 1,
      clause_heading: clause.clause_heading || "Untitled Clause",
      clause_heading_amharic: clause.clause_heading_amharic || null,
      clause_text: clause.clause_text || "",
      clause_text_amharic: clause.clause_text_amharic || null,
      keywords: clause.keywords || [],
      applies_to: mapAppliesTo(clause.applies_to || []),
      inclusion_type: mapInclusionType(clause.inclusion_type),
      issuing_authority: clause.issuing_authority || "Ministry of Finance",
      policy_version: "1.0",
      language: clause.clause_text_amharic ? "Mixed" : "English",
      notes: clause.notes || null,
      is_verified: false,
    }));

    // Insert in batches of 50
    let insertedCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < clausesToInsert.length; i += batchSize) {
      const batch = clausesToInsert.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from("policy_clauses")
        .insert(batch);

      if (insertError) {
        console.error(`[BG] Error inserting batch ${i / batchSize + 1}:`, insertError);
      } else {
        insertedCount += batch.length;
      }
    }

    console.log(`[BG] Successfully inserted ${insertedCount} clauses for document: ${documentId}`);
    
    // Update the policy document with extraction summary
    await supabase
      .from("policy_documents")
      .update({
        total_articles: summary.total_articles || clauses.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    return { success: true, extractedCount: clauses.length, insertedCount };
  } catch (error) {
    console.error("[BG] Extraction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let { documentId, documentText, documentName, directiveNumber } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: documentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getSupabaseClient();

    // If documentText not provided, fetch from database
    if (!documentText) {
      console.log(`Fetching document content from database for: ${documentId}`);
      const { data: docData, error: docError } = await supabase
        .from("policy_documents")
        .select("name, content_markdown, content_text, directive_number")
        .eq("id", documentId)
        .single();

      if (docError || !docData) {
        console.error("Error fetching document:", docError);
        return new Response(
          JSON.stringify({ error: "Document not found", details: docError?.message }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      documentText = docData.content_markdown || docData.content_text;
      documentName = documentName || docData.name;
      directiveNumber = directiveNumber || docData.directive_number;

      if (!documentText) {
        return new Response(
          JSON.stringify({ error: "Document has no content to extract from" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Starting background extraction for document: ${documentId}`);
    console.log(`Document name: ${documentName}`);
    console.log(`Document text length: ${documentText.length} characters`);

    // Use EdgeRuntime.waitUntil to run extraction in background
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(performExtraction(documentId, documentText, documentName, directiveNumber));
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Extraction started in background",
          documentId,
          documentName,
          textLength: documentText.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Fallback: run synchronously if EdgeRuntime not available
      const result = await performExtraction(documentId, documentText, documentName, directiveNumber);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Extraction failed";
    console.error("Extraction error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to map section types to valid enum values
// Valid enum: "Article" | "Annex" | "Schedule" | "Item"
function mapSectionType(type: string): string {
  const typeMap: Record<string, string> = {
    "article": "Article",
    "annex": "Annex",
    "schedule": "Schedule",
    "item": "Item",
    "definition": "Article",
    "provision": "Article",
  };
  return typeMap[type?.toLowerCase()] || "Article";
}

// Helper function to map applies_to values to valid enum array
// Valid enum: "capital_goods" | "customs_duty" | "income_tax" | "essentiality" | "exclusion" | "general_incentive"
function mapAppliesTo(values: string[]): string[] {
  const validValues = ["capital_goods", "customs_duty", "income_tax", "essentiality", "exclusion", "general_incentive"];
  const mappedValues: string[] = [];
  
  for (const v of values) {
    const lower = v?.toLowerCase() || "";
    if (validValues.includes(lower)) {
      mappedValues.push(lower);
    } else if (lower.includes("permit") || lower.includes("license")) {
      mappedValues.push("general_incentive");
    } else if (lower.includes("export")) {
      mappedValues.push("general_incentive");
    } else if (lower.includes("tax") && lower.includes("income")) {
      mappedValues.push("income_tax");
    } else if (lower.includes("customs") || lower.includes("duty")) {
      mappedValues.push("customs_duty");
    }
  }
  
  // Remove duplicates and return
  return [...new Set(mappedValues)];
}

// Helper function to map inclusion type to valid enum value
function mapInclusionType(type: string): string {
  const typeMap: Record<string, string> = {
    "enabling": "enabling",
    "restrictive": "restrictive",
    "exclusion": "exclusion",
    "procedural": "procedural",
  };
  return typeMap[type?.toLowerCase()] || "enabling";
}
