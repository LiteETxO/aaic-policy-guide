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
      classifiedAsAmharic: item.equipmentTypeAmharic || "ካፒታል መሣሪያ",
      capitalGoodsCategory: item.capitalGoodsCategory || "Industrial Equipment",
      capitalGoodsCategoryAmharic: item.capitalGoodsCategoryAmharic || "የኢንዱስትሪ መሣሪያ",
    },
    policySources,
    citedClauses,
    reasoningSteps: [
      {
        step: "policy_search",
        description: "Searched policy clause index for matching items",
        descriptionAmharic: "ለተዛማጅ ዕቃዎች የፖሊሲ ድንጋጌ ኢንዴክስ ተፈትሻል",
        status: item.policyMatch === "Listed" || item.policyMatch === "Mapped" ? "complete" : 
               item.policyMatch === "Checking" ? "partial" : "not_found",
      },
      {
        step: "license_alignment",
        description: "Verified alignment with licensed activity",
        descriptionAmharic: "ከፈቃድ እንቅስቃሴ ጋር መስማማት ተረጋግጧል",
        status: item.licenseAlignment === "Aligned" ? "complete" : 
               item.licenseAlignment === "Conditional" ? "partial" : "not_found",
      },
    ],
    conclusion: item.policyMatch === "Listed" || item.policyMatch === "Mapped"
      ? `${item.normalizedName} qualifies as duty-free capital good based on policy match.`
      : policyGapDetected
        ? `No clause directly excludes or disqualifies this item. Provisionally eligible pending supervisor confirmation.`
        : `Analysis in progress for ${item.normalizedName}.`,
    conclusionAmharic: item.policyMatch === "Listed" || item.policyMatch === "Mapped"
      ? `${item.normalizedName} በፖሊሲ ግጥጥም መሰረት ከቀረጥ ነፃ ካፒታል እቃ ነው።`
      : policyGapDetected
        ? `ይህን ዕቃ የሚያወጣ ወይም ብቁ ያልሆነ ድንጋጌ የለም። ጊዜያዊ ብቁ - የአለቃ ማረጋገጫ ይጠበቃል።`
        : `ለ${item.normalizedName} ትንተና በሂደት ላይ።`,
    policyGapDetected,
    policyGapMessage: policyGapDetected 
      ? "No clause directly excludes or disqualifies this item."
      : undefined,
    keywordsExpanded: policyGapDetected ? [
      "electrical machinery",
      "power infrastructure", 
      "industrial equipment",
      item.normalizedName.toLowerCase(),
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

  return {
    itemNumber: item.itemNumber,
    totalItems,
    itemName: item.normalizedName,
    invoiceReference: item.invoiceItem,
    equipmentType: item.equipmentType || "Capital Equipment",
    equipmentTypeAmharic: item.equipmentTypeAmharic || "ካፒታል መሣሪያ",
    capitalGoodsCategory: item.capitalGoodsCategory || "Industrial Machinery",
    capitalGoodsCategoryAmharic: item.capitalGoodsCategoryAmharic || "የኢንዱስትሪ ማሽነሪ",
    policyMatchStatus,
    decisionReadiness,
    licenseAlignment: {
      status: item.licenseAlignment,
      licenseName: item.licenseName || "Investment License",
      licenseNameAmharic: item.licenseNameAmharic || "የኢንቨስትመንት ፈቃድ",
      functionalRequirement: item.functionalRequirement || "is functionally required for operation of licensed infrastructure.",
      functionalRequirementAmharic: item.functionalRequirementAmharic || "ለፈቃድ ያለው መሠረተ ልማት አሠራር ተግባራዊ አስፈላጊ ነው።",
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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">የንጥል ትንተና (Item Analysis)</h2>
            <p className="text-sm text-muted-foreground">
              እያንዳንዱን የደረሰኝ ዕቃ ከፖሊሲ ጋር ያረጋግጡ
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">ትንተና ሂደት (Analysis Progress)</span>
            <Badge variant="outline" className="ml-auto">
              {Math.round(progressPercentage)}% ተጠናቋል
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-2 mb-4" />
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-2 rounded-lg bg-success/10 border border-success/20">
              <p className="text-2xl font-bold text-success">{stats.eligible}</p>
              <p className="text-xs text-success">ብቁ (Eligible)</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-2xl font-bold text-warning">{stats.needsConfirmation}</p>
              <p className="text-xs text-warning">ማረጋገጫ (Confirm)</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-2xl font-bold text-destructive">{stats.notEligible}</p>
              <p className="text-xs text-destructive">ብቁ አይደለም (Ineligible)</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted border border-border">
              <p className="text-2xl font-bold text-muted-foreground">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">በሂደት (Pending)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advisory Notice */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">
            ማሳሰቢያ: ይህ ስርዓት ፖሊሲን በቀጥታ ይተረጉማል - ቁልፍ ቃል ፍለጋ አይደለም።
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Notice: This system interprets policy directly via clause index — not keyword search.
          </p>
        </div>
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
          <h3 className="text-lg font-semibold text-muted-foreground">
            ምንም ዕቃዎች አልተተነተኑም
          </h3>
          <p className="text-sm text-muted-foreground">
            No items analyzed yet. Upload documents to begin.
          </p>
        </div>
      )}
    </div>
  );
};

export default ItemAnalysisStep;
