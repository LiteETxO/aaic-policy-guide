const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an Ethiopian customs duty exemption analyst for AAIC. Analyze each invoice line item against the Capital Goods List Annex 1064/2025.

ELIGIBILITY RULES for Crypto Currency Mining (Proclamation 1180/2020):
ELIGIBLE: Power transformers/parts (8504), Circuit breakers/switchgear (8535), HV cables >1kV (8544.60), LV cables (8544.20), Busbars (8544.49/8544.11), Insulators (8546/8547), UPS (8504.40), Metering transformers (8504.31), Energy meters (9028), HV cable terminations/joints (8535.90), Cable lugs/terminals (8536/8532/8538/8547), Equipment terminal clamps (7616), Heat shrink tubing (3917.32), Overhead conductors (7614), Circuit breaker stands (7228), 35kV insulating gloves/boots (4015), Galvanized bolts/washers for HV equipment (7318/7415), Pump control panels (8537), LV distribution boxes (8517), Foundation bolts (7318), Flexible connectors (8538), Copper braided wire (8544.11)
EXCLUDED: Hand tools (8203/8204/8205/8205.59/8205.70), Power tools (8467/8468), Cutting discs/abrasives (6804), Heat guns (8516), Metal-working machines (8462), Hydraulic crimping tools, Pressing dies (7308), Fusion machines
REVIEW: Water pumps (8413), LED lights (9405), Measurement instruments (9025/9030), Corrugated conduit (3917.22), Power strips (8536.69)

Output ONLY valid JSON with this exact structure:
{"complianceItems":[{"itemNumber":1,"invoiceItem":"string","hsCode":"string","decision":"ELIGIBLE","policyBasis":"string"}]}`;

async function analyzeBatch(items: string, apiKey: string): Promise<any[]> {
  const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "moonshot-v1-8k",
      max_tokens: 4000,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analyze these invoice items for customs duty exemption. Output JSON with complianceItems array:\n\n${items}` }
      ]
    }),
  });

  if (!response.ok) {
    throw new Error(`Moonshot error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  
  try {
    const parsed = JSON.parse(content);
    return parsed.complianceItems || [];
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        const parsed = JSON.parse(content.slice(start, end + 1));
        return parsed.complianceItems || [];
      } catch {}
    }
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { licenseText, invoiceText } = await req.json();

    const MOONSHOT_API_KEY = Deno.env.get("MOONSHOT_API_KEY");
    if (!MOONSHOT_API_KEY) throw new Error("MOONSHOT_API_KEY not configured");

    const lic = (licenseText || "").slice(0, 800);
    const inv = invoiceText || "";

    // Split invoice into ~5k char batches to cover all items
    const BATCH_SIZE = 5500;
    const batches: string[] = [];
    for (let i = 0; i < inv.length; i += BATCH_SIZE) {
      batches.push(inv.slice(i, i + BATCH_SIZE));
    }

    // Process batches in parallel (max 3 at a time to avoid rate limits)
    const allItems: any[] = [];
    for (let i = 0; i < batches.length; i += 2) {
      const chunk = batches.slice(i, i + 2);
      const results = await Promise.all(chunk.map(b => analyzeBatch(b, MOONSHOT_API_KEY)));
      results.forEach(r => allItems.push(...r));
      if (i + 2 < batches.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Extract permit info from license text
    const companyMatch = lic.match(/ETXO\s+TECHNOLOGIES|ETxO\s+Technologies/i);
    const activityMatch = lic.match(/Crypto\s+Currency\s+Mining|861112/i);
    const capitalMatch = lic.match(/81[,.]454[,.]900/);

    const eligible = allItems.filter(i => i.decision === "ELIGIBLE").length;
    const excluded = allItems.filter(i => i.decision === "EXCLUDED").length;
    const review = allItems.filter(i => i.decision === "REVIEW").length;

    const analysis = {
      permitSummary: {
        company: companyMatch ? "ETxO Technologies PLC" : "Unknown",
        activity: activityMatch ? "Crypto Currency Mining (861112)" : "Unknown",
        capitalETB: capitalMatch ? "ETB 81,454,900" : "Unknown",
        permitNumber: lic.match(/282947/)?.[0] ? "አኢፈ 282947/17" : "",
        location: "ITPC, Bole, Addis Ababa",
        legalBasis: "Investment Proclamation No. 1180/2020"
      },
      executiveSummary: {
        totalItemsAnalyzed: allItems.length,
        eligibleCount: eligible,
        excludedCount: excluded,
        requiresReviewCount: review,
        overallRecommendation: `Of ${allItems.length} items analyzed, ${eligible} qualify for customs duty exemption under Directive 1064/2025. ${excluded} items (general tools/consumables) are excluded. ${review} items require officer review.`
      },
      complianceItems: allItems
    };

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
