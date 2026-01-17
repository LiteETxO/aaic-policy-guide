import { FileSearch, BookOpen, Quote, ExternalLink, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ConfidenceBadge, type ConfidenceLevel } from "@/components/gamification";

interface Citation {
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
}

interface EvidenceReviewStepProps {
  evidenceItems: EvidenceItem[];
  selectedItemIndex?: number;
  onItemSelect?: (index: number) => void;
}

/**
 * Step 4 — Evidence Review (VISUAL PRIORITY)
 * 
 * When an item card is expanded:
 * - Evidence panel becomes dominant (≥50% width)
 * - Policy clauses are highlighted
 * - Page numbers shown
 * - Essentiality reasoning is step-by-step
 * - Confidence badge shown prominently
 * 
 * Rule: Evidence must visually outweigh conclusions.
 */
const EvidenceReviewStep = ({
  evidenceItems,
  selectedItemIndex = 0,
  onItemSelect,
}: EvidenceReviewStepProps) => {
  const selectedItem = evidenceItems[selectedItemIndex] || evidenceItems[0];

  return (
    <div className="p-6 lg:p-8 h-full">
      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileSearch className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">ማስረጃ ግምገማ (Evidence Review)</h2>
            <p className="text-sm text-muted-foreground">
              ማስረጃዎችን እና ጥቅሶችን ያረጋግጡ ከውሳኔ በፊት
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout: Item List + Evidence Panel */}
      <div className="grid lg:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-280px)]">
        {/* Left: Item selector */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">ዕቃዎች (Items)</CardTitle>
            <CardDescription className="text-xs">
              ለመገምገም ዕቃ ይምረጡ
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="p-2 space-y-1">
                {evidenceItems.map((item, index) => (
                  <button
                    key={item.itemNumber}
                    onClick={() => onItemSelect?.(index)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      "hover:bg-muted/50",
                      selectedItemIndex === index && "bg-primary/10 border border-primary/20"
                    )}
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-xs font-semibold shrink-0">
                      {item.itemNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.itemName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.citations.length} ማስረጃዎች
                      </p>
                    </div>
                    <ConfidenceBadge level={item.confidence} size="sm" showLabel={false} />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Evidence Panel (DOMINANT - ≥50% width) */}
        <Card className="h-full overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {selectedItem?.itemName || "ዕቃ ይምረጡ"}
                </CardTitle>
                <CardDescription>
                  ማስረጃዎች እና ጥቅሶች (Evidence and Citations)
                </CardDescription>
              </div>
              {selectedItem && (
                <ConfidenceBadge level={selectedItem.confidence} size="md" />
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0 h-[calc(100%-80px)]">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-6">
                {!selectedItem ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <FileSearch className="h-12 w-12 mb-4 opacity-50" />
                    <p>ዕቃ ይምረጡ ማስረጃዎችን ለማየት</p>
                    <p className="text-sm">(Select an item to view evidence)</p>
                  </div>
                ) : (
                  <>
                    {/* Citations Section */}
                    <div>
                      <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-primary">
                        <Quote className="h-4 w-4" />
                        ፖሊሲ ጥቅሶች (Policy Citations)
                      </h4>

                      {selectedItem.citations.length === 0 ? (
                        <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-warning">
                              ማስረጃ አልተገኘም (No Evidence Found)
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ለዚህ ዕቃ ምንም የፖሊሲ ጥቅስ አልተገኘም።
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
                              {/* Citation header */}
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex items-center gap-2">
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
                          🧠 የአስፈላጊነት ትንተና (Essentiality Analysis)
                        </h4>

                        <div className="grid gap-3">
                          {[
                            { key: "functionalNecessity", label: "ተግባራዊ አስፈላጊነት", labelEn: "Functional Necessity" },
                            { key: "operationalLink", label: "ተግባራዊ ትስስር", labelEn: "Operational Link" },
                            { key: "capitalNature", label: "የካፒታል ባህሪ", labelEn: "Capital Nature" },
                            { key: "noProhibition", label: "እገዳ የለም", labelEn: "No Prohibition" },
                          ].map((field) => {
                            const value = selectedItem.essentialityAnalysis?.[field.key as keyof EssentialityAnalysis];
                            if (!value) return null;

                            return (
                              <div
                                key={field.key}
                                className="p-3 rounded-lg bg-muted/30 border"
                              >
                                <p className="text-xs font-semibold text-muted-foreground mb-1">
                                  {field.label} ({field.labelEn})
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
