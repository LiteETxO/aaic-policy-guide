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
import { useState } from "react";

type ComplianceStatus = "compliant" | "conditional" | "clarification" | "non-compliant";

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
  id: number;
  invoiceItem: string;
  normalizedName: string;
  invoiceRef: string;
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

const sampleData: ComplianceItem[] = [
  {
    id: 1,
    invoiceItem: "CNC Lathe Machine Model XR-500",
    normalizedName: "Industrial CNC Lathe",
    invoiceRef: "INV-2024-0042",
    licenseAlignment: "compliant",
    licenseEvidence: "License Section 3.1: 'Metal fabrication and precision machining operations'",
    policyCompliance: "compliant",
    citations: [
      {
        documentName: "Capital Goods Import Guidelines",
        articleSection: "Article 7.2.1",
        pageNumber: 18,
        quote: "Computer-controlled machining equipment used directly in licensed manufacturing activities qualifies as eligible capital goods.",
        relevance: "Directly defines CNC equipment as eligible capital goods for manufacturing licenses.",
      },
    ],
    reasoning: [
      { point: "CNC lathe is explicitly listed under 'computer-controlled machining equipment' in Article 7.2.1", type: "match" },
      { point: "License activity 'precision machining' directly matches equipment purpose", type: "match" },
      { point: "Did not assume general manufacturing would include machining — verified against license wording", type: "assumption-avoided" },
    ],
  },
  {
    id: 2,
    invoiceItem: "Executive Office Desk Set (5 pieces)",
    normalizedName: "Office Furniture",
    invoiceRef: "INV-2024-0042",
    licenseAlignment: "conditional",
    licenseEvidence: "License scope limited to 'manufacturing operations' — administrative support unclear",
    policyCompliance: "conditional",
    citations: [
      {
        documentName: "Capital Goods Import Guidelines",
        articleSection: "Article 12.3",
        pageNumber: 31,
        quote: "Office equipment and furniture may qualify only when directly supporting licensed operational activities and not exceeding 10% of total capital goods value.",
        relevance: "Sets conditional eligibility for office furniture with percentage cap.",
      },
      {
        documentName: "Investment Incentives Directive",
        articleSection: "Article 5.4.2",
        pageNumber: 14,
        quote: "Administrative support items require documented justification linking to core licensed activity.",
        relevance: "Requires officer to verify justification documentation.",
      },
    ],
    reasoning: [
      { point: "Office furniture has conditional eligibility per Article 12.3 of Capital Goods Guidelines", type: "match" },
      { point: "Must verify total value does not exceed 10% cap", type: "ambiguity" },
      { point: "Justification document linking to manufacturing operations not provided", type: "ambiguity" },
    ],
  },
  {
    id: 3,
    invoiceItem: "Toyota Hilux 4WD Pickup (2024 Model)",
    normalizedName: "Commercial Vehicle",
    invoiceRef: "INV-2024-0043",
    licenseAlignment: "clarification",
    licenseEvidence: "License does not specify transportation or logistics as part of operations",
    policyCompliance: "clarification",
    citations: [
      {
        documentName: "Capital Goods Import Guidelines",
        articleSection: "Article 9.1",
        pageNumber: 24,
        quote: "Vehicles qualify as capital goods only when essential for licensed activity operations, such as construction, mining, or agricultural transport.",
        relevance: "Establishes vehicle eligibility criteria based on operational necessity.",
      },
    ],
    reasoning: [
      { point: "Vehicle eligibility depends on 'essential for licensed activity' — manufacturing license unclear on transport needs", type: "ambiguity" },
      { point: "License does not list logistics, delivery, or field operations", type: "match" },
      { point: "Did not assume vehicle is for personal use — awaiting investor clarification", type: "assumption-avoided" },
    ],
  },
  {
    id: 4,
    invoiceItem: "Samsung 65-inch Smart TV",
    normalizedName: "Consumer Electronics",
    invoiceRef: "INV-2024-0043",
    licenseAlignment: "non-compliant",
    licenseEvidence: "No alignment with licensed manufacturing activity",
    policyCompliance: "non-compliant",
    citations: [
      {
        documentName: "Capital Goods Import Guidelines",
        articleSection: "Article 4.1.3",
        pageNumber: 9,
        quote: "Consumer electronics intended for personal or non-operational use are explicitly excluded from capital goods eligibility.",
        relevance: "Direct exclusion of consumer electronics from capital goods definition.",
      },
      {
        documentName: "Eligible Capital Equipment List",
        articleSection: "Annex B, Section 2",
        pageNumber: 45,
        quote: "Television and entertainment equipment: Not eligible unless for approved training facility.",
        relevance: "Confirms exclusion with narrow exception not applicable here.",
      },
    ],
    reasoning: [
      { point: "Consumer electronics explicitly excluded per Article 4.1.3", type: "match" },
      { point: "No training facility approval found in license documentation", type: "match" },
      { point: "Did not assume TV could be used for operational displays — policy exclusion is clear", type: "assumption-avoided" },
    ],
  },
];

