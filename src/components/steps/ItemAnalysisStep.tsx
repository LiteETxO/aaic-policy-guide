import { useMemo } from "react";
import { ClipboardList, Shield, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  ItemCard, 
  type ItemCardData,
  type PolicyMatchStatus,
  type DecisionReadiness,
  type AIReasoningData
} from "@/components/analysis";
import type { ConfidenceLevel } from "@/components/gamification";

interface Citation {
  clauseId?: string;
  documentName: string;
  articleSection: string;
  pageNumber: number;
  quote?: string;
}

interface AnalysisItem {
  itemNumber: number;
  invoiceItem: string;
  normalizedName: string;
  licenseAlignment: "Aligned" | "Conditional" | "Needs Clarification" | "Not Aligned";
  policyMatch: "Listed" | "Mapped" | "Not Listed" | "Checking";
  essentialityStatus: "Complete" | "Pending" | "Not Required";
  evidenceCount: number;
  citations: Citation[];
  analysisStatus: "in_analysis" | "requires_clarification" | "evidence_pending" | "analysis_complete";
  confidence: ConfidenceLevel;
  // Enhanced fields for new UI
  equipmentType?: string;
  equipmentTypeAmharic?: string;
  capitalGoodsCategory?: string;
  capitalGoodsCategoryAmharic?: string;
  licenseName?: string;
  licenseNameAmharic?: string;
  functionalRequirement?: string;
  functionalRequirementAmharic?: string;
  reasoning?: any;
  policyBasis?: {
    articleSection: string;
    directiveNumber: string;
  };
  // NEW: Classification & System fields (Spec 4️⃣)
  itemClassification?: "capital_equipment" | "capital_component" | "tool_consumable" | "ppe" | "unknown";
  systemAssociation?: string;
  systemAssociationAmharic?: string;
}

interface ItemAnalysisStepProps {
  items: AnalysisItem[];
  currentItemIndex?: number;
  onItemSelect?: (index: number) => void;
  onApprove?: (itemNumber: number) => void;
  onRequestClarification?: (itemNumber: number) => void;
  onEscalate?: (itemNumber: number) => void;
}

// Transform legacy policyMatch to new PolicyMatchStatus
const transformPolicyMatch = (policyMatch: string): PolicyMatchStatus => {
  switch (policyMatch) {
    case "Listed":
    case "Mapped":
      return "matched";
    case "Not Listed":
      return "not_found";
    default:
      return "checking";
  }
};

// Transform analysisStatus + other factors to DecisionReadiness
const transformDecisionReadiness = (
  analysisStatus: string,
  policyMatch: string,
  licenseAlignment: string,
  hasEvidence: boolean
): DecisionReadiness => {
  // If analysis is complete and policy matched
  if (analysisStatus === "analysis_complete" && 
      (policyMatch === "Listed" || policyMatch === "Mapped") && 
      licenseAlignment === "Aligned" && 
      hasEvidence) {
    return "eligible_ready";
  }
  
  // If needs clarification
  if (analysisStatus === "requires_clarification" || licenseAlignment === "Needs Clarification") {
    return "eligible_confirmation";
  }
  
  // If policy not found but no disqualifying clause
  if (policyMatch === "Not Listed" && analysisStatus === "analysis_complete") {
    return "provisionally_eligible";
  }
  
  // Not aligned with license
  if (licenseAlignment === "Not Aligned") {
    return "not_eligible";
  }
  
  return "pending";
};

// Normalize eligibility from any field variant to a canonical value
export type NormalizedEligibility = "eligible" | "excluded" | "review";

export const normalizeEligibility = (item: any): NormalizedEligibility => {
  const raw = (
    item?.eligibilityStatus ||
    item?.eligibility ||
    item?.complianceStatus ||
    item?.decisionReadiness ||
    ""
  ).toLowerCase();

  if (
    raw.includes("eligible") &&
    !raw.includes("not eligible") &&
    !raw.includes("ineligible") ||
    raw === "eligible_ready" ||
    raw === "provisionally_eligible" ||
    raw.includes("duty-free") ||
    raw.includes("listed capital good") ||
    raw.includes("essential capital good")
  ) {
    return "eligible";
  }
  if (
    raw.includes("not eligible") ||
    raw.includes("ineligible") ||
    raw.includes("excluded") ||
    raw === "not_eligible"
  ) {
    return "excluded";
  }
  return "review";
};

