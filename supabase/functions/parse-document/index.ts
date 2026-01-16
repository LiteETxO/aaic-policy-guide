import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEXT_EXTRACTION_PROMPT = `You are a document text extraction assistant. Your job is to extract ALL text content from the provided document image or file.

CRITICAL RULES:
1. Extract ALL text exactly as it appears in the document
2. Preserve the structure and formatting as much as possible (tables, lists, etc.)
3. For invoices, preserve:
   - Line items with descriptions, quantities, unit prices, and totals
   - Invoice numbers, dates, and reference numbers
   - Vendor and buyer information
   - Currency and payment terms
4. For licenses, preserve:
   - License holder information
   - Licensed activities and sectors
   - Restrictions and conditions
   - Issue dates and validity periods
5. If text is in Amharic or mixed Amharic/English, extract both languages accurately
6. If any text is unclear or illegible, mark it as [UNCLEAR: description]
7. Do not summarize or interpret - just extract the raw text content

OUTPUT FORMAT:
Return ONLY the extracted text content, preserving structure with appropriate line breaks and formatting.`;

const POLICY_METADATA_PROMPT = `You are a policy document metadata extractor. Analyze the provided policy document text and extract structured metadata.

Extract the following fields:
1. name: The official English name/title of the directive or policy document
2. nameAmharic: The Amharic name/title if present (return empty string if not found)
3. directiveNumber: The directive/proclamation number (e.g., "1064/2025", "No. 1064/2025")
4. effectiveDate: The effective date in YYYY-MM-DD format (extract from phrases like "effective from", "came into force", etc.)
5. documentType: One of "primary" (main directive/proclamation), "supplemental" (supporting document), or "clarification" (amendment/clarification)
6. summary: A 1-2 sentence summary of what this policy covers

IMPORTANT:
- For dates, convert to YYYY-MM-DD format
- For directive numbers, extract just the number portion (e.g., "1064/2025")
- If a field cannot be determined, use empty string
- Be precise and extract exactly what's in the document

Respond with ONLY valid JSON in this exact format:
{
  "name": "string",
  "nameAmharic": "string",
  "directiveNumber": "string",
  "effectiveDate": "string",
  "documentType": "primary|supplemental|clarification",
  "summary": "string"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, fileName, fileType, extractMetadata } = await req.json();

    console.log("Parsing document:", fileName, "Type:", fileType, "Extract metadata:", extractMetadata);

    if (!fileBase64) {
      throw new Error("No file data provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Determine the correct MIME type for the AI model
    let mimeType = fileType;
    if (fileType === "application/pdf") {
      mimeType = "application/pdf";
    } else if (fileType.startsWith("image/")) {
      mimeType = fileType;
    } else {
      return new Response(JSON.stringify({
        success: true,
        extractedText: `[Document: ${fileName}]\n\nThis file type (${fileType}) cannot be automatically parsed. Please convert it to PDF first.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the message with the image/PDF for text extraction
    const userContent: any[] = [
      {
        type: "text",
        text: `Please extract all text content from this document (${fileName}). Return only the extracted text, preserving the structure.`,
      },
      {
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${fileBase64}`,
        },
      },
    ];

    console.log("Calling AI gateway for document parsing...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: TEXT_EXTRACTION_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 16000,
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

    // Read response as text first to handle potential empty responses
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      throw new Error("Empty response from AI gateway");
    }
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText.substring(0, 500));
      throw new Error("Invalid JSON response from AI gateway");
    }
    
    console.log("Document parsed successfully");

    const extractedText = aiResponse.choices?.[0]?.message?.content;
    if (!extractedText) {
      throw new Error("No content in AI response");
    }

    // If metadata extraction is requested, make a second call to extract structured data
    let metadata = null;
    if (extractMetadata) {
      console.log("Extracting policy metadata...");
      
      const metadataResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: POLICY_METADATA_PROMPT },
            { role: "user", content: `Extract metadata from this policy document:\n\n${extractedText.substring(0, 8000)}` },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (metadataResponse.ok) {
        try {
          const metadataResponseText = await metadataResponse.text();
          if (metadataResponseText && metadataResponseText.trim() !== '') {
            const metadataAiResponse = JSON.parse(metadataResponseText);
            const metadataText = metadataAiResponse.choices?.[0]?.message?.content;
            
            if (metadataText) {
              // Extract JSON from the response (handle markdown code blocks)
              let jsonStr = metadataText;
              const jsonMatch = metadataText.match(/```(?:json)?\s*([\s\S]*?)```/);
              if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
              }
              metadata = JSON.parse(jsonStr);
              console.log("Metadata extracted:", metadata);
            }
          }
        } catch (parseErr) {
          console.error("Failed to parse metadata response:", parseErr);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      extractedText,
      metadata,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Parse document error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