const actionItems: ActionItem[] = [
  {
    type: "missing",
    description: "Office furniture justification document not provided — required per Article 5.4.2",
    severity: "medium",
  },
  {
    type: "conflict",
    description: "Vehicle purpose unclear — license scope does not include transportation/logistics",
    severity: "high",
  },
];

const statusConfig: Record<ComplianceStatus, { icon: React.ElementType; color: string; label: string; bgColor: string }> = {
  compliant: { icon: CheckCircle2, color: "text-success", label: "Compliant", bgColor: "bg-success/10" },
  conditional: { icon: AlertTriangle, color: "text-warning", label: "Conditional", bgColor: "bg-warning/10" },
  clarification: { icon: HelpCircle, color: "text-blue-500", label: "Needs Clarification", bgColor: "bg-blue-500/10" },
  "non-compliant": { icon: XCircle, color: "text-destructive", label: "Non-Compliant", bgColor: "bg-destructive/10" },
};

const StatusBadge = ({ status }: { status: ComplianceStatus }) => {
  const config = statusConfig[status];
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

const AnalysisResults = () => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  
  const compliantCount = sampleData.filter(item => item.policyCompliance === "compliant").length;
  const conditionalCount = sampleData.filter(item => item.policyCompliance === "conditional").length;
  const clarificationCount = sampleData.filter(item => item.policyCompliance === "clarification").length;
  const nonCompliantCount = sampleData.filter(item => item.policyCompliance === "non-compliant").length;
  const totalCount = sampleData.length;

  const toggleRow = (id: number) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const getOverallStatus = () => {
    if (nonCompliantCount > 0) return { status: "Mixed", color: "text-warning" };
    if (clarificationCount > 0) return { status: "Mixed", color: "text-warning" };
    if (conditionalCount > 0) return { status: "Likely Compliant", color: "text-success" };
    return { status: "Likely Compliant", color: "text-success" };
  };

  const allCitations = sampleData.flatMap(item => 
    item.citations.map(c => ({ ...c, itemName: item.normalizedName }))
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
                <p className="text-2xl font-bold mb-1">
                  <span className={getOverallStatus().color}>{getOverallStatus().status}</span>
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

            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                Top Issues
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span>Consumer electronics (TV) explicitly excluded under Article 4.1.3</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <HelpCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>Vehicle purpose unclear — license does not specify transport operations</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span>Office furniture requires justification document per Article 5.4.2</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* License Snapshot */}
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
                <p className="text-sm font-medium">Metal fabrication and precision machining operations</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sector</p>
                <p className="text-sm font-medium">Industrial Manufacturing</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">License Number</p>
                <p className="text-sm font-mono">AAIC-2024-MFG-00847</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scope Restrictions</p>
                <p className="text-sm text-muted-foreground">None specified — limited to manufacturing operations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itemized Compliance Table */}
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
                  {sampleData.map((item, index) => (
                    <>
                      <TableRow 
                        key={item.id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50 transition-colors animate-fade-in",
                          expandedRows.includes(item.id) && "bg-muted/30"
                        )}
                        style={{ animationDelay: `${300 + index * 50}ms` }}
                        onClick={() => toggleRow(item.id)}
                      >
                        <TableCell className="w-10">
                          {expandedRows.includes(item.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.id}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{item.invoiceItem}</TableCell>
                        <TableCell className="font-medium">{item.normalizedName}</TableCell>
                        <TableCell><StatusBadge status={item.licenseAlignment} /></TableCell>
                        <TableCell><StatusBadge status={item.policyCompliance} /></TableCell>
                      </TableRow>
                      {expandedRows.includes(item.id) && (
                        <TableRow key={`${item.id}-details`}>
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

                              {/* Reasoning */}
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
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Evidence & Citations Panel */}
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

        {/* Officer Action Needed */}
        {actionItems.length > 0 && (
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
                {actionItems.map((action, index) => (
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
