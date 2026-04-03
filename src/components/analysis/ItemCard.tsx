import { useState } from "react";
import { 
  Package, FileText, Tag, Cpu, ChevronDown, ChevronRight,
  BookOpen, Building2, ShieldCheck, Wrench, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  // NEW: Item Classification (Spec 4️⃣)
  itemClassification?: "capital_equipment" | "capital_component" | "tool_consumable" | "ppe" | "unknown";
  // NEW: System Association (Spec 4️⃣)
  systemAssociation?: string;
  systemAssociationAmharic?: string;
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

// Classification config for display
const classificationConfig = {
  capital_equipment: {
    label: "Capital Equipment",
    shortLabel: "Capital Equipment",
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
    qualifies: true,
  },
  capital_component: {
    label: "Capital Component",
    shortLabel: "Capital Component",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    qualifies: true,
  },
  tool_consumable: {
    label: "Tool / Consumable",
    shortLabel: "Tool/Consumable",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    qualifies: false,
  },
  ppe: {
    label: "Personal Protective Equipment (PPE)",
    shortLabel: "PPE",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    qualifies: false,
  },
  unknown: {
    label: "Unclassified",
    shortLabel: "Unclassified",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-muted-foreground/30",
    qualifies: false,
  },
};

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

          {/* Row 2: Classification, System Association, and Capital Goods Category (Spec 4️⃣) */}
          <div className="flex flex-wrap gap-2">
            {/* NEW: Item Classification Badge */}
            {data.itemClassification && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "gap-1.5",
                        classificationConfig[data.itemClassification].bgColor,
                        classificationConfig[data.itemClassification].color,
                        classificationConfig[data.itemClassification].borderColor
                      )}
                    >
                      {classificationConfig[data.itemClassification].qualifies ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <Wrench className="h-3 w-3" />
                      )}
                      <span className="font-medium">
                        {classificationConfig[data.itemClassification].shortLabel}
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm font-medium">{classificationConfig[data.itemClassification].label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {classificationConfig[data.itemClassification].qualifies 
                        ? "✅ Qualifies for duty-free incentive" 
                        : "❌ Does NOT qualify for duty-free incentive"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* NEW: System Association Badge */}
            {data.systemAssociation && (
              <Badge variant="outline" className="gap-1.5 bg-blue-500/10 text-blue-600 border-blue-500/30">
                <Cpu className="h-3 w-3" />
                <span className="font-medium">{data.systemAssociation}</span>
              </Badge>
            )}
            
            {/* Equipment Type (fallback if no classification) */}
            {!data.itemClassification && (
              <Badge variant="outline" className="gap-1.5 bg-muted/50">
                <Cpu className="h-3 w-3" />
                <span className="font-medium">{data.equipmentType}</span>
              </Badge>
            )}

            {/* Capital Goods Category */}
            <Badge variant="outline" className="gap-1.5 bg-primary/5 text-primary border-primary/30">
              <Package className="h-3 w-3" />
              <span className="font-medium">{data.capitalGoodsCategory}</span>
            </Badge>

            {/* Non-qualifying warning */}
            {data.itemClassification && !classificationConfig[data.itemClassification].qualifies && (
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <AlertTriangle className="h-3 w-3" />
                Not Eligible
              </Badge>
            )}
          </div>

          {/* Row 3: Policy Match Status */}
          <div className="flex items-center gap-3">
            <PolicyMatchBadge status={data.policyMatchStatus} />
            {data.citations.length > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <BookOpen className="h-3 w-3" />
                {data.citations.length} Citation{data.citations.length !== 1 ? "s" : ""}
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
              <h5 className="text-sm font-semibold text-success">Policy Citations</h5>
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
          <span className="text-sm font-medium">
            {isExpanded ? "Hide AI Reasoning" : "View AI Reasoning"}
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
