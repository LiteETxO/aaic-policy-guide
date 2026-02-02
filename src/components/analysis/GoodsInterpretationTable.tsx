import { useState } from "react";
import { 
  Package, CheckCircle2, AlertTriangle, HelpCircle, XCircle,
  ChevronDown, ChevronRight, FileText, Gauge, Zap, Wrench, ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Types for Goods Interpretation
export interface GoodsInterpretationRow {
  itemNumber: number;
  invoiceDescription: string; // Original - NOT translated
  normalizedName: string; // For analysis only
  // NEW: System Association (Spec 4️⃣)
  systemAssociation?: string; // e.g., "Power Distribution", "Cooling System", "IT Infrastructure"
  systemAssociationAmharic?: string;
  // NEW: Item Classification (Spec 4️⃣)
  itemClassification: "capital_equipment" | "capital_component" | "tool_consumable" | "ppe" | "unknown";
  matchedClause?: {
    documentName: string;
    articleNumber: string;
    pageNumber: number;
    clauseId?: string;
  };
  interpretationType: "exact" | "mapped" | "essential" | "not_supported";
  eligibilityOutcome: string;
  confidenceLevel: "high" | "medium" | "low";
  reasoning?: string;
}

interface GoodsInterpretationTableProps {
  items: GoodsInterpretationRow[];
  isOfficerReviewMode?: boolean;
  className?: string;
}

const interpretationConfig = {
  exact: {
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10",
    label: "ትክክለኛ ግጥጥም (Exact Match)",
  },
  mapped: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    label: "ተዛምዷል (Mapped Match)",
  },
  essential: {
    icon: AlertTriangle,
    color: "text-warning",
    bgColor: "bg-warning/10",
    label: "አስፈላጊ - ፖሊሲ ድጋፍ (Essential - Policy Supported)",
  },
  not_supported: {
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    label: "አልተደገፈም (Not Supported)",
  },
};

// NEW: Item Classification config (Spec 4️⃣)
const classificationConfig = {
  capital_equipment: {
    label: "ካፒታል መሣሪያ (Capital Equipment)",
    shortLabel: "Capital",
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
    qualifies: true,
  },
  capital_component: {
    label: "ካፒታል ክፍል (Capital Component)",
    shortLabel: "Component",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    qualifies: true,
  },
  tool_consumable: {
    label: "መሣሪያ / ፍጆታ (Tool / Consumable)",
    shortLabel: "Tool",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    qualifies: false,
  },
  ppe: {
    label: "የደህንነት አልባሳት (PPE)",
    shortLabel: "PPE",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    qualifies: false,
  },
  unknown: {
    label: "አልተመደበም (Unclassified)",
    shortLabel: "Unknown",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-muted-foreground/30",
    qualifies: false,
  },
};

const confidenceConfig = {
  high: {
    icon: Gauge,
    color: "text-success",
    bgColor: "bg-success/10",
    label: "ከፍተኛ (High)",
  },
  medium: {
    icon: Gauge,
    color: "text-warning",
    bgColor: "bg-warning/10",
    label: "መካከለኛ (Medium)",
  },
  low: {
    icon: Gauge,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    label: "ዝቅተኛ (Low)",
  },
};