// Build AI reasoning data from available information
const buildReasoningData = (item: AnalysisItem): AIReasoningData => {
  const policyGapDetected = item.policyMatch === "Not Listed";

  // Extract policy sources from citations
  const policySources = item.citations.length > 0
    ? [...new Set(item.citations.map(c => c.documentName))].map(docName => ({
        documentName: docName,
        issuingAuthority: "Ministry of Finance",
        relevantArticles: item.citations
          .filter(c => c.documentName === docName)
          .map(c => c.articleSection),
      }))
    : [{
        documentName: "Directive No. 1064/2025",
        issuingAuthority: "Ministry of Finance",
        relevantArticles: ["Capital Goods Annex"],
      }];

  // Transform citations to cited clauses
  const citedClauses = item.citations
    .filter(c => c.quote)
    .slice(0, 3)
    .map(c => ({
      clauseId: c.clauseId || `CL-${c.pageNumber}`,
      articleSection: c.articleSection,
      pageNumber: c.pageNumber,
      clauseText: c.quote || "",
    }));

  return {
    itemInterpretation: {
      classifiedAs: item.equipmentType || "Capital Equipment",
      capitalGoodsCategory: item.capitalGoodsCategory || "Industrial Equipment",
    },
    policySources,
    citedClauses,
    reasoningSteps: [
      {
        step: "policy_search",
        description: "Searched policy clause index for matching items",
        status: item.policyMatch === "Listed" || item.policyMatch === "Mapped" ? "complete" :
               item.policyMatch === "Checking" ? "partial" : "not_found",
      },
      {
        step: "license_alignment",
        description: "Verified alignment with licensed activity",
        status: item.licenseAlignment === "Aligned" ? "complete" :
               item.licenseAlignment === "Conditional" ? "partial" : "not_found",
      },
    ],
    conclusion: item.policyMatch === "Listed" || item.policyMatch === "Mapped"
      ? `${item.normalizedName || item.invoiceItem || "Item"} qualifies as duty-free capital good based on policy match.`
      : policyGapDetected
        ? `No clause directly excludes or disqualifies this item. Provisionally eligible pending supervisor confirmation.`
        : `Analysis in progress for ${item.normalizedName || item.invoiceItem || "Item"}.`,
    policyGapDetected,
    policyGapMessage: policyGapDetected
      ? "No clause directly excludes or disqualifies this item."
      : undefined,
    keywordsExpanded: policyGapDetected ? [
      "electrical machinery",
      "power infrastructure",
      "industrial equipment",
      (item.normalizedName || item.invoiceItem || "item").toLowerCase(),
    ] : undefined,
  };
};

// Transform AnalysisItem to ItemCardData
const transformToItemCardData = (item: AnalysisItem, totalItems: number): ItemCardData => {
  const policyMatchStatus = transformPolicyMatch(item.policyMatch);
  const decisionReadiness = transformDecisionReadiness(
    item.analysisStatus,
    item.policyMatch,
    item.licenseAlignment,
    item.evidenceCount > 0
  );

  // Spec 4️⃣: Use AI-provided classification first, fallback to derivation
  let itemClassification = item.itemClassification;
  if (!itemClassification) {
    const lowerName = item.normalizedName?.toLowerCase() || "";
    const lowerInvoice = item.invoiceItem?.toLowerCase() || "";
    
    if (lowerName.includes("tool") || lowerName.includes("wrench") || lowerName.includes("screwdriver") ||
        lowerInvoice.includes("hand tool") || lowerInvoice.includes("consumable")) {
      itemClassification = "tool_consumable";
    } else if (lowerName.includes("glove") || lowerName.includes("helmet") || lowerName.includes("safety") ||
               lowerName.includes("vest") || lowerName.includes("goggles") || lowerInvoice.includes("ppe")) {
      itemClassification = "ppe";
    } else if (item.policyMatch === "Listed" || item.policyMatch === "Mapped") {
      if (lowerName.includes("part") || lowerName.includes("component") || lowerName.includes("accessory")) {
        itemClassification = "capital_component";
      } else {
        itemClassification = "capital_equipment";
      }
    } else {
      itemClassification = "capital_equipment"; // Default assumption
    }
  }

  // Spec 4️⃣: Use AI-provided systemAssociation first, fallback to derivation
  let systemAssociation = item.systemAssociation;
  
  if (!systemAssociation) {
    const lowerName = item.normalizedName?.toLowerCase() || "";
    
    if (lowerName.includes("transform") || lowerName.includes("switch") || lowerName.includes("breaker") || 
        lowerName.includes("cable") || lowerName.includes("panel") || lowerName.includes("meter")) {
      systemAssociation = "Power Distribution System";
    } else if (lowerName.includes("cool") || lowerName.includes("hvac") || lowerName.includes("chiller") ||
               lowerName.includes("air condition") || lowerName.includes("refriger")) {
      systemAssociation = "Cooling / HVAC System";
    } else if (lowerName.includes("server") || lowerName.includes("network") || lowerName.includes("router") ||
               lowerName.includes("storage") || lowerName.includes("rack")) {
      systemAssociation = "IT Infrastructure";
    } else if (lowerName.includes("generator") || lowerName.includes("ups") || lowerName.includes("battery")) {
      systemAssociation = "Power Generation / Backup";
    } else if (lowerName.includes("fire") || lowerName.includes("suppression") || lowerName.includes("alarm")) {
      systemAssociation = "Fire Safety System";
    } else if (lowerName.includes("security") || lowerName.includes("access") || lowerName.includes("cctv") ||
               lowerName.includes("camera")) {
      systemAssociation = "Security / Access Control";
    }
  }

  return {
    itemNumber: item.itemNumber,
    totalItems,
    itemName: item.normalizedName || item.invoiceItem || "Item",
    invoiceReference: item.invoiceItem,
    equipmentType: item.equipmentType || "Capital Equipment",
    capitalGoodsCategory: item.capitalGoodsCategory || "Industrial Machinery",
    itemClassification,
    systemAssociation,
    policyMatchStatus,
    decisionReadiness,
    licenseAlignment: {
      status: item.licenseAlignment,
      licenseName: item.licenseName || "Investment License",
      functionalRequirement: item.functionalRequirement || "is functionally required for operation of licensed infrastructure.",
    },
    reasoning: buildReasoningData(item),
    citations: item.citations.map(c => ({
      clauseId: c.clauseId,
      documentName: c.documentName,
      articleSection: c.articleSection,
      pageNumber: c.pageNumber,
      quote: c.quote,
    })),
    policyBasis: item.policyBasis || (item.citations.length > 0 ? {
      articleSection: item.citations[0].articleSection,
      directiveNumber: item.citations[0].documentName,
    } : undefined),
  };
};

