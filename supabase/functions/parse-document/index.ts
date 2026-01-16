import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a document text extraction assistant. Your job is to extract ALL text content from the provided document image or file.

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, fileName, fileType } = await req.json();

    console.log("Parsing document:", fileName, "Type:", fileType);

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
      // For other types like xlsx, doc, etc., we'll need to treat them differently
      // For now, return a message that these need manual text extraction
      return new Response(JSON.stringify({
        success: true,
        extractedText: `[Document: ${fileName}]\n\nThis file type (${fileType}) cannot be automatically parsed. Please copy and paste the text content from this document, or convert it to PDF first.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the message with the image/PDF
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 8000,
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

    const aiResponse = await response.json();
    console.log("Document parsed successfully");

    const extractedText = aiResponse.choices?.[0]?.message?.content;
    if (!extractedText) {
      throw new Error("No content in AI response");
    }

    return new Response(JSON.stringify({
      success: true,
      extractedText,
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