const GoodsInterpretationTable = ({ items, isOfficerReviewMode = false, className }: GoodsInterpretationTableProps) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const toggleRow = (itemNumber: number) => {
    setExpandedRows(prev => 
      prev.includes(itemNumber) 
        ? prev.filter(n => n !== itemNumber) 
        : [...prev, itemNumber]
    );
  };

  if (items.length === 0) {
    return (
      <Card className={cn("border-warning/30", className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <CardTitle className="text-lg">የዕቃ ትርጓሜ አልተገኘም (No Goods Interpretation)</CardTitle>
          </div>
          <CardDescription>
            No invoice items have been analyzed yet. Upload documents to begin analysis.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn("animate-fade-in", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                የዕቃ ትርጓሜ ሰንጠረዥ (Goods Interpretation Table)
              </CardTitle>
              <CardDescription>
                {items.length} ዕቃዎች ተተነትነዋል ({items.length} items analyzed)
              </CardDescription>
            </div>
          </div>
          {isOfficerReviewMode && (
            <Badge className="bg-primary text-primary-foreground">
              የባለስልጣን ግምገማ ሁነታ (Officer Review Mode)
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="min-w-[180px]">
                  <div>
                    <p className="font-semibold">የደረሰኝ መግለጫ</p>
                    <p className="text-xs font-normal text-muted-foreground">(Invoice - Original)</p>
                  </div>
                </TableHead>
                {/* NEW: System Association Column (Spec 4️⃣) */}
                <TableHead className="min-w-[130px]">
                  <div>
                    <p className="font-semibold">የስርዓት ማህበር</p>
                    <p className="text-xs font-normal text-muted-foreground">(System Association)</p>
                  </div>
                </TableHead>
                {/* NEW: Classification Column (Spec 4️⃣) */}
                <TableHead className="min-w-[120px]">
                  <div>
                    <p className="font-semibold">ምደባ</p>
                    <p className="text-xs font-normal text-muted-foreground">(Classification)</p>
                  </div>
                </TableHead>
                <TableHead className="min-w-[180px]">
                  <div>
                    <p className="font-semibold">የተገኘ መመሪያ</p>
                    <p className="text-xs font-normal text-muted-foreground">(Matched Guideline)</p>
                  </div>
                </TableHead>
                <TableHead className="min-w-[100px]">
                  <div>
                    <p className="font-semibold">ትርጓሜ</p>
                    <p className="text-xs font-normal text-muted-foreground">(Interpretation)</p>
                  </div>
                </TableHead>
                <TableHead className="min-w-[110px]">
                  <div>
                    <p className="font-semibold">ብቁነት</p>
                    <p className="text-xs font-normal text-muted-foreground">(Eligibility)</p>
                  </div>
                </TableHead>
                {!isOfficerReviewMode && (
                  <TableHead className="w-[80px]">
                    <div>
                      <p className="font-semibold">እምነት</p>
                      <p className="text-xs font-normal text-muted-foreground">(Conf.)</p>
                    </div>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const interpConfig = interpretationConfig[item.interpretationType];
                const confConfig = confidenceConfig[item.confidenceLevel];
                const classConfig = classificationConfig[item.itemClassification];
                const isExpanded = expandedRows.includes(item.itemNumber);
                const InterpIcon = interpConfig.icon;

                return (
                  <Collapsible key={item.itemNumber} open={isExpanded} onOpenChange={() => toggleRow(item.itemNumber)}>
                    <TableRow 
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                        isExpanded && "bg-muted/30",
                        // Highlight non-qualifying items
                        !classConfig.qualifies && "bg-destructive/5"
                      )}
                    >
                      <TableCell className="font-mono text-sm">
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-1 hover:text-primary">
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            {item.itemNumber}
                          </button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px]">
                        <p className="truncate font-medium" title={item.invoiceDescription}>
                          {item.invoiceDescription}
                        </p>
                      </TableCell>
                      {/* NEW: System Association Cell */}
                      <TableCell className="text-sm">
                        {item.systemAssociation ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  <Zap className="h-3 w-3 text-primary shrink-0" />
                                  <span className="text-xs truncate max-w-[100px]">
                                    {item.systemAssociationAmharic || item.systemAssociation}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm font-medium">{item.systemAssociation}</p>
                                {item.systemAssociationAmharic && (
                                  <p className="text-xs text-muted-foreground">{item.systemAssociationAmharic}</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      {/* NEW: Classification Cell */}
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[10px] gap-1",
                                  classConfig.bgColor, 
                                  classConfig.color,
                                  classConfig.borderColor
                                )}
                              >
                                {classConfig.qualifies ? (
                                  <ShieldCheck className="h-3 w-3" />
                                ) : (
                                  <Wrench className="h-3 w-3" />
                                )}
                                {classConfig.shortLabel}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">{classConfig.label}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {classConfig.qualifies 
                                  ? "✅ Qualifies for duty-free incentive" 
                                  : "❌ Does NOT qualify for duty-free incentive"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.matchedClause ? (
                          <div className="space-y-1">
                            <p className="text-xs font-medium truncate max-w-[160px]" title={item.matchedClause.documentName}>
                              {item.matchedClause.documentName}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">
                                {item.matchedClause.articleNumber}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                p.{item.matchedClause.pageNumber}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            አልተገኘም
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn("text-[10px] gap-1", interpConfig.bgColor, interpConfig.color)}
                        >
                          <InterpIcon className="h-3 w-3" />
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-[10px] font-medium truncate max-w-[100px]" title={item.eligibilityOutcome}>
                          {item.eligibilityOutcome}
                        </p>
                      </TableCell>
                      {!isOfficerReviewMode && (
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px]", confConfig.bgColor, confConfig.color)}
                          >
                            {confConfig.label.split(' ')[0]}
                          </Badge>
                        </TableCell>
                      )}
                    </TableRow>
                    
                    {/* Expanded Row Details */}
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/20 border-0">
                        <TableCell colSpan={isOfficerReviewMode ? 8 : 9} className="py-3">
                          <div className="pl-8 pr-4 space-y-2">
                            <div className="flex items-start gap-6">
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-muted-foreground mb-1">
                                  የደረሰኝ መግለጫ ሙሉ (Full Invoice Description)
                                </p>
                                <p className="text-sm">{item.invoiceDescription}</p>
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-muted-foreground mb-1">
                                  ትርጓሜ ዓይነት (Interpretation Type)
                                </p>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs gap-1.5", interpConfig.bgColor, interpConfig.color)}
                                >
                                  <InterpIcon className="h-3 w-3" />
                                  {interpConfig.label}
                                </Badge>
                              </div>
                            </div>
                            
                            {item.matchedClause && (
                              <div className="p-3 rounded-lg bg-background border">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">
                                  <FileText className="h-3 w-3 inline mr-1" />
                                  የተዛመደ ፖሊሲ ማጣቀሻ (Matched Policy Reference)
                                </p>
                                <div className="flex flex-wrap gap-3 text-sm">
                                  <span><strong>ሰነድ:</strong> {item.matchedClause.documentName}</span>
                                  <span><strong>አንቀጽ:</strong> {item.matchedClause.articleNumber}</span>
                                  <span><strong>ገጽ:</strong> {item.matchedClause.pageNumber}</span>
                                  {item.matchedClause.clauseId && (
                                    <span><strong>Clause ID:</strong> {item.matchedClause.clauseId}</span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {item.reasoning && !isOfficerReviewMode && (
                              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <p className="text-xs font-semibold text-primary mb-1">
                                  AI ምክንያት (AI Reasoning)
                                </p>
                                <p className="text-sm text-muted-foreground">{item.reasoning}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoodsInterpretationTable;
