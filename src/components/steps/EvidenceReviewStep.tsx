import { FileSearch, BookOpen, Quote, ExternalLink, AlertCircle, ShieldAlert, Ban, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ConfidenceBadge, type ConfidenceLevel } from "@/components/gamification";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Citation {
  clause_id?: string;
  documentName: string;
  articleSection: string;
  pageNumber: number;
  quote?: string;
  relevance?: string;
  highlightedText?: string;
}

interface EssentialityAnalysis {
  functionalNecessity: string;
  operationalLink: string;
  capitalNature: string;
  noProhibition: string;
}

interface EvidenceItem {
  itemNumber: number;
  itemName: string;
  citations: Citation[];
  essentialityAnalysis?: EssentialityAnalysis;
  confidence: ConfidenceLevel;
  clauseRetrievalBlocked?: boolean;
  referencedClauseIds?: string[];
  eligibilityStatus?: string;
}

interface EvidenceReviewStepProps {
  evidenceItems: EvidenceItem[];
  selectedItemIndex?: number;
  onItemSelect?: (index: number) => void;
}

/**
 * Step 4 — Evidence Review (VISUAL PRIORITY)
 *
 * MANDATORY POLICY CLAUSE ENFORCEMENT:
 * - Evidence panel must NEVER be empty
 * - If no clause retrieved: show blocked state
 * - If clause found: show full citation details
 *
 * When an item card is expanded:
 * - Evidence panel becomes dominant (≥50% width)
 * - Policy clauses are highlighted
 * - Page numbers shown
 * - Clause IDs shown prominently
 */
