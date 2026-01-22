import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTRACTION_PROMPT = `You are an expert legal document parser specializing in Ethiopian investment policy documents. Your task is to extract structured clauses from policy documents.

## TASK
Parse the provided policy document text and extract ALL clauses, articles, and items into a structured format.

## EXTRACTION REQUIREMENTS

### For Articles/Sections:
- Extract each article with its number, heading (English and Amharic if available), and full text
- Identify the page number where each article appears (look for "Page X" markers or estimate from structure)
- Classify each article's purpose (enabling, restrictive, exclusion, procedural)

### For Annexes/Schedules (CRITICAL - especially Capital Goods Lists):
- Parse EVERY individual item in annexes
- For Capital Goods Lists, extract EACH category and EACH item within categories
- Include specific equipment names, machine types, and technical specifications
- Generate keywords for matching (e.g., "CNC", "lathe", "milling", "manufacturing")

### Classification Rules:
- applies_to values: "capital_goods", "customs_duty", "income_tax", "essentiality", "exclusion", "general_incentive"
- section_type values: "Article", "Annex", "Schedule", "Item"
- inclusion_type values: "enabling" (grants benefits), "restrictive" (limits benefits), "exclusion" (denies benefits), "procedural" (process requirements)

## OUTPUT FORMAT
Return a JSON object with this exact structure:
{
  "clauses": [
    {
      "clause_id": "DIR[number]_ART[X]_[descriptor]",
      "section_type": "article|annex|schedule|item|definition|provision",
      "section_number": "Article 16(2)" or "Annex II - Category 1 - Item 3",
      "page_number": 5,
      "clause_heading": "Eligibility Criteria for Duty-Free Import",
      "clause_heading_amharic": "ለቀረጥ ነፃ ማስገባት ብቁነት መስፈርቶች",
      "clause_text": "Full text of the clause...",
      "clause_text_amharic": "የአማርኛ ጽሑፍ..." or null,
      "keywords": ["duty-free", "import", "capital goods", "manufacturing"],
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
    "directive_number": "1064/2025",
    "effective_date": "2025-01-01"
  }
}

## IMPORTANT RULES
1. Generate unique clause_id values using the format: DIR[directive_number]_[section]_[descriptor]
2. For capital goods lists, create a separate clause for EACH specific item (not just categories)
3. Include bilingual content where available in the source
4. Estimate page numbers based on document structure if exact markers aren't present
5. Extract at least 50-200 clauses from a typical directive document
6. Keywords should include synonyms and related terms for better matching

## EXAMPLE CAPITAL GOODS ITEM EXTRACTION
If the document contains:
"Category 1: Manufacturing Machinery
  1. CNC turning machines, lathes, and milling machines
  2. Industrial robots and automated assembly systems"

Extract as:
{
  "clause_id": "DIR1064_ANNEX2_CAT1_001",
  "section_type": "item",
  "section_number": "Annex II - Category 1 - Item 1",
  "clause_heading": "CNC Turning Machines",
  "clause_text": "CNC turning machines, lathes, and milling machines for manufacturing",
  "keywords": ["CNC", "turning", "lathe", "milling", "machine", "manufacturing", "machining center"],
  "applies_to": ["capital_goods", "customs_duty"],
  "inclusion_type": "enabling"
}

Parse the document thoroughly. Missing items means invoice matching will fail.`;

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    console.log(`Extracting clauses from document: ${documentId}`);
    console.log(`Document name: ${documentName}`);
    console.log(`Document text length: ${documentText.length} characters`);

    // Call AI to extract clauses
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { 
            role: "user", 
            content: `Extract all clauses from this policy document.

Document Name: ${documentName || "Unknown"}
Directive Number: ${directiveNumber || "Unknown"}

--- DOCUMENT TEXT ---
${documentText.substring(0, 100000)}
--- END DOCUMENT TEXT ---

Return the JSON structure as specified. Be thorough - extract EVERY article and EVERY item from annexes/schedules.`
          }
        ],
        temperature: 0,
        max_tokens: 32000,
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      throw new Error("Failed to parse AI response as JSON");
    }

    const clauses = extractedData.clauses || [];
    const summary = extractedData.summary || {};

    console.log(`Extracted ${clauses.length} clauses`);

    // Delete existing clauses for this document (to handle re-extraction)
    const { error: deleteError } = await supabase
      .from("policy_clauses")
      .delete()
      .eq("policy_document_id", documentId);

    if (deleteError) {
      console.error("Error deleting existing clauses:", deleteError);
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
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
      } else {
        insertedCount += batch.length;
      }
    }

    console.log(`Inserted ${insertedCount} clauses into database`);

    return new Response(
      JSON.stringify({
        success: true,
        extractedCount: clauses.length,
        insertedCount,
        summary: {
          ...summary,
          documentId,
          documentName,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

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
