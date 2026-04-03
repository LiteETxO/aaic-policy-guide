import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { licenseText, invoiceText } = await req.json();

    const MOONSHOT_API_KEY = Deno.env.get("MOONSHOT_API_KEY");
    if (!MOONSHOT_API_KEY) {
      throw new Error("MOONSHOT_API_KEY not configured");
    }

    // Truncate to fit in 8k model
    const lic = (licenseText || "").slice(0, 1500);
    const inv = (invoiceText || "").slice(0, 6000);

    const systemPrompt = `You are an Ethiopian customs duty exemption analyst. Analyze invoice items against Capital Goods List Annex 1064/2025.

ELIGIBILITY RULES for Crypto Currency Mining (Proclamation 1180/2020):
- ELIGIBLE: Power transformers/parts (8504), Circuit breakers/switchgear (8535), Cables >1kV (8544.60), LV cables (8544.20), Busbars (8544.49), Insulators (8546), UPS (8504.40), Metering transformers (8504.31), Energy meters (9028), HV cable terminations/joints (8535.90), Cable lugs/terminals (8536/8532/8538), Equipment clamps (7616), Copper conductors (8544.11), Heat shrink tubing (3917), Overhead conductors (7614), Circuit breaker stands (7228), 35kV safety PPE gloves/boots (4015), Galvanized bolts for HV equipment (7318/7415), UPS control panels (8537), LV distribution boxes (8517), Foundation bolts (7318)
- EXCLUDED: Hand tools (8203/8204/8205), Power tools (8467/8468), Cutting discs (6804), Heat guns (8516), Metal-working machines (8462), Crimping tools (8467)
- REVIEW: Water pumps, LED lights, measurement instruments (9025/9030), Conduit (3917.22), Power strips

Output ONLY this JSON structure:
{
  "permitSummary": {"company": "string", "activity": "string", "capitalETB": "string"},
  "executiveSummary": {"totalItemsAnalyzed": 0, "eligibleCount": 0, "excludedCount": 0, "requiresReviewCount": 0, "overallRecommendation": "string"},
  "complianceItems": [{"itemNumber": 1, "invoiceItem": "string", "hsCode": "string", "decision": "ELIGIBLE", "policyBasis": "string", "notes": "string"}]
}`;

    const userPrompt = `INVESTMENT LICENSE:\n${lic}\n\nINVOICE (analyze ALL items):\n${inv}\n\nProvide compliance decision for every line item.`;

    const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MOONSHOT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        max_tokens: 4000,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ success: false, error: `AI error: ${response.status}`, raw: err.slice(0,200) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const aiResp = await response.json();
    const content = aiResp.choices?.[0]?.message?.content || "";

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      // Try to extract JSON
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start !== -1 && end > start) {
        try { analysis = JSON.parse(content.slice(start, end + 1)); } catch { analysis = {}; }
      } else {
        analysis = {};
      }
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
