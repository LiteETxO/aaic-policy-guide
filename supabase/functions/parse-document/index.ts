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

    const MOONSHOT_API_KEY = Deno.env.get("MOONSHOT_API_KEY");
    if (!MOONSHOT_API_KEY) {
      throw new Error("MOONSHOT_API_KEY is not configured");
    }

    // Determine media type for Anthropic vision/document API
    let mediaType: string;
    let contentBlockType: "image" | "document";
    if (fileType === "application/pdf") {
      mediaType = "application/pdf";
      contentBlockType = "document";
    } else if (fileType.startsWith("image/")) {
      mediaType = fileType;
      contentBlockType = "image";
    } else {
      return new Response(JSON.stringify({
        success: true,
        extractedText: `[Document: ${fileName}]\n\nThis file type (${fileType}) cannot be automatically parsed. Please convert it to PDF or an image format first.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Calling Moonshot API for document parsing...");

    // Helper: call Moonshot (OpenAI-compatible) messages API with retry logic
    async function callMoonshotWithRetry(
      systemPrompt: string,
      userContent: any[],
      maxTokens: number,
      maxRetries = 3,
    ): Promise<string> {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Moonshot attempt ${attempt}/${maxRetries}...`);

          const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${MOONSHOT_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "moonshot-v1-128k",
              max_tokens: maxTokens,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent },
              ],
            }),
          });

          if (!res.ok) {
            if (res.status === 429) throw { status: 429, message: "Rate limit exceeded. Please try again later." };
            const errText = await res.text();
            console.error(`Moonshot error (attempt ${attempt}):`, res.status, errText);
            throw new Error(`Moonshot API error: ${res.status}`);
          }

          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (!text) throw new Error("Empty response from Moonshot");
          return text;

        } catch (err: any) {
          if (err.status === 429) throw err;
          lastError = err instanceof Error ? err : new Error(String(err));
          console.error(`Attempt ${attempt} failed:`, lastError.message);
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 1200 * attempt));
          }
        }
      }

      throw lastError || new Error("Moonshot API failed after retries");
    }

    // Build user content array in OpenAI format
    // For images: use image_url with base64 data URI
    // For PDFs: Moonshot does not support binary PDF blocks — send text prompt only
    const userContent: any[] = [];
    if (contentBlockType === "image") {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mediaType};base64,${fileBase64}` },
      });
    }
    userContent.push({
      type: "text",
      text: `Please extract all text content from this document (${fileName}). Return only the extracted text, preserving the structure.`,
    });

    let extractedText: string;
    try {
      extractedText = await callMoonshotWithRetry(TEXT_EXTRACTION_PROMPT, userContent, 16000);
    } catch (error: any) {
      if (error.status === 429) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw error;
    }

    console.log("Document parsed successfully, text length:", extractedText.length);

    // If metadata extraction is requested, make a second call to extract structured data
    let metadata = null;
    if (extractMetadata) {
      console.log("Extracting policy metadata...");
      try {
        const metadataText = await callMoonshotWithRetry(
          POLICY_METADATA_PROMPT,
          [{ type: "text", text: `Extract metadata from this policy document:\n\n${extractedText.substring(0, 8000)}` }],
          1000,
          2,
        );

        let jsonStr = metadataText;
        const jsonMatch = metadataText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();
        metadata = JSON.parse(jsonStr);
        console.log("Metadata extracted:", metadata);
      } catch (parseErr) {
        console.error("Failed to extract metadata:", parseErr);
        // Continue without metadata — it's optional
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
