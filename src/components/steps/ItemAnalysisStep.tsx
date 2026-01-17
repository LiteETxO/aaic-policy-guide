import { useState } from "react";
import { 
  ClipboardList, ChevronDown, ChevronRight, FileSearch, BookOpen, 
  HelpCircle, AlertCircle, CheckCircle2, Clock, Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConfidenceBadge, EvidenceChip, type ConfidenceLevel, type EvidenceData } from "@/components/gamification";

// Analysis status - NEVER show "Not Eligible" here
type ItemAnalysisStatus = 
  | "in_analysis" 
  | "requires_clarification" 
  | "evidence_pending" 
  | "analysis_complete";

interface Citation {
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
  analysisStatus: ItemAnalysisStatus;
  confidence: ConfidenceLevel;
}

interface ItemAnalysisStepProps {
  items: AnalysisItem[];
  currentItemIndex?: number;
  onItemSelect?: (index: number) => void;
}

const statusConfig: Record<ItemAnalysisStatus, { label: string; labelAmharic: string; color: string; bgColor: string; icon: typeof Clock }> = {
  in_analysis: {
    label: "In Analysis",
    labelAmharic: "በትንተና ላይ",
    color: "text-primary",
    bgColor: "bg-primary/10",
    icon: Clock,
  },
  requires_clarification: {
    label: "Requires Clarification",
    labelAmharic: "ማብራሪያ ያስፈልጋል",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    icon: HelpCircle,
  },
  evidence_pending: {
    label: "Evidence Pending",
    labelAmharic: "ማስረጃ ይጠበቃል",
    color: "text-warning",
    bgColor: "bg-warning/10",
    icon: AlertCircle,
  },
  analysis_complete: {
    label: "Analysis Complete",
    labelAmharic: "ትንተና ተጠናቋል",
    color: "text-success",
    bgColor: "bg-success/10",
    icon: CheckCircle2,
  },
};

const licenseAlignmentConfig: Record<string, { color: string; bgColor: string }> = {
  Aligned: { color: "text-success", bgColor: "bg-success/10" },
  Conditional: { color: "text-warning", bgColor: "bg-warning/10" },
  "Needs Clarification": { color: "text-blue-500", bgColor: "bg-blue-500/10" },
  "Not Aligned": { color: "text-muted-foreground", bgColor: "bg-muted" },
};

const policyMatchConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  Listed: { label: "ተዘርዝሯል", color: "text-success", bgColor: "bg-success/10" },
  Mapped: { label: "ተዛምዷል", color: "text-primary", bgColor: "bg-primary/10" },
  "Not Listed": { label: "አልተዘረዘረም", color: "text-muted-foreground", bgColor: "bg-muted" },
  Checking: { label: "በመፈተሽ ላይ", color: "text-primary", bgColor: "bg-primary/10" },
};

/**
 * Step 3 — Item Analysis (PRIMARY WORK AREA)
 * 
 * Replace dense tables with Expandable Item Cards.
 * Each invoice item appears as a card.
 * 
 * Rules:
 * - Do NOT display "Not Eligible" here
 * - Status may only be: In Analysis, Requires Clarification, Evidence Pending
 * - This prevents premature anchoring
 */
