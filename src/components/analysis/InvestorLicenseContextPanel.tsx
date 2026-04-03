import { useState } from "react";
import {
  Building2, FileText, Scale, MapPin, AlertOctagon,
  ChevronDown, ChevronRight, User, BadgeCheck, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// Types for Investor & License Context data
export interface InvestorLicenseContextData {
  investorName?: string;
  investorNameAmharic?: string;
  licenseName: string;
  licenseNameAmharic?: string;
  licensedActivity?: string;
  licensedActivityAmharic?: string;
  licenseNumber?: string;
  licenseCategory?: string;
  licenseCategoryAmharic?: string;
  isCategoryDerived?: boolean;
  guidelineMappingStatus: "matched" | "partial" | "not_found" | "pending";
  matchedGuidelineSection?: string;
  matchedGuidelineSectionAmharic?: string;
  guidelineArticle?: string;
  guidelinePageNumber?: number;
  guidelineDocumentName?: string;
  isContextComplete: boolean;
  missingFields?: string[];
}

interface InvestorLicenseContextPanelProps {
  data: InvestorLicenseContextData;
  className?: string;
}

const statusConfig = {
  matched: {
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
    icon: BadgeCheck,
    label: "✅ Matched",
  },
  partial: {
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/30",
    icon: AlertTriangle,
    label: "⚠️ Partial",
  },
  not_found: {
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    icon: AlertOctagon,
    label: "🚫 Not Found",
  },
  pending: {
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-muted-foreground/30",
    icon: Scale,
    label: "⏳ Pending",
  },
};

const InvestorLicenseContextPanel = ({ data, className }: InvestorLicenseContextPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const config = statusConfig[data.guidelineMappingStatus];
  const StatusIcon = config.icon;
  const isInvalid = !data.isContextComplete || data.guidelineMappingStatus === "not_found";

  return (
    <Card className={cn(
      "border-2 sticky top-4 z-10 animate-fade-in",
      isInvalid ? "border-destructive/50 bg-destructive/5" : "border-primary/30",
      className
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  isInvalid ? "bg-destructive/10" : "bg-primary/10"
                )}>
                  <Building2 className={cn("h-5 w-5", isInvalid ? "text-destructive" : "text-primary")} />
                </div>
                <div>
                  <CardTitle className="text-lg">Investor & License Context</CardTitle>
                  {!data.isContextComplete && (
                    <p className="text-xs text-destructive mt-0.5">
                      Analysis Invalid — Required context not visible
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("text-xs", config.bgColor, config.color, config.borderColor)}
                >
                  {config.label}
                </Badge>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Validation Warning */}
            {!data.isContextComplete && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-start gap-2">
                  <AlertOctagon className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Missing Fields</p>
                    <ul className="text-xs text-destructive/80 mt-1 space-y-0.5">
                      {data.missingFields?.map((field, idx) => (
                        <li key={idx}>• {field}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {/* Investor Information */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Investor / Company Name</h4>
                </div>
                <div className="pl-6">
                  {data.investorName ? (
                    <p className="text-base font-medium">{data.investorName}</p>
                  ) : (
                    <p className="text-sm text-destructive italic">Not extracted from license</p>
                  )}
                </div>
              </div>

              {/* License Category */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">License Category / Type</h4>
                </div>
                <div className="pl-6">
                  {data.licenseCategory ? (
                    <div className="flex items-center gap-2">
                      <p className="text-base font-medium">{data.licenseCategory}</p>
                      {data.isCategoryDerived && (
                        <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                          Derived for analysis
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Not specified</p>
                  )}
                </div>
              </div>
            </div>

            {/* License Name & Activity */}
            <div className="space-y-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">License Name / Activity</h4>
                <Badge variant="outline" className="text-[10px]">Verbatim</Badge>
              </div>
              <div className="pl-6 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">License</p>
                  <p className="text-base font-medium">{data.licenseName}</p>
                </div>
                {data.licensedActivity && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">Licensed Activity</p>
                    <p className="text-sm">{data.licensedActivity}</p>
                  </div>
                )}
                {data.licenseNumber && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">License Number</p>
                    <p className="text-sm font-mono">{data.licenseNumber}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Guideline Mapping */}
            <div className={cn("space-y-3 p-4 rounded-lg border", config.bgColor, config.borderColor)}>
              <div className="flex items-center gap-2">
                <MapPin className={cn("h-4 w-4", config.color)} />
                <h4 className="text-sm font-semibold">Policy Guideline Mapping</h4>
                <StatusIcon className={cn("h-4 w-4 ml-auto", config.color)} />
              </div>

              <div className="pl-6 space-y-2">
                {data.guidelineMappingStatus === "matched" || data.guidelineMappingStatus === "partial" ? (
                  <>
                    {data.matchedGuidelineSection && (
                      <div>
                        <p className="text-xs text-muted-foreground">Guideline Section</p>
                        <p className="text-sm font-medium">{data.matchedGuidelineSection}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs">
                      {data.guidelineArticle && (
                        <span className="flex items-center gap-1">
                          <span className="text-muted-foreground">Article:</span>
                          <Badge variant="outline" className="text-[10px]">{data.guidelineArticle}</Badge>
                        </span>
                      )}
                      {data.guidelinePageNumber && (
                        <span className="flex items-center gap-1">
                          <span className="text-muted-foreground">Page:</span>
                          <Badge variant="outline" className="text-[10px]">{data.guidelinePageNumber}</Badge>
                        </span>
                      )}
                      {data.guidelineDocumentName && (
                        <span className="flex items-center gap-1">
                          <span className="text-muted-foreground">Document:</span>
                          <span className="font-medium">{data.guidelineDocumentName}</span>
                        </span>
                      )}
                    </div>
                  </>
                ) : data.guidelineMappingStatus === "not_found" ? (
                  <p className="text-sm text-destructive font-medium">
                    Guideline Mapping Failed — Cannot proceed to item analysis
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Searching policy documents...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default InvestorLicenseContextPanel;
