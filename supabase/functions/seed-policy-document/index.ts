import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// The parsed content of Directive 1064/2025
const DIRECTIVE_1064_2025_CONTENT = `
# DIRECTIVE NO. 1064/2025
# A DIRECTIVE ISSUED TO IMPLEMENT INVESTMENT INCENTIVES
Ministry of Finance, Ethiopia
Effective Date: May 26, 2025

## SECTION ONE: GENERAL

### Article 1. Short Title
This Directive may be cited as the "Directive for the Implementation of Investment Incentives No. 1064/2025."

### Article 2. Definitions
1. "Income Tax Holiday" means an exemption granted to a taxpayer from paying income tax on taxable income.
2. "Ministry" means the Ministry of Finance.
3. "Tax Authority" means the Ministry of Revenues.
4. "Regulation" means the Investment Incentives Council of Ministers Regulation No. 517/2022 (as amended).

### Article 3. Conditions for Being a Beneficiary of Income Tax Holiday
1. Any investor may benefit from the income tax holiday provided under the Regulation if:
   a) The investor submits an investment license in an investment field that is eligible for incentives;
   b) The investor submits a business license issued by the appropriate government body;
   c) The investor submits a letter of support from the appropriate federal or regional investment authority confirming the completion of the investment and requesting the grant of income tax holiday.

### Article 4. Penalties for Late Submission of Financial Statements
1. An investor granted a tax holiday must submit to the Tax Authority the financial statements required under the Income Tax Proclamation within the period specified therein.
2. If the investor submits the financial statements beyond the period specified, the investor shall be subject to the administrative penalty prescribed under the Tax Administration Proclamation.

### Article 5. Failure to Declare Income Due to Force Majeure
An investor who fails to declare income due to force majeure (man-made or natural disaster, or war) at the investment location may be exempted from penalty and interest, subject to verification by the appropriate investment authority.

### Article 6. Cancellation of Tax Holiday
A tax holiday may be cancelled if:
a) The tax holiday was granted based on false or fraudulent information or documents;
b) It is confirmed that the investment activity for which the investment license was granted has been terminated;
c) The investor has failed to submit a complete financial statement to the Tax Authority or has not fulfilled other obligations as required by the Regulation.

### Article 7. Steps Before Tax Holiday Is Revoked
1. The Ministry shall revoke tax holidays in accordance with the Regulation.
2. The Tax Authority or Investment Authority must notify the Ministry in writing if they believe a tax holiday should be revoked.
3. The Ministry shall request the investor to provide an explanation within 10 days, citing reasons for the proposed revocation.
4. If no response or an unsatisfactory response is provided, the Ministry shall decide to revoke the tax holiday and notify the investor.

### Article 8. Consequences of the Revocation of Tax Holiday
An investor whose tax holiday has been revoked shall be required to pay the taxes that were previously exempted, along with any applicable interest and penalties.

## SECTION THREE: INCENTIVES FOR EXEMPTION FROM CUSTOMS DUTIES

### Article 16. Conditions for Importation of Construction Materials Exempt from Tax
1. Investors may import the following construction materials duty-free:
   a) Construction steel/iron;
   b) Doors and windows with accessories;
   c) Glass;
   d) Steel structure;
   e) Ceramic (for education, hotels, and hospitals only);
   f) Aluminum (for education, hotels, and hospitals only).

2. Construction materials permitted to be imported duty-free shall be imported in the following sequence:
   a) 30% of the quantity may be imported to commence construction work;
   b) 30% of the remaining 70% may be imported when the supervising government body certifies in writing that previously imported materials have been utilized;
   c) The remaining 40% may be imported when the supervising government body certifies that 60% of imported materials have been used for their intended purpose.

### Article 17. Customs Incentives for Leasing Capital Goods
Capital goods imported under leasing arrangements may qualify for customs duty exemption subject to the conditions in the Regulation.

## SECTION FOUR: MISCELLANEOUS PROVISIONS

### Article 20. Continuation of Incentives Provided Under Repealed Laws
1. Investors who obtained investment licenses and incentives under the repealed Investment Incentives Regulation No. 270/2005 shall continue to receive those incentives.
2. Incentives granted under the Mining and Petroleum Operations Proclamation shall continue to apply.
3. Investors who obtained a license before this Regulation may benefit from the new Regulation if it provides better tax incentives.

### Article 22. Submission of Documents
Applications for income tax relief and customs duty exemption incentives shall be accompanied by the documents listed under Annex 3 and Annex 4 of this Directive.

### Article 25. Repealed and Inapplicable Directives
1. All directives and decisions concerning tax holidays and customs exemption incentives are hereby repealed.
2. Any directives, documents, or procedures inconsistent with this Directive are hereby repealed.

### Article 26. Effective Date
This Directive shall enter into force as of the date of its registration by the Ministry of Justice and its uploading on the official website of the Ministry of Finance.

Done at Addis Ababa, on the 26th May 2025.
Ahmed Shide, Minister of Finance

## ANNEX ONE: INVESTMENT SECTORS ELIGIBLE FOR INCOME TAX INCENTIVES

### 1. Special Economic Zones
- Special Economic Zone Developer: 10-15 years tax exemption
- Special Economic Zone Sub-Developer: 7-10 years tax exemption
- Special Economic Zone Administrator: 5-7 years tax exemption
- Enterprises of Special Economic Zone: 5-7 years tax exemption

### 2. Manufacturing Industry
- Manufacturing of packaging and labeling: No income tax exemption
- Joss-stick (Sandal) manufacturing: No income tax exemption
- Manufacturing of aircraft and parts: 6-7 years exemption
- Manufacturing of drones and parts: No income tax exemption
- Production of Furnace oil: No income tax exemption

### 3. Agricultural Sector
- Seed propagation and production: No income tax exemption
- Coffee washing, grinding, roasting, export preparation: No income tax exemption
- Natural honey/wax processing: No income tax exemption

### 4. Services
- Pesticide spraying by plane: No income tax exemption
- Transportation services by small aircraft: No income tax exemption
- Liquid waste filtration and disposal: No income tax exemption
- Telecommunication service: No income tax exemption
- Crypto Currency Mining: No income tax exemption

## ANNEX TWO: LISTS OF CAPITAL GOODS
Capital goods eligible for duty-free importation are listed in the separate document attached to this Directive.

## ANNEX THREE: DOCUMENTS REQUIRED FOR INCOME TAX HOLIDAY
(List of required documentation for income tax holiday applications)

## ANNEX FOUR: DOCUMENTS REQUIRED FOR CUSTOMS DUTY EXEMPTION
(List of required documentation for customs duty exemption applications)
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if Directive 1064/2025 already exists
    const { data: existing } = await supabase
      .from("policy_documents")
      .select("id")
      .eq("directive_number", "1064/2025")
      .single();

    if (existing) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Directive 1064/2025 already exists",
        id: existing.id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert the directive
    const { data, error } = await supabase
      .from("policy_documents")
      .insert({
        name: "Directive for the Implementation of Investment Incentives",
        name_amharic: "የኢንቨስትመንት ማበረታቻን ለማስፈጸም የወጣ መመሪያ",
        directive_number: "1064/2025",
        version: "1.0",
        effective_date: "2025-05-26",
        document_type: "primary",
        file_url: "https://placeholder-for-pdf-url.com/directive-1064-2025.pdf",
        content_markdown: DIRECTIVE_1064_2025_CONTENT,
        total_pages: 50,
        total_articles: 26,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      throw error;
    }

    console.log("Successfully seeded Directive 1064/2025");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Directive 1064/2025 seeded successfully",
      id: data.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Seed error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