const EvidenceReviewStep = ({
  evidenceItems,
  selectedItemIndex = 0,
  onItemSelect,
}: EvidenceReviewStepProps) => {
  const selectedItem = evidenceItems[selectedItemIndex] || evidenceItems[0];

  // Determine if item has valid clause binding
  const hasValidClauseBinding = selectedItem && (
    (selectedItem.referencedClauseIds && selectedItem.referencedClauseIds.length > 0) ||
    (selectedItem.citations && selectedItem.citations.length > 0 &&
     selectedItem.citations.some(c => c.clause_id || (c.pageNumber && c.pageNumber > 0)))
  );

  const isBlocked = selectedItem?.clauseRetrievalBlocked ||
    (selectedItem && !hasValidClauseBinding &&
     selectedItem.eligibilityStatus?.includes("Deferred"));

  return (
    <div className="p-6 lg:p-8 h-full">
      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileSearch className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Evidence Review</h2>
            <p className="text-sm text-muted-foreground">
              Review evidence and citations before making a decision
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout: Item List + Evidence Panel */}
      <div className="grid lg:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-280px)]">
        {/* Left: Item selector */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Items</CardTitle>
            <CardDescription className="text-xs">
              Select an item to review
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="p-2 space-y-1">
                {evidenceItems.map((item, index) => {
                  const hasClauseBinding = (item.referencedClauseIds && item.referencedClauseIds.length > 0) ||
                    (item.citations && item.citations.length > 0 &&
                     item.citations.some(c => c.clause_id || (c.pageNumber && c.pageNumber > 0)));
                  const itemBlocked = item.clauseRetrievalBlocked ||
                    (!hasClauseBinding && item.eligibilityStatus?.includes("Deferred"));

                  return (
                    <button
                      key={item.itemNumber}
                      onClick={() => onItemSelect?.(index)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                        "hover:bg-muted/50",
                        selectedItemIndex === index && "bg-primary/10 border border-primary/20",
                        itemBlocked && "border-l-2 border-l-destructive"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-6 h-6 rounded text-xs font-semibold shrink-0",
                        itemBlocked ? "bg-destructive/10 text-destructive" : "bg-muted"
                      )}>
                        {itemBlocked ? <Ban className="h-3 w-3" /> : item.itemNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.itemName}</p>
                        <p className={cn(
                          "text-xs",
                          itemBlocked ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {itemBlocked ? "No policy clause found" : `${item.citations.length} citation(s)`}
                        </p>
                      </div>
                      {itemBlocked ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                                <ShieldAlert className="h-3 w-3" />
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-sm">No policy clause found</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <ConfidenceBadge level={item.confidence} size="sm" showLabel={false} />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Evidence Panel (DOMINANT - ≥50% width) */}
        <Card className={cn(
          "h-full overflow-hidden",
          isBlocked && "border-2 border-destructive"
        )}>
          <CardHeader className={cn(
            "pb-3 border-b",
            isBlocked && "bg-destructive/5"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={cn(
                  "text-lg flex items-center gap-2",
                  isBlocked && "text-destructive"
                )}>
                  {isBlocked ? (
                    <ShieldAlert className="h-5 w-5 text-destructive" />
                  ) : (
                    <BookOpen className="h-5 w-5 text-primary" />
                  )}
                  {selectedItem?.itemName || "Select an item"}
                </CardTitle>
                <CardDescription>
                  {isBlocked
                    ? "No Policy Clause Retrieved"
                    : "Evidence and Citations"
                  }
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isBlocked && (
                  <Badge variant="destructive" className="gap-1">
                    <Ban className="h-3 w-3" />
                    Blocked
                  </Badge>
                )}
                {selectedItem && !isBlocked && (
                  <ConfidenceBadge level={selectedItem.confidence} size="md" />
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 h-[calc(100%-80px)]">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-6">
                {!selectedItem ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <FileSearch className="h-12 w-12 mb-4 opacity-50" />
                    <p>Select an item to view evidence</p>
                  </div>
                ) : (
                  <>
                    {/* Citations Section */}
                    <div>
                      <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-primary">
                        <Quote className="h-4 w-4" />
                        Policy Citations
                      </h4>

                      {isBlocked ? (
                        /* ═══════════════════════════════════════════════════════════════
                           CASE B: CLAUSE NOT FOUND — BLOCKED STATE (MANDATORY DISPLAY)
                           ═══════════════════════════════════════════════════════════════ */
                        <div className="space-y-4">
                          <div className="p-6 rounded-lg bg-destructive/10 border-2 border-destructive flex flex-col items-center justify-center text-center">
                            <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
                            <h4 className="text-lg font-bold text-destructive mb-2">
                              🚫 No Applicable Policy Clause Retrieved
                            </h4>
                            <div className="w-full p-4 bg-background/50 rounded border border-destructive/20 text-left">
                              <p className="text-sm text-muted-foreground mb-2">
                                <strong>This item cannot be evaluated until the following are found:</strong>
                              </p>
                              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                <li>Relevant policy article</li>
                                <li>Page number</li>
                                <li>Clause text</li>
                              </ul>
                            </div>
                          </div>

                          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                            <div className="flex items-start gap-3">
                              <Info className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-warning">
                                  Admin Attention Required
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  A relevant policy clause must be indexed in the Policy Library before this item can be evaluated.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-3 rounded bg-muted/50 border">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Decision Status
                            </p>
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                              ⚠️ Decision Deferred — Policy Clause Not Found
                            </Badge>
                          </div>
                        </div>
                      ) : selectedItem.citations.length === 0 ? (
                        <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-warning">
                              No Evidence Found
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              No policy citation was found for this item.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {selectedItem.citations.map((citation, i) => (
                            <div
                              key={i}
                              className="p-4 rounded-lg border bg-card hover:shadow-soft transition-shadow"
                            >
                              {/* Citation header with clause_id */}
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  {citation.clause_id && (
                                    <Badge variant="default" className="text-xs bg-primary/90">
                                      🔗 {citation.clause_id}
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="text-xs">
                                    📘 {citation.documentName}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    📄 {citation.articleSection}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-muted">
                                    Page {citation.pageNumber}
                                  </Badge>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Highlighted quote */}
                              {citation.quote && (
                                <div className="relative pl-4 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg py-2 pr-3">
                                  <Quote className="absolute -left-3 -top-1 h-5 w-5 text-primary/50 bg-card" />
                                  <p className="text-sm italic text-foreground/90 leading-relaxed">
                                    "{citation.quote}"
                                  </p>
                                </div>
                              )}

                              {/* Relevance explanation */}
                              {citation.relevance && (
                                <p className="text-xs text-primary mt-3 font-medium">
                                  ➜ {citation.relevance}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Essentiality Analysis Section */}
                    {selectedItem.essentialityAnalysis && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-semibold mb-4 text-primary">
                          🧠 Essentiality Analysis
                        </h4>

                        <div className="grid gap-3">
                          {[
                            { key: "functionalNecessity", label: "Functional Necessity" },
                            { key: "operationalLink", label: "Operational Link" },
                            { key: "capitalNature", label: "Capital Nature" },
                            { key: "noProhibition", label: "No Prohibition" },
                          ].map((field) => {
                            const value = selectedItem.essentialityAnalysis?.[field.key as keyof EssentialityAnalysis];
                            if (!value) return null;

                            return (
                              <div
                                key={field.key}
                                className="p-3 rounded-lg bg-muted/30 border"
                              >
                                <p className="text-xs font-semibold text-muted-foreground mb-1">
                                  {field.label}
                                </p>
                                <p className="text-sm">{value}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EvidenceReviewStep;
