import { useState } from "react";
import { 
  Package, FileText, Tag, Cpu, ChevronDown, ChevronRight,
  BookOpen, Building2
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  PolicyMatchBadge, 
  DecisionReadinessBadge, 
  AIReasoningPanel, 
  OfficerActions,
  LicenseAlignmentCard,
  type PolicyMatchStatus,
  type DecisionReadiness,
  type AIReasoningData
} from "@/components/analysis";
import { EvidenceChip, type EvidenceData } from "@/components/gamification";

export interface ItemCardCitation {
  clauseId?: string;
  documentName: string;
  articleSection: string;
  pageNumber: number;
  quote?: string;
}

export interface ItemCardData {
  itemNumber: number;
  totalItems: number;
  // A. Item Summary
  itemName: string;
  invoiceReference: string;
  equipmentType: string;
  equipmentTypeAmharic?: string;
  capitalGoodsCategory: string;
  capitalGoodsCategoryAmharic?: string;
  // B. Policy Match Status
  policyMatchStatus: PolicyMatchStatus;
  // C. Decision Readiness
  decisionReadiness: DecisionReadiness;
  // License Alignment
  licenseAlignment: {
    status: "Aligned" | "Conditional" | "Needs Clarification" | "Not Aligned";
    licenseName: string;
    licenseNameAmharic?: string;
    functionalRequirement: string;
    functionalRequirementAmharic?: string;
  };
  // AI Reasoning
  reasoning: AIReasoningData;
  // Citations/Evidence
  citations: ItemCardCitation[];
  // Policy basis for actions
  policyBasis?: {
    articleSection: string;
    directiveNumber: string;
  };
}

interface ItemCardProps {
  data: ItemCardData;
  className?: string;
  onApprove?: (itemNumber: number) => void;
  onRequestClarification?: (itemNumber: number) => void;
  onEscalate?: (itemNumber: number) => void;
}

const ItemCard = ({
  data,
  className,
  onApprove,
  onRequestClarification,
  onEscalate,
}: ItemCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const canApprove = data.decisionReadiness === "eligible_ready";
  const requiresClarification = data.decisionReadiness === "eligible_confirmation";
  const hasPolicyGap = data.reasoning.policyGapDetected === true;

  return (
    <Card className={cn(
      "transition-all duration-200 overflow-hidden",
      data.decisionReadiness === "eligible_ready" && "border-l-4 border-l-success",
      data.decisionReadiness === "eligible_confirmation" && "border-l-4 border-l-warning",
      data.decisionReadiness === "provisionally_eligible" && "border-l-4 border-l-primary",
      data.decisionReadiness === "not_eligible" && "border-l-4 border-l-destructive",
      className
    )}>
      <CardHeader className="pb-3">
        {/* A. ITEM SUMMARY - Always Visible */}
        <div className="space-y-3">
          {/* Row 1: Item number, name, and decision readiness */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold shrink-0">
                {data.itemNumber}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold truncate">{data.itemName}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{data.invoiceReference}</span>
                </div>
              </div>
            </div>
            
            {/* C. Decision Readiness */}
            <DecisionReadinessBadge status={data.decisionReadiness} />
          </div>

          {/* Row 2: Equipment type and Capital Goods Category */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5 bg-muted/50">
              <Cpu className="h-3 w-3" />
              <span className="font-medium">{data.equipmentTypeAmharic || data.equipmentType}</span>
              {data.equipmentTypeAmharic && (
                <span className="text-muted-foreground">({data.equipmentType})</span>
              )}
            </Badge>
            <Badge variant="outline" className="gap-1.5 bg-primary/5 text-primary border-primary/30">
              <Package className="h-3 w-3" />
              <span className="font-medium">{data.capitalGoodsCategoryAmharic || data.capitalGoodsCategory}</span>
            </Badge>
          </div>

          {/* Row 3: Policy Match Status */}
          <div className="flex items-center gap-3">
            <PolicyMatchBadge status={data.policyMatchStatus} />
            {data.citations.length > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <BookOpen className="h-3 w-3" />
                {data.citations.length} ማስረጃ (Evidence)
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* License Alignment - Promoted visibility */}
        <LicenseAlignmentCard
          status={data.licenseAlignment.status}
          licenseName={data.licenseAlignment.licenseName}
          licenseNameAmharic={data.licenseAlignment.licenseNameAmharic}
          functionalRequirement={data.licenseAlignment.functionalRequirement}
          functionalRequirementAmharic={data.licenseAlignment.functionalRequirementAmharic}
          itemName={data.itemName}
        />

        {/* Pinned Policy Citations - Visible, not hidden */}
        {data.citations.length > 0 && (
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-success" />
              <h5 className="text-sm font-semibold text-success">
                የፖሊሲ ጥቅሶች (Policy Citations)
              </h5>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.citations.slice(0, 4).map((citation, idx) => {
                const evidenceData: EvidenceData = {
                  documentName: citation.documentName,
                  articleSection: citation.articleSection,
                  pageNumber: citation.pageNumber,
                  quote: citation.quote,
                };
                return <EvidenceChip key={idx} evidence={evidenceData} />;
              })}
              {data.citations.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{data.citations.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Expand/Collapse for AI Reasoning */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between hover:bg-primary/5"
        >
          <span className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {isExpanded ? "ዝርዝር ምክንያት ደብቅ" : "ዝርዝር ምክንያት ይመልከቱ"}
            </span>
            <span className="text-xs text-muted-foreground">
              (View AI Reasoning)
            </span>
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="space-y-4 animate-fade-in">
            <Separator />
            
            {/* AI Reasoning Panel */}
            <AIReasoningPanel data={data.reasoning} defaultOpen={true} />
          </div>
        )}

        <Separator />

        {/* Officer Actions - Always visible */}
        <OfficerActions
          itemNumber={data.itemNumber}
          policyBasis={data.policyBasis}
          canApprove={canApprove}
          requiresClarification={requiresClarification}
          hasPolicyGap={hasPolicyGap}
          onApprove={onApprove}
          onRequestClarification={onRequestClarification}
          onEscalate={onEscalate}
        />
      </CardContent>
    </Card>
  );
};

export default ItemCard;
