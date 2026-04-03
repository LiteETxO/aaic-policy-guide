import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEXT_EXTRACTION_PROMPT = `Extract all text from this document exactly as it appears. Preserve structure (tables, lists, line items). For invoices include item descriptions, quantities, prices, totals, dates, and reference numbers. For licenses include holder info, licensed activities, restrictions, and validity dates. If text is unclear mark as [UNCLEAR]. Return only the extracted text.`;

const POLICY_METADATA_PROMPT = `Extract metadata from this policy document and return valid JSON only:
{
  "name": "official English title",
  "nameAmharic": "Amharic title or empty string",
  "directiveNumber": "e.g. 1064/2025 or empty string",
  "effectiveDate": "YYYY-MM-DD or empty string",
  "documentType": "primary|supplemental|clarification",
  "summary": "1-2 sentence summary"
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
              model: "moonshot-v1-8k",
              max_tokens: maxTokens,
              temperature: 0,
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
      extractedText = await callMoonshotWithRetry(TEXT_EXTRACTION_PROMPT, userContent, 2000);
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

        let jsonStr = metadataText.trim();
        const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) {
          jsonStr = fenceMatch[1].trim();
        } else {
          const first = jsonStr.indexOf("{");
          const last = jsonStr.lastIndexOf("}");
          if (first !== -1 && last > first) jsonStr = jsonStr.slice(first, last + 1);
        }
        const parsed = JSON.parse(jsonStr);
        metadata = (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : null;
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
