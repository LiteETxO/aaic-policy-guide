import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTRACTION_PROMPT = `Extract policy clauses from this document and return valid JSON only.

For each clause include:
- clause_id: unique ID in format DIR[number]_[SECTION]_[descriptor]
- section_type: "Article" | "Annex" | "Schedule" | "Item"
- section_number: e.g. "Article 4(2)" or "Annex II - Category 1 - Item 3"
- page_number: integer (required)
- clause_heading: short English heading
- clause_heading_amharic: Amharic heading if available, null otherwise
- clause_text: ≤25 words quote or paraphrase
- clause_text_amharic: Amharic text if available, null otherwise
- keywords: array of search terms including synonyms
- applies_to: array from ["capital_goods","customs_duty","income_tax","essentiality","exclusion","general_incentive"]
- inclusion_type: "enabling" | "restrictive" | "exclusion" | "procedural"

Return JSON: { "clauses": [...], "summary": { "total_articles": 0, "total_annexes": 0, "total_items": 0, "capitalGoodsListPresent": true|false, "directive_number": "", "effective_date": "" } }`;



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
        model: "moonshot-v1-8k",
        max_tokens: 2000,
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
${documentText.substring(0, 6000)}
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
