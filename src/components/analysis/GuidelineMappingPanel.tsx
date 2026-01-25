import { useState } from "react";
import { 
  BookOpen, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, 
  FileText, Scale, ExternalLink, AlertOctagon, Building2, ClipboardList
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// Types for Guideline Mapping data
export interface GuidelineSection {
  sectionTitle: string;
  sectionTitleAmharic?: string;
  articleNumber?: string;
  pageNumber: number;
  clauseIds?: string[];
}

export interface AllowedCategory {
  categoryName: string;
  categoryNameAmharic?: string;
  description?: string;
  clauseId?: string;
}

export interface GuidelineMappingData {
  // License Information (extracted from document)
  licenseNameVerbatim: string;
  licenseNameAmharic?: string;
  licenseNumber?: string;
  licensedActivity?: string;
  licensedActivityAmharic?: string;
  sector?: string;
  
  // Guideline Matching Result
  mappingStatus: "matched" | "partial" | "not_found" | "pending";
  matchedSections: GuidelineSection[];
  allowedCategories: AllowedCategory[];
  
  // Citation for the match
  sourceDocument?: string;
  sourceDocumentAmharic?: string;
  issuingAuthority?: string;
  
  // Conditions and Exclusions
  conditions?: string[];
  conditionsAmharic?: string[];
  exclusions?: string[];
  exclusionsAmharic?: string[];
  
  // Warning/blocking info
  warningMessage?: string;
  warningMessageAmharic?: string;
  adminActionRequired?: boolean;
}

interface GuidelineMappingPanelProps {
  data: GuidelineMappingData;
  onProceedAnyway?: () => void;
  className?: string;
}

const statusConfig = {
  matched: {
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
    label: "✅ ተዛምዷል (Matched)",
    description: "License type successfully matched to guideline section",
  },
  partial: {
    icon: AlertTriangle,
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/30",
    label: "⚠️ ከፊል ግጥጥም (Partial Match)",
    description: "Some sections matched, but review recommended",
  },
  not_found: {
    icon: AlertOctagon,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    label: "🚫 አልተገኘም (Not Found)",
    description: "License type not located in policy guideline",
  },
  pending: {
    icon: ClipboardList,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-muted-foreground/30",
    label: "⏳ በመፈተሽ ላይ (Checking)",
    description: "Searching policy documents for matching sections...",
  },
};

const GuidelineMappingPanel = ({ data, onProceedAnyway, className }: GuidelineMappingPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCategories, setShowCategories] = useState(false);
  
  const config = statusConfig[data.mappingStatus];
  const StatusIcon = config.icon;
  const isBlocked = data.mappingStatus === "not_found";
  const hasWarning = data.mappingStatus === "partial" || data.mappingStatus === "not_found";

  return (
    <Card className={cn(
      "border-l-4 animate-fade-in",
      config.borderColor,
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", config.bgColor)}>
              <Scale className={cn("h-5 w-5", config.color)} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>የመመሪያ ካርታ (Guideline Mapping)</span>
                <Badge variant="outline" className={cn("text-xs", config.bgColor, config.color)}>
                  {config.label}
                </Badge>
              </CardTitle>
              <CardDescription>
                {config.description}
              </CardDescription>
            </div>
          </div>
          <StatusIcon className={cn("h-6 w-6 shrink-0", config.color)} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* License Information */}
        <div className={cn("p-4 rounded-lg border", config.bgColor, config.borderColor)}>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">የፈቃድ መረጃ (License Information)</h4>
          </div>
          
          <div className="space-y-2">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div>
                <p className="text-xs text-muted-foreground">ፈቃድ ዓይነት (License Type)</p>
                <p className="text-sm font-medium">{data.licenseNameVerbatim}</p>
                {data.licenseNameAmharic && (
                  <p className="text-xs text-muted-foreground">{data.licenseNameAmharic}</p>
                )}
              </div>
              {data.licenseNumber && (
                <div>
                  <p className="text-xs text-muted-foreground">ፈቃድ ቁጥር (License #)</p>
                  <p className="text-sm font-medium">{data.licenseNumber}</p>
                </div>
              )}
              {data.sector && (
                <div>
                  <p className="text-xs text-muted-foreground">ዘርፍ (Sector)</p>
                  <Badge variant="secondary" className="text-xs">{data.sector}</Badge>
                </div>
              )}
            </div>
            
            {data.licensedActivity && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">የተፈቀደ እንቅስቃሴ (Licensed Activity)</p>
                <p className="text-sm">{data.licensedActivity}</p>
                {data.licensedActivityAmharic && (
                  <p className="text-xs text-muted-foreground mt-0.5">{data.licensedActivityAmharic}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Matched Guideline Sections */}
        {data.matchedSections.length > 0 && (
          <div className="p-4 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-success" />
              <h4 className="text-sm font-semibold text-success">
                የተዛመዱ የመመሪያ ክፍሎች (Matched Guideline Sections)
              </h4>
            </div>
            
            <div className="space-y-2">
              {data.matchedSections.map((section, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded bg-background border">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{section.sectionTitle}</p>
                    {section.sectionTitleAmharic && (
                      <p className="text-xs text-muted-foreground">{section.sectionTitleAmharic}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {section.articleNumber && (
                        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
                          {section.articleNumber}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ገጽ {section.pageNumber} (Page {section.pageNumber})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {data.sourceDocument && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <Building2 className="h-3 w-3" />
                  <span>ምንጭ: {data.sourceDocument}</span>
                  {data.issuingAuthority && <span>• {data.issuingAuthority}</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Allowed Capital Goods Categories */}
        {data.allowedCategories.length > 0 && (
          <Collapsible open={showCategories} onOpenChange={setShowCategories}>
            <CollapsibleTrigger asChild>
              <button className={cn(
                "w-full flex items-center justify-between gap-3 p-3 rounded-lg transition-colors",
                "bg-primary/5 hover:bg-primary/10 border border-primary/20 text-left"
              )}>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">
                      ለዚህ ፈቃድ የተፈቀዱ ካፒታል እቃዎች ምድቦች
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Allowed Capital Goods Categories ({data.allowedCategories.length})
                    </p>
                  </div>
                </div>
                {showCategories ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {data.allowedCategories.map((category, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm font-medium">{category.categoryName}</p>
                    {category.categoryNameAmharic && (
                      <p className="text-xs text-muted-foreground">{category.categoryNameAmharic}</p>
                    )}
                    {category.description && (
                      <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                    )}
                    {category.clauseId && (
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {category.clauseId}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Conditions */}
        {data.conditions && data.conditions.length > 0 && (
          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h5 className="text-sm font-semibold text-warning">ቅድመ ሁኔታዎች (Conditions)</h5>
            </div>
            <ul className="space-y-1">
              {data.conditions.map((condition, idx) => (
                <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-warning">•</span>
                  <span>{condition}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Exclusions */}
        {data.exclusions && data.exclusions.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertOctagon className="h-4 w-4 text-destructive" />
              <h5 className="text-sm font-semibold text-destructive">ከቀረጥ ነፃ ውጭ (Exclusions)</h5>
            </div>
            <ul className="space-y-1">
              {data.exclusions.map((exclusion, idx) => (
                <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>{exclusion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warning/Soft Block */}
        {hasWarning && (
          <div className={cn(
            "p-4 rounded-lg border",
            isBlocked ? "bg-destructive/10 border-destructive/30" : "bg-warning/10 border-warning/30"
          )}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={cn(
                "h-5 w-5 mt-0.5 shrink-0",
                isBlocked ? "text-destructive" : "text-warning"
              )} />
              <div className="flex-1">
                <h5 className={cn(
                  "text-sm font-semibold mb-1",
                  isBlocked ? "text-destructive" : "text-warning"
                )}>
                  {isBlocked 
                    ? "🚫 የመመሪያ ካርታ አልተሳካም — ማስጠንቀቂያ" 
                    : "⚠️ ከፊል ግጥጥም — የባለስልጣን ግምገማ ይመከራል"
                  }
                </h5>
                <p className="text-xs text-muted-foreground mb-1">
                  {isBlocked 
                    ? "Guideline Mapping Failed — Caution Advised" 
                    : "Partial Match — Officer Review Recommended"
                  }
                </p>
                {data.warningMessage && (
                  <p className="text-sm text-foreground mt-2">{data.warningMessage}</p>
                )}
                {data.warningMessageAmharic && (
                  <p className="text-xs text-muted-foreground">{data.warningMessageAmharic}</p>
                )}
                
                {/* Soft block: allow proceeding with warning */}
                {isBlocked && onProceedAnyway && (
                  <div className="mt-3 pt-3 border-t border-destructive/20">
                    <p className="text-xs text-muted-foreground mb-2">
                      You may proceed with manual review, but results may be incomplete.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={onProceedAnyway}
                      className="gap-2 border-warning text-warning hover:bg-warning/10"
                    >
                      <ExternalLink className="h-3 w-3" />
                      በእጅ ግምገማ ቀጥል (Proceed with Manual Review)
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Admin Action Required */}
        {data.adminActionRequired && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-destructive" />
              <p className="text-sm font-medium text-destructive">
                የአስተዳዳሪ እርምጃ ያስፈልጋል (Admin Action Required)
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Admin must confirm guideline contains this license type OR update policy library.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GuidelineMappingPanel;