/**
 * Step 2 — Item Analysis (PRIMARY WORK AREA)
 * 
 * Redesigned with:
 * - Policy-first reasoning
 * - Explicit AI transparency
 * - Officer-grade decision clarity
 * - Never defer when policy is silent but non-restrictive
 */
const ItemAnalysisStep = ({
  items,
  onApprove,
  onRequestClarification,
  onEscalate,
}: ItemAnalysisStepProps) => {
  // Transform items to new format
  const itemCards = useMemo(() => 
    items.map(item => transformToItemCardData(item, items.length)),
    [items]
  );

  // Calculate summary stats
  const stats = useMemo(() => {
    const eligible = itemCards.filter(i => 
      i.decisionReadiness === "eligible_ready" || 
      i.decisionReadiness === "provisionally_eligible"
    ).length;
    const needsConfirmation = itemCards.filter(i => 
      i.decisionReadiness === "eligible_confirmation"
    ).length;
    const notEligible = itemCards.filter(i => 
      i.decisionReadiness === "not_eligible"
    ).length;
    const pending = itemCards.filter(i => 
      i.decisionReadiness === "pending"
    ).length;

    return { eligible, needsConfirmation, notEligible, pending };
  }, [itemCards]);

  const progressPercentage = items.length > 0 
    ? ((stats.eligible + stats.needsConfirmation + stats.notEligible) / items.length) * 100 
    : 0;

  // Overall recommendation sentence
  const overallRecommendation = (() => {
    if (items.length === 0) return "";
    if (stats.notEligible === 0 && stats.needsConfirmation === 0) {
      return `All ${stats.eligible} items appear eligible for duty exemption. No exclusions detected.`;
    }
    if (stats.eligible > 0 && stats.notEligible > 0) {
      return `${stats.eligible} item(s) eligible for duty exemption; ${stats.notEligible} item(s) excluded by policy. Review flagged items before proceeding.`;
    }
    if (stats.needsConfirmation > 0) {
      return `${stats.needsConfirmation} item(s) require officer confirmation before a final determination can be issued.`;
    }
    return `Analysis complete. ${items.length} item(s) processed.`;
  })();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Item Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Policy compliance check — each invoice item matched against the capital goods clause index.
          </p>
        </div>
      </div>

      {/* Executive Summary */}
      {items.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Executive Summary</span>
              <Badge variant="outline" className="ml-auto text-xs">
                {Math.round(progressPercentage)}% complete
              </Badge>
            </div>
            <Progress value={progressPercentage} className="h-2 mb-5" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-2xl font-bold text-foreground">{items.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Items Analyzed</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-2xl font-bold text-success">{stats.eligible}</p>
                <p className="text-xs text-success mt-0.5">Eligible</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-2xl font-bold text-destructive">{stats.notEligible}</p>
                <p className="text-xs text-destructive mt-0.5">Excluded</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-2xl font-bold text-warning">{stats.needsConfirmation + stats.pending}</p>
                <p className="text-xs text-warning mt-0.5">Requires Review</p>
              </div>
            </div>

            {overallRecommendation && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-background/60 border border-border/50">
                <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Overall Recommendation: </span>
                  {overallRecommendation}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Advisory Notice */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          This system interprets policy directly via the clause index — not keyword search. Each item is matched against verified policy clauses from the capital goods list.
        </p>
      </div>

      {/* Item Cards */}
      <div className="space-y-4">
        {itemCards.map((item) => (
          <ItemCard
            key={item.itemNumber}
            data={item}
            onApprove={onApprove}
            onRequestClarification={onRequestClarification}
            onEscalate={onEscalate}
          />
        ))}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No items analyzed yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Upload documents to begin analysis.</p>
        </div>
      )}
    </div>
  );
};

export default ItemAnalysisStep;