const ItemAnalysisStep = ({
  items,
  currentItemIndex,
  onItemSelect,
}: ItemAnalysisStepProps) => {
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const toggleExpand = (itemNumber: number) => {
    setExpandedItems((prev) =>
      prev.includes(itemNumber)
        ? prev.filter((n) => n !== itemNumber)
        : [...prev, itemNumber]
    );
  };

  const totalItems = items.length;
  const completeItems = items.filter((i) => i.analysisStatus === "analysis_complete").length;

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
              እያንዳንዱን የደረሰኝ ዕቃ ይገምግሙ
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {completeItems}/{totalItems} ተተነተኑ
          </Badge>
        </div>
      </div>

      {/* Advisory Notice */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm">
        <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground">
          <span className="font-medium">ማሳሰቢያ:</span> ይህ ደረጃ ማስረጃን ይሰበስባል - የመጨረሻ ውሳኔዎች በማስረጃ ግምገማ በኋላ ይሰጣሉ።
          <span className="block text-xs mt-0.5">(This stage gathers evidence - final decisions come after evidence review.)</span>
        </span>
      </div>

      {/* Item Cards */}
      <div className="space-y-4">
        {items.map((item) => {
          const isExpanded = expandedItems.includes(item.itemNumber);
          const statusInfo = statusConfig[item.analysisStatus];
          const StatusIcon = statusInfo.icon;
          const licenseStyle = licenseAlignmentConfig[item.licenseAlignment] || licenseAlignmentConfig.Aligned;
          const policyStyle = policyMatchConfig[item.policyMatch] || policyMatchConfig.Checking;

          return (
            <Card
              key={item.itemNumber}
              className={cn(
                "transition-all duration-200 border-l-4",
                item.analysisStatus === "analysis_complete" && "border-l-success",
                item.analysisStatus === "requires_clarification" && "border-l-blue-500",
                item.analysisStatus === "evidence_pending" && "border-l-warning",
                item.analysisStatus === "in_analysis" && "border-l-primary",
                currentItemIndex === item.itemNumber && "ring-2 ring-primary"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-sm font-semibold shrink-0">
                      {item.itemNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold truncate">
                        {item.normalizedName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        Invoice: {item.invoiceItem}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <ConfidenceBadge level={item.confidence} size="sm" />
                    <Badge variant="outline" className={cn("gap-1", statusInfo.bgColor, statusInfo.color)}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.labelAmharic}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Quick status row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground mb-1">ፈቃድ ተስማሚነት</p>
                    <Badge variant="outline" className={cn("text-xs", licenseStyle.bgColor, licenseStyle.color)}>
                      {item.licenseAlignment === "Aligned" ? "✓ ተስማምቷል" : 
                       item.licenseAlignment === "Conditional" ? "⚠ ቅድመ ሁኔታ" :
                       item.licenseAlignment === "Needs Clarification" ? "? ማብራሪያ" : "✗ አልተስማማም"}
                    </Badge>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground mb-1">ፖሊሲ ግጥጥም</p>
                    <Badge variant="outline" className={cn("text-xs", policyStyle.bgColor, policyStyle.color)}>
                      {policyStyle.label}
                    </Badge>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground mb-1">አስፈላጊነት</p>
                    <Badge variant="outline" className={cn("text-xs",
                      item.essentialityStatus === "Complete" ? "bg-success/10 text-success" :
                      item.essentialityStatus === "Pending" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                    )}>
                      {item.essentialityStatus === "Complete" ? "✓ ተጠናቋል" :
                       item.essentialityStatus === "Pending" ? "⏳ ይጠበቃል" : "—"}
                    </Badge>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground mb-1">ማስረጃ</p>
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                      {item.evidenceCount} ጥቅሶች
                    </Badge>
                  </div>
                </div>

                {/* Expand button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpand(item.itemNumber)}
                  className="w-full justify-between"
                >
                  <span className="text-sm">
                    {isExpanded ? "ዝርዝር ደብቅ" : "ዝርዝር ይመልከቱ"} (View Details)
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="pt-4 border-t space-y-4 animate-fade-in">
                    {/* Evidence Chips */}
                    {item.citations.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          ማስረጃ (Evidence Found)
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {item.citations.map((citation, i) => {
                            const evidenceData: EvidenceData = {
                              documentName: citation.documentName,
                              articleSection: citation.articleSection,
                              pageNumber: citation.pageNumber,
                              quote: citation.quote,
                            };
                            return (
                              <EvidenceChip key={i} evidence={evidenceData} />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Navigate to evidence review */}
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" className="gap-2">
                        <FileSearch className="h-4 w-4" />
                        ማስረጃ ግምገማ ይቀጥሉ (Continue to Evidence Review)
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ItemAnalysisStep;
