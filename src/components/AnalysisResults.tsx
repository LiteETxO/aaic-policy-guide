import React, { useState } from "react";
import { 
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, FileText, Scale, 
  AlertCircle, BookOpen, Quote, ChevronDown, ChevronRight, ExternalLink,
  ClipboardList, AlertOctagon, FileCheck, FileWarning
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// Types matching the new AI output format
type EligibilityStatus = 
  | "Eligible – Listed Capital Good" 
  | "Eligible – Listed Capital Good (Mapped)" 
  | "Eligible – Essential Capital Good (Not Listed)" 
  | "Requires Clarification" 
  | "Not Eligible";

type LicenseAlignment = "Aligned" | "Conditional" | "Needs Clarification" | "Not Aligned";

interface Citation {
  documentName: string;
  articleSection: string;
  pageNumber: number;
  quote: string;
  relevance: string;
}

interface MatchCandidate {
  policyEntry: string;
  similarities: string;
  differences: string;
  confidence: "High" | "Medium" | "Low";
}

interface ReasoningPoint {
  point: string;
  type: "listed-match" | "mapped-match" | "essential-inclusion" | "exclusion" | "ambiguity" | "match" | "assumption-avoided";
}

interface EssentialityAnalysis {
  functionalNecessity: string;
  operationalLink: string;
  capitalNature: string;
  noProhibition: string;
}

interface ComplianceItem {
  itemNumber: number;
  invoiceItem: string;
  normalizedName: string;
  category?: string;
  specs?: string;
  invoiceRef?: string;
  matchResult?: "Exact" | "Mapped" | "Not Matched";
  matchCandidates?: MatchCandidate[];
  eligibilityStatus?: EligibilityStatus;
  eligibilityPath?: string;
  licenseAlignment: LicenseAlignment;
  licenseEvidence: string;
  citations: Citation[];
  essentialityAnalysis?: EssentialityAnalysis;
  reasoning: ReasoningPoint[];
  // Legacy support
  policyCompliance?: string;
}

interface DocumentComprehension {
  gateStatus: "PASSED" | "BLOCKED";
  blockedReason?: string | null;
  documents?: Array<{
    documentName: string;
    documentType: string;
    languagesDetected?: string[];
    pageCount?: number;
    ocrConfidence?: string;
    keySectionsDetected?: string[];
    unreadablePages?: number[];
    readStatus?: string;
  }>;
  policyIndex?: Array<{
    documentName: string;
    articleSection: string;
    pageNumber: number;
    clauseHeading: string;
    scopeOfApplication: string;
    keywords: string[];
  }>;
  licenseUnderstanding?: {
    licensedActivity: string;
    scopeLimitations: string;
    conditions: string;
    extractionStatus: string;
  };
  invoiceUnderstanding?: {
    totalLineItems: number;
    itemsWithSpecs: number;
    ambiguousItems: number;
    readabilityStatus: string;
  };
  analysisPermissionStatement?: string;
}

interface ActionItem {
  type: "missing" | "unreadable" | "conflict" | "policy-gap" | "missing-evidence" | "ambiguous-mapping" | "document-ingestion-blocked";
  description: string;
  severity: "high" | "medium" | "low";
  relatedItems?: number[];
}

interface AnalysisData {
  documentComprehension?: DocumentComprehension;
  executiveSummary?: {
    overallStatus: string;
    eligibleCount?: number;
    clarificationCount?: number;
    notEligibleCount?: number;
    topIssues: string[];
    additionalInfoNeeded: string[];
  };
  licenseSnapshot?: {
    licensedActivity: string;
    sector: string;
    scopeOfOperation: string;
    restrictions: string;
    licenseNumber?: string;
    issueDate?: string;
  };
  complianceItems?: ComplianceItem[];
  officerActionsNeeded?: ActionItem[];
  rawResponse?: string;
  parseError?: boolean;
}

interface AnalysisResultsProps {
  data?: AnalysisData;
}

// Eligibility status config (Amharic-first)
const eligibilityConfig: Record<string, { icon: React.ElementType; color: string; label: string; bgColor: string }> = {
  "Eligible – Listed Capital Good": { icon: CheckCircle2, color: "text-success", label: "ብቁ - ዝርዝር (Eligible - Listed)", bgColor: "bg-success/10" },
  "Eligible – Listed Capital Good (Mapped)": { icon: CheckCircle2, color: "text-success", label: "ብቁ - ተዛምዷል (Eligible - Mapped)", bgColor: "bg-success/10" },
  "Eligible – Essential Capital Good (Not Listed)": { icon: CheckCircle2, color: "text-emerald-600", label: "ብቁ - አስፈላጊ (Eligible - Essential)", bgColor: "bg-emerald-500/10" },
  "Requires Clarification": { icon: HelpCircle, color: "text-blue-500", label: "ማብራሪያ ያስፈልጋል (Needs Clarification)", bgColor: "bg-blue-500/10" },
  "Not Eligible": { icon: XCircle, color: "text-destructive", label: "ብቁ አይደለም (Not Eligible)", bgColor: "bg-destructive/10" },
};

// License alignment config (Amharic-first)
const licenseConfig: Record<string, { icon: React.ElementType; color: string; label: string; bgColor: string }> = {
  "Aligned": { icon: CheckCircle2, color: "text-success", label: "ተስማምቷል (Aligned)", bgColor: "bg-success/10" },
  "Conditional": { icon: AlertTriangle, color: "text-warning", label: "ቅድመ ሁኔታ (Conditional)", bgColor: "bg-warning/10" },
  "Needs Clarification": { icon: HelpCircle, color: "text-blue-500", label: "ማብራሪያ ያስፈልጋል (Needs Clarification)", bgColor: "bg-blue-500/10" },
  "Not Aligned": { icon: XCircle, color: "text-destructive", label: "አልተስማማም (Not Aligned)", bgColor: "bg-destructive/10" },
};

// Legacy status config (Amharic-first)
const legacyStatusConfig: Record<string, { icon: React.ElementType; color: string; label: string; bgColor: string }> = {
  "Compliant": { icon: CheckCircle2, color: "text-success", label: "ተገዢ (Compliant)", bgColor: "bg-success/10" },
  "Conditional": { icon: AlertTriangle, color: "text-warning", label: "ቅድመ ሁኔታ (Conditional)", bgColor: "bg-warning/10" },
  "Needs Clarification": { icon: HelpCircle, color: "text-blue-500", label: "ማብራሪያ ያስፈልጋል (Needs Clarification)", bgColor: "bg-blue-500/10" },
  "Non-Compliant": { icon: XCircle, color: "text-destructive", label: "ተገዢ አይደለም (Non-Compliant)", bgColor: "bg-destructive/10" },
};

const EligibilityBadge = ({ status }: { status?: string }) => {
  if (!status) return <Badge variant="outline" className="text-muted-foreground">Unknown</Badge>;
  const config = eligibilityConfig[status] || legacyStatusConfig[status] || { icon: HelpCircle, color: "text-muted-foreground", label: status, bgColor: "bg-muted" };
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium text-xs", config.bgColor, config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

const LicenseBadge = ({ status }: { status?: string }) => {
  if (!status) return <Badge variant="outline" className="text-muted-foreground">Unknown</Badge>;
  const config = licenseConfig[status] || legacyStatusConfig[status] || { icon: HelpCircle, color: "text-muted-foreground", label: status, bgColor: "bg-muted" };
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium text-xs", config.bgColor, config.color)}>
      <Icon className="h-3 w-3" />
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
  const documentComprehension = data?.documentComprehension;
  const officerActionsNeeded = data?.officerActionsNeeded || [];

  // Calculate counts from new format (eligibilityStatus) or use executive summary counts
  const eligibleCount = executiveSummary?.eligibleCount ?? complianceItems.filter(item => 
    item.eligibilityStatus?.startsWith("Eligible") || item.policyCompliance === "Compliant"
  ).length;
  const clarificationCount = executiveSummary?.clarificationCount ?? complianceItems.filter(item => 
    item.eligibilityStatus === "Requires Clarification" || item.policyCompliance === "Needs Clarification" || item.policyCompliance === "Conditional"
  ).length;
  const notEligibleCount = executiveSummary?.notEligibleCount ?? complianceItems.filter(item => 
    item.eligibilityStatus === "Not Eligible" || item.policyCompliance === "Non-Compliant"
  ).length;
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
          <h2 className="text-3xl font-bold mb-3">የትንተና ውጤቶች (Analysis Results)</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            በፖሊሲ ላይ የተመሰረተ የብቁነት ግምገማ ከሊከታተሉ የሚችሉ ማጣቀሻዎች ጋር
          </p>
          <p className="text-sm text-muted-foreground mt-2">(Policy-anchored compliance assessment with traceable citations)</p>
        </div>

        {/* Document Comprehension Gate Status */}
        {documentComprehension && (
          <Card className={cn(
            "max-w-4xl mx-auto mb-8 border-l-4 animate-fade-in",
            documentComprehension.gateStatus === "PASSED" ? "border-l-success" : "border-l-destructive"
          )}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                {documentComprehension.gateStatus === "PASSED" ? (
                  <FileCheck className="h-5 w-5 text-success" />
                ) : (
                  <FileWarning className="h-5 w-5 text-destructive" />
                )}
                <CardTitle className="text-lg">የሰነድ ግንዛቤ መግቢያ (Document Comprehension Gate)</CardTitle>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "ml-2",
                    documentComprehension.gateStatus === "PASSED" 
                      ? "bg-success/10 text-success border-success/30" 
                      : "bg-destructive/10 text-destructive border-destructive/30"
                  )}
                >
                  {documentComprehension.gateStatus === "PASSED" ? "አልፏል (PASSED)" : "ታግዷል (BLOCKED)"}
                </Badge>
              </div>
              {documentComprehension.blockedReason && (
                <CardDescription className="text-destructive">
                  {documentComprehension.blockedReason}
                </CardDescription>
              )}
              {documentComprehension.analysisPermissionStatement && (
                <CardDescription className="text-success">
                  {documentComprehension.analysisPermissionStatement}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Documents Acknowledgment */}
              {documentComprehension.documents && documentComprehension.documents.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    የተነበቡ ሰነዶች (Documents Read) ({documentComprehension.documents.length})
                  </h5>
                  <div className="grid gap-2">
                    {documentComprehension.documents.map((doc, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50 text-sm">
                        {doc.readStatus === "Complete" ? (
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        ) : doc.readStatus === "Partial" ? (
                          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                        <span className="font-medium">{doc.documentName}</span>
                        <Badge variant="secondary" className="text-xs">{doc.documentType}</Badge>
                        {doc.pageCount && <span className="text-muted-foreground text-xs">{doc.pageCount} pages</span>}
                        {doc.ocrConfidence && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              doc.ocrConfidence === "High" && "text-success",
                              doc.ocrConfidence === "Medium" && "text-warning",
                              doc.ocrConfidence === "Low" && "text-destructive"
                            )}
                          >
                            OCR: {doc.ocrConfidence}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* License Understanding */}
              {documentComprehension.licenseUnderstanding && (
                <div className="p-3 rounded bg-muted/30 border">
                  <h6 className="text-xs font-semibold text-muted-foreground uppercase mb-2">የፍቃድ ግንዛቤ (License Understanding)</h6>
                  <p className="text-sm"><strong>ተግባር (Activity):</strong> {documentComprehension.licenseUnderstanding.licensedActivity}</p>
                  {documentComprehension.licenseUnderstanding.scopeLimitations && (
                    <p className="text-sm text-muted-foreground"><strong>ወሰን (Scope):</strong> {documentComprehension.licenseUnderstanding.scopeLimitations}</p>
                  )}
                </div>
              )}

              {/* Invoice Understanding */}
              {documentComprehension.invoiceUnderstanding && (
                <div className="flex gap-4 text-sm">
                  <span><strong>{documentComprehension.invoiceUnderstanding.totalLineItems}</strong> ዕቃዎች (line items)</span>
                  <span><strong>{documentComprehension.invoiceUnderstanding.itemsWithSpecs}</strong> ዝርዝር ያላቸው (with specs)</span>
                  {documentComprehension.invoiceUnderstanding.ambiguousItems > 0 && (
                    <span className="text-warning"><strong>{documentComprehension.invoiceUnderstanding.ambiguousItems}</strong> ግልጽ ያልሆኑ (ambiguous)</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Executive Decision Summary */}
        {executiveSummary && (
          <Card className="max-w-4xl mx-auto mb-8 border-l-4 border-l-primary shadow-medium animate-fade-in">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                <CardTitle>የማስፈጸሚያ ማጠቃለያ (Executive Decision Summary)</CardTitle>
              </div>
              <CardDescription>ለባለስልጣን ግምገማ ከፍተኛ ደረጃ ግምገማ (High-level assessment for officer review)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-background border">
                  <p className={cn("text-xl font-bold mb-1", getOverallStatusColor())}>
                    {executiveSummary.overallStatus}
                  </p>
                  <p className="text-xs text-muted-foreground">አጠቃላይ ሁኔታ (Overall Status)</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-2xl font-bold text-success mb-1">{eligibleCount}</p>
                  <p className="text-xs text-muted-foreground">ብቁ (Eligible)</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-2xl font-bold text-warning mb-1">{clarificationCount}</p>
                  <p className="text-xs text-muted-foreground">ግምገማ ያስፈልጋል (Need Review)</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-2xl font-bold text-destructive mb-1">{notEligibleCount}</p>
                  <p className="text-xs text-muted-foreground">ብቁ አይደለም (Not Eligible)</p>
                </div>
              </div>

              {executiveSummary.topIssues && executiveSummary.topIssues.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    ዋና ጉዳዮች (Top Issues)
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
                    ተጨማሪ መረጃ ያስፈልጋል (Additional Information Needed)
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
                <CardTitle className="text-lg">የፍቃድ ማጠቃለያ (License Snapshot)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">የተፈቀደ ተግባር (Licensed Activity)</p>
                  <p className="text-sm font-medium">{licenseSnapshot.licensedActivity || "አልተገለጸም (Not specified)"}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ዘርፍ (Sector)</p>
                  <p className="text-sm font-medium">{licenseSnapshot.sector || "አልተገለጸም (Not specified)"}</p>
                </div>
                {licenseSnapshot.licenseNumber && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">የፍቃድ ቁጥር (License Number)</p>
                    <p className="text-sm font-mono">{licenseSnapshot.licenseNumber}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ወሰን/ገደቦች (Scope/Restrictions)</p>
                  <p className="text-sm text-muted-foreground">{licenseSnapshot.restrictions || licenseSnapshot.scopeOfOperation || "አልተገለጸም (None specified)"}</p>
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
                <CardTitle>የዕቃዎች ብቁነት ሰንጠረዥ (Itemized Compliance Table)</CardTitle>
              </div>
              <CardDescription>ማጣቀሻዎችን እና ዝርዝር ምክንያቶችን ለማየት ማንኛውንም ረድፍ ጠቅ ያድርጉ (Click any row to view citations and detailed reasoning)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="font-semibold">ቁጥር (Item #)</TableHead>
                      <TableHead className="font-semibold">የደረሰኝ ዕቃ (Invoice Item)</TableHead>
                      <TableHead className="font-semibold">መደበኛ ስም (Normalized Name)</TableHead>
                      <TableHead className="font-semibold">የፍቃድ ማስማማት (License Align.)</TableHead>
                      <TableHead className="font-semibold">ብቁነት (Eligibility)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceItems.map((item, index) => (
                      <React.Fragment key={item.itemNumber}>
                        <TableRow
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
                          <TableCell><LicenseBadge status={item.licenseAlignment} /></TableCell>
                          <TableCell><EligibilityBadge status={item.eligibilityStatus || item.policyCompliance} /></TableCell>
                        </TableRow>
                        {expandedRows.includes(item.itemNumber) && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/20 p-0">
                              <div className="p-6 space-y-6">
                                {/* License Evidence */}
                                <div>
                                  <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    የፍቃድ ማስረጃ (License Evidence)
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
                                      የፖሊሲ ማጣቀሻዎች (Policy Citations) ({item.citations.length})
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
                                      ምክንያት (Reasoning)
                                    </h5>
                                    <ul className="space-y-2">
                                      {item.reasoning.map((r, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                          {(r.type === "match" || r.type === "listed-match" || r.type === "mapped-match") && <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />}
                                          {(r.type === "assumption-avoided" || r.type === "exclusion") && <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />}
                                          {(r.type === "ambiguity") && <HelpCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />}
                                          {r.type === "essential-inclusion" && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
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
                <CardTitle>ማስረጃ እና ማጣቀሻዎች (Evidence & Citations Panel)</CardTitle>
              </div>
              <CardDescription>በዚህ ትንተና ውስጥ የተጠቀሱ ሁሉም የፖሊሲ አንቀጾች (All policy clauses referenced in this analysis)</CardDescription>
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
                            <span className="font-medium">ለ (Applied to): </span>
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
                <CardTitle>የባለስልጣን እርምጃ ያስፈልጋል (Officer Action Needed)</CardTitle>
              </div>
              <CardDescription>ተጨማሪ ማረጋገጫ ወይም ሰነድ የሚያስፈልጋቸው ዕቃዎች (Items requiring additional verification or documentation)</CardDescription>
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
                <h4 className="font-semibold mb-1">የምክር ማስታወቂያ — ትርጓሜ አስገዳጅ አይደለም (Advisory Notice — Interpretation is Non-Binding)</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ይህ ትንተና የውሳኔ ድጋፍ ብቻ ነው። ሁሉም ማጣቀሻዎች ሊከታተሉ ይችላሉ። የመጨረሻ ስልጣን ከAAIC ባለስልጣን ጋር ነው።
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  (This analysis is grounded strictly in the configured Policy Library and uploaded case documents. 
                  Every compliance statement includes traceable citations. Final authority rests with the AAIC officer.)
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
