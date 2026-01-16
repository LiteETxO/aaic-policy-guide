import React, { useState } from "react";
import { 
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, FileText, Scale, 
  AlertCircle, BookOpen, Quote, ChevronDown, ChevronRight, ExternalLink,
  ClipboardList, AlertOctagon
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type ComplianceStatus = "Compliant" | "Conditional" | "Needs Clarification" | "Non-Compliant";

interface Citation {
  documentName: string;
  articleSection: string;
  pageNumber: number;
  quote: string;
  relevance: string;
}

interface ReasoningPoint {
  point: string;
  type: "match" | "assumption-avoided" | "ambiguity";
}

interface ComplianceItem {
  itemNumber: number;
  invoiceItem: string;
  normalizedName: string;
  invoiceRef?: string;
  licenseAlignment: ComplianceStatus;
  licenseEvidence: string;
  policyCompliance: ComplianceStatus;
  citations: Citation[];
  reasoning: ReasoningPoint[];
}

interface ActionItem {
  type: "missing" | "unreadable" | "conflict" | "policy-gap";
  description: string;
  severity: "high" | "medium" | "low";
}

interface AnalysisData {
  executiveSummary?: {
    overallStatus: string;
    topIssues: string[];
    additionalInfoNeeded: string[];
  };
  licenseSnapshot?: {
    licensedActivity: string;
    sector: string;
    scopeOfOperation: string;
    restrictions: string;
    licenseNumber: string;
    issueDate: string;
  };
  complianceItems?: ComplianceItem[];
  officerActionsNeeded?: ActionItem[];
  rawResponse?: string;
  parseError?: boolean;
}

interface AnalysisResultsProps {
  data?: AnalysisData;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string; bgColor: string }> = {
  "Compliant": { icon: CheckCircle2, color: "text-success", label: "Compliant", bgColor: "bg-success/10" },
  "Conditional": { icon: AlertTriangle, color: "text-warning", label: "Conditional", bgColor: "bg-warning/10" },
  "Needs Clarification": { icon: HelpCircle, color: "text-blue-500", label: "Needs Clarification", bgColor: "bg-blue-500/10" },
  "Non-Compliant": { icon: XCircle, color: "text-destructive", label: "Non-Compliant", bgColor: "bg-destructive/10" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = statusConfig[status] || statusConfig["Needs Clarification"];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", config.bgColor, config.color)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
};

const CitationCard = ({ citation }: { citation: Citation }) => (
  <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2">
    <div className="flex items-start gap-2">
      <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{citation.documentName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="font-medium text-foreground">{citation.articleSection}</span>
          <span>•</span>
          <span>Page {citation.pageNumber}</span>
        </div>
      </div>
    </div>
    <div className="flex gap-2 pl-6">
      <Quote className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
      <p className="text-xs text-muted-foreground italic leading-relaxed">"{citation.quote}"</p>
    </div>
    <p className="text-xs text-primary/80 pl-6">{citation.relevance}</p>
  </div>
);

const AnalysisResults = ({ data }: AnalysisResultsProps) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  // Handle parse error or raw response
  if (data?.parseError && data?.rawResponse) {
    return (
      <section className="py-16 bg-muted/20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Analysis Results</h2>
            <p className="text-muted-foreground">Raw AI Response (parsing failed)</p>
          </div>
          <Card className="max-w-4xl mx-auto">
            <CardContent className="py-6">
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                {data.rawResponse}
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  const complianceItems = data?.complianceItems || [];
  const executiveSummary = data?.executiveSummary;
  const licenseSnapshot = data?.licenseSnapshot;
  const officerActionsNeeded = data?.officerActionsNeeded || [];

  const compliantCount = complianceItems.filter(item => item.policyCompliance === "Compliant").length;
  const conditionalCount = complianceItems.filter(item => item.policyCompliance === "Conditional").length;
  const clarificationCount = complianceItems.filter(item => item.policyCompliance === "Needs Clarification").length;
  const nonCompliantCount = complianceItems.filter(item => item.policyCompliance === "Non-Compliant").length;
  const totalCount = complianceItems.length;

  const toggleRow = (id: number) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const getOverallStatusColor = () => {
    const status = executiveSummary?.overallStatus || "";
    if (status.includes("Non-Compliant")) return "text-destructive";
    if (status.includes("Mixed")) return "text-warning";
    if (status.includes("Compliant")) return "text-success";
    return "text-muted-foreground";
  };

  const allCitations = complianceItems.flatMap(item => 
    (item.citations || []).map(c => ({ ...c, itemName: item.normalizedName }))
  );

  return (
    <section className="py-16 bg-muted/20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Analysis Results</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Policy-anchored compliance assessment with traceable citations from the Policy Library.
          </p>
          <p className="text-sm text-muted-foreground mt-2">የትንተና ውጤቶች • ሊከታተሉ የሚችሉ ማጣቀሻዎች</p>
        </div>

        {/* Executive Decision Summary */}
        {executiveSummary && (
          <Card className="max-w-4xl mx-auto mb-8 border-l-4 border-l-primary shadow-medium animate-fade-in">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                <CardTitle>Executive Decision Summary</CardTitle>
              </div>
              <CardDescription>High-level assessment for officer review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-background border">
                  <p className={cn("text-xl font-bold mb-1", getOverallStatusColor())}>
                    {executiveSummary.overallStatus}
                  </p>
                  <p className="text-xs text-muted-foreground">Overall Status</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-2xl font-bold text-success mb-1">{compliantCount}</p>
                  <p className="text-xs text-muted-foreground">Compliant</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-2xl font-bold text-warning mb-1">{conditionalCount + clarificationCount}</p>
                  <p className="text-xs text-muted-foreground">Need Review</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-2xl font-bold text-destructive mb-1">{nonCompliantCount}</p>
                  <p className="text-xs text-muted-foreground">Non-Compliant</p>
                </div>
              </div>

              {executiveSummary.topIssues && executiveSummary.topIssues.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    Top Issues
                  </h4>
                  <ul className="space-y-2">
                    {executiveSummary.topIssues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {executiveSummary.additionalInfoNeeded && executiveSummary.additionalInfoNeeded.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-500" />
                    Additional Information Needed
                  </h4>
                  <ul className="space-y-2">
                    {executiveSummary.additionalInfoNeeded.map((info, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <HelpCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <span>{info}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* License Snapshot */}
        {licenseSnapshot && (
          <Card className="max-w-4xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: "100ms" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">License Snapshot</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Licensed Activity</p>
                  <p className="text-sm font-medium">{licenseSnapshot.licensedActivity || "Not specified"}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sector</p>
                  <p className="text-sm font-medium">{licenseSnapshot.sector || "Not specified"}</p>
                </div>
                {licenseSnapshot.licenseNumber && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">License Number</p>
                    <p className="text-sm font-mono">{licenseSnapshot.licenseNumber}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scope/Restrictions</p>
                  <p className="text-sm text-muted-foreground">{licenseSnapshot.restrictions || licenseSnapshot.scopeOfOperation || "None specified"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Itemized Compliance Table */}
        {complianceItems.length > 0 && (
          <Card className="max-w-6xl mx-auto mb-8 shadow-medium animate-fade-in" style={{ animationDelay: "200ms" }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <CardTitle>Itemized Compliance Table</CardTitle>
              </div>
              <CardDescription>Click any row to view citations and detailed reasoning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="font-semibold">Item #</TableHead>
                      <TableHead className="font-semibold">Invoice Item</TableHead>
                      <TableHead className="font-semibold">Normalized Name</TableHead>
                      <TableHead className="font-semibold">License</TableHead>
                      <TableHead className="font-semibold">Policy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceItems.map((item, index) => (
                      <React.Fragment key={item.itemNumber}>
                        <TableRow 
                          key={item.itemNumber}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50 transition-colors animate-fade-in",
                            expandedRows.includes(item.itemNumber) && "bg-muted/30"
                          )}
                          style={{ animationDelay: `${300 + index * 50}ms` }}
                          onClick={() => toggleRow(item.itemNumber)}
                        >
                          <TableCell className="w-10">
                            {expandedRows.includes(item.itemNumber) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.itemNumber}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{item.invoiceItem}</TableCell>
                          <TableCell className="font-medium">{item.normalizedName}</TableCell>
                          <TableCell><StatusBadge status={item.licenseAlignment} /></TableCell>
                          <TableCell><StatusBadge status={item.policyCompliance} /></TableCell>
                        </TableRow>
                        {expandedRows.includes(item.itemNumber) && (
                          <TableRow key={`${item.itemNumber}-details`}>
                            <TableCell colSpan={6} className="bg-muted/20 p-0">
                              <div className="p-6 space-y-6">
                                {/* License Evidence */}
                                <div>
                                  <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    License Evidence
                                  </h5>
                                  <p className="text-sm text-muted-foreground bg-background p-3 rounded border">
                                    {item.licenseEvidence}
                                  </p>
                                </div>

                                {/* Citations */}
                                {item.citations && item.citations.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                      <BookOpen className="h-4 w-4 text-primary" />
                                      Policy Citations ({item.citations.length})
                                    </h5>
                                    <div className="space-y-3">
                                      {item.citations.map((citation, i) => (
                                        <CitationCard key={i} citation={citation} />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Reasoning */}
                                {item.reasoning && item.reasoning.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                      <Scale className="h-4 w-4 text-primary" />
                                      Reasoning
                                    </h5>
                                    <ul className="space-y-2">
                                      {item.reasoning.map((r, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                          {r.type === "match" && <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />}
                                          {r.type === "assumption-avoided" && <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />}
                                          {r.type === "ambiguity" && <HelpCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />}
                                          <span>{r.point}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evidence & Citations Panel */}
        {allCitations.length > 0 && (
          <Card className="max-w-4xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle>Evidence & Citations Panel</CardTitle>
              </div>
              <CardDescription>All policy clauses referenced in this analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                {allCitations.map((citation, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`citation-${index}`}
                    className="border rounded-lg px-4 bg-background"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        <Badge variant="outline" className="shrink-0">{citation.articleSection}</Badge>
                        <span className="text-sm font-medium">{citation.documentName}</span>
                        <span className="text-xs text-muted-foreground">p.{citation.pageNumber}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-2">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Quote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-sm italic text-muted-foreground">"{citation.quote}"</p>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <ExternalLink className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">Applied to: </span>
                            <span className="text-muted-foreground">{citation.itemName}</span>
                          </div>
                        </div>
                        <p className="text-sm text-primary/80 pl-6">{citation.relevance}</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Officer Action Needed */}
        {officerActionsNeeded.length > 0 && (
          <Card className="max-w-4xl mx-auto mb-8 border-warning/50 animate-fade-in" style={{ animationDelay: "400ms" }}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-warning" />
                <CardTitle>Officer Action Needed</CardTitle>
              </div>
              <CardDescription>Items requiring additional verification or documentation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {officerActionsNeeded.map((action, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border",
                      action.severity === "high" && "bg-destructive/5 border-destructive/20",
                      action.severity === "medium" && "bg-warning/5 border-warning/20",
                      action.severity === "low" && "bg-muted/50"
                    )}
                  >
                    {action.type === "missing" && <FileText className="h-5 w-5 text-warning shrink-0" />}
                    {action.type === "conflict" && <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />}
                    {action.type === "unreadable" && <HelpCircle className="h-5 w-5 text-blue-500 shrink-0" />}
                    {action.type === "policy-gap" && <BookOpen className="h-5 w-5 text-muted-foreground shrink-0" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs capitalize",
                            action.severity === "high" && "border-destructive text-destructive",
                            action.severity === "medium" && "border-warning text-warning"
                          )}
                        >
                          {action.severity} priority
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {action.type.replace("-", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm">{action.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advisory Notice */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-primary/5 border-primary/20 animate-fade-in" style={{ animationDelay: "500ms" }}>
            <CardContent className="flex items-start gap-4 py-6">
              <div className="h-10 w-10 rounded-lg gradient-hero flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Advisory Notice — Interpretation is Non-Binding</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This analysis is grounded strictly in the configured Policy Library and uploaded case documents. 
                  Every compliance statement includes traceable citations (document, article, page, quote). 
                  Final authority for compliance determination rests with the AAIC officer.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  ይህ ትንተና የውሳኔ ድጋፍ ብቻ ነው። ሁሉም ማጣቀሻዎች ሊከታተሉ ይችላሉ። የመጨረሻ ስልጣን ከAAIC ባለስልጣን ጋር ነው።
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default AnalysisResults;
