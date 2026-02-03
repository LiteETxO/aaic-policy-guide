import React, { useState, useMemo, useEffect } from "react";
import { 
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, FileText, Scale, 
  AlertCircle, BookOpen, Quote, ChevronDown, ChevronRight, ExternalLink,
  ClipboardList, AlertOctagon, FileCheck, FileWarning, FileOutput, LayoutList,
  Shield, Gauge, Building2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ReportGenerator } from "@/components/report/ReportGenerator";
import { ConfidenceBadge, EvidenceChip, type ConfidenceLevel, type EvidenceData } from "@/components/gamification";
import GuidelineMappingPanel, { type GuidelineMappingData, type GuidelineSection, type AllowedCategory } from "@/components/analysis/GuidelineMappingPanel";
import InvestorLicenseContextPanel, { type InvestorLicenseContextData } from "@/components/analysis/InvestorLicenseContextPanel";
import GoodsInterpretationTable, { type GoodsInterpretationRow } from "@/components/analysis/GoodsInterpretationTable";
import OfficerVerificationToggle from "@/components/analysis/OfficerVerificationToggle";
import { useDecisionTrace, createTraceEvent } from "@/hooks/useDecisionTrace";
import { supabase } from "@/integrations/supabase/client";

// Types matching the new AI output format with Policy Clause Index support
type EligibilityStatus =
  | "Eligible – Listed Capital Good" 
  | "Eligible – Listed Capital Good (Mapped)" 
  | "Eligible – Essential Capital Good (Not Listed)" 
  | "Decision Deferred — Citation Incomplete"
  | "Requires Clarification" 
  | "Not Eligible"
  | "Policy Gap – Admin Action Required";

type LicenseAlignment = "Aligned" | "Conditional" | "Needs Clarification" | "Not Aligned";

type ClauseSectionType = "Article" | "Annex" | "Schedule" | "Item";
type ClauseInclusionType = "enabling" | "restrictive" | "exclusion" | "procedural";
type ClauseAppliesTo = "capital_goods" | "customs_duty" | "income_tax" | "essentiality" | "exclusion" | "general_incentive";

// Policy Clause Index Entry - MANDATORY for all citations
interface PolicyClause {
  clause_id: string;
  policy_document_name: string;
  issuing_authority?: string;
  policy_version?: string;
  language: "Amharic" | "English" | "Mixed";
  section_type: ClauseSectionType;
  section_number: string;
  page_number: number;
  clause_heading: string;
  clause_heading_amharic?: string;
  clause_text: string;
  clause_text_amharic?: string;
  keywords: string[];
  applies_to: ClauseAppliesTo[];
  inclusion_type: ClauseInclusionType;
  notes?: string;
}

interface Citation {
  clause_id?: string; // Reference to policyClauseIndex - REQUIRED in new format
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
  sourceClauseId?: string;
}

interface ReasoningPoint {
  point: string;
  type: "listed-match" | "mapped-match" | "essential-inclusion" | "exclusion" | "ambiguity" | "match" | "assumption-avoided" | "clause-reference";
}

interface EssentialityAnalysis {
  functionalNecessity: string;
  operationalLink: string;
  capitalNature: string;
  noProhibition: string;
  testResult?: "PASSED" | "FAILED" | "INCONCLUSIVE";
  supportingClauseIds?: string[];
}

interface ComplianceItem {
  itemNumber: number;
  invoiceItem: string;
  normalizedName: string;
  category?: string;
  specs?: string;
  invoiceRef?: string;
  matchResult?: "Exact" | "Mapped" | "Essential" | "Not Matched";
  matchCandidates?: MatchCandidate[];
  eligibilityStatus?: EligibilityStatus;
  eligibilityPath?: string;
  licenseAlignment: LicenseAlignment;
  licenseEvidence: string;
  citations: Citation[];
  referencedClauseIds?: string[]; // Array of clause_ids from policyClauseIndex
  essentialityAnalysis?: EssentialityAnalysis;
  reasoning: ReasoningPoint[];
  policyCompliance?: string;
  notEligibleJustification?: string;
}

interface PolicyClauseIndexSummary {
  totalClausesIndexed: number;
  clauseIdsAvailable: string[];
  capitalGoodsClauses: number;
  essentialityClauses: number;
  exclusionClauses: number;
  generalIncentiveClauses: number;
  isComplete: boolean;
  missingClauseTypes?: ClauseAppliesTo[];
}

interface DocumentComprehension {
  gateStatus: "PASSED" | "BLOCKED";
  blockedReason?: string | null;
  documents?: Array<{
    documentName: string;
    documentType: string;
    issuingAuthority?: string;
    languagesDetected?: string[];
    pageCount?: number;
    ocrConfidence?: string;
    keySectionsDetected?: string[];
    capitalGoodsListPresent?: boolean;
    annexesDetected?: string[];
    articlesIndexed?: Array<{
      articleNumber: string;
      page: number;
      clauseSummary?: string;
    }>;
    unreadablePages?: number[];
    readStatus?: string;
    clausesExtracted?: number;
  }>;
  policyIndex?: Array<{
    documentName: string;
    articleSection: string;
    pageNumber: number;
    clauseHeading: string;
    clauseHeadingAmharic?: string;
    clauseText?: string;
    scopeOfApplication: string;
    keywords: string[];
    clause_id?: string;
  }>;
  policyClauseIndex?: PolicyClause[];
  policyClauseIndexSummary?: PolicyClauseIndexSummary;
  licenseUnderstanding?: {
    licensedActivity: string;
    licensedActivityAmharic?: string;
    scopeLimitations: string;
    conditions: string;
    licenseNumber?: string;
    extractionStatus: string;
  };
  invoiceUnderstanding?: {
    totalLineItems: number;
    itemsWithSpecs: number;
    ambiguousItems: number;
    invoiceLanguage?: string;
    readabilityStatus: string;
  };
  analysisPermissionStatement?: string;
}

interface ActionItem {
  type: "missing" | "unreadable" | "conflict" | "policy-gap" | "missing-evidence" | "ambiguous-mapping" | "document-ingestion-blocked" | "citation-incomplete" | "essentiality-review";
  description: string;
  descriptionAmharic?: string;
  severity: "high" | "medium" | "low";
  relatedItems?: number[];
  whatIsMissing?: string;
  whyItMatters?: string;
  resolutionAction?: string;
  missingClauseTypes?: ClauseAppliesTo[];
}

interface AnalysisCompleteness {
  totalInvoiceItems: number;
  analyzedItems: number;
  isComplete: boolean;
  skippedItems?: string[] | number[];
  completenessNote?: string;
  itemsWithValidCitations?: number;
  itemsDeferredForCitations?: number;
}

interface GuidelineMappingResult {
  matchStatus: 'matched' | 'partial' | 'not_found' | 'pending';
  matchedGuideline?: string;
  allowedCategories?: string[];
}

interface AnalysisData {
  documentComprehension?: DocumentComprehension;
  executiveSummary?: {
    overallStatus: string;
    overallStatusAmharic?: string;
    eligibleCount?: number;
    clarificationCount?: number;
    notEligibleCount?: number;
    deferredCount?: number;
    topIssues: string[];
    topIssuesAmharic?: string[];
    additionalInfoNeeded: string[];
    recommendation?: string;
    clauseIndexCompleteness?: string;
    notEligibleJustification?: string;
  };
  licenseSnapshot?: {
    licensedActivity: string;
    licensedActivityAmharic?: string;
    sector: string;
    scopeOfOperation: string;
    restrictions: string;
    licenseNumber?: string;
    issueDate?: string;
  };
  guidelineMapping?: GuidelineMappingResult;
  policyClauseIndex?: PolicyClause[];
  complianceItems?: ComplianceItem[];
  analysisCompleteness?: AnalysisCompleteness;
  officerActionsNeeded?: ActionItem[];
  rawResponse?: string;
  parseError?: boolean;
}

interface AnalysisResultsProps {
  data?: AnalysisData;
}

// Helper function to determine confidence level from item data
const getItemConfidence = (item: ComplianceItem): ConfidenceLevel => {
  // High confidence: has citations, has clear match result, has reasoning
  const hasCitations = item.citations && item.citations.length > 0;
  const hasReasoning = item.reasoning && item.reasoning.length > 0;
  const hasGoodMatch = item.matchResult === "Exact" || 
    (item.matchCandidates && item.matchCandidates.some(m => m.confidence === "High"));
  
  if (hasCitations && hasReasoning && hasGoodMatch) return "high";
  if (hasCitations || hasReasoning) return "medium";
  return "low";
};

// Eligibility status config (Amharic-first) - Updated with safety-focused language
const eligibilityConfig: Record<string, { icon: React.ElementType; color: string; label: string; bgColor: string; safeLabel?: string }> = {
  "Eligible – Listed Capital Good": { icon: CheckCircle2, color: "text-success", label: "ብቁ - ዝርዝር (Eligible - Listed)", bgColor: "bg-success/10" },
  "Eligible – Listed Capital Good (Mapped)": { icon: CheckCircle2, color: "text-success", label: "ብቁ - ተዛምዷል (Eligible - Mapped)", bgColor: "bg-success/10" },
  "Eligible – Essential Capital Good (Not Listed)": { icon: CheckCircle2, color: "text-emerald-600", label: "ብቁ - አስፈላጊ (Eligible - Essential)", bgColor: "bg-emerald-500/10" },
  "Decision Deferred — Citation Incomplete": { icon: AlertCircle, color: "text-warning", label: "ውሳኔ ተዘግቷል — ማስረጃ አልተሟላም (Citation Incomplete)", bgColor: "bg-warning/10" },
  "Requires Clarification": { icon: HelpCircle, color: "text-blue-500", label: "ማብራሪያ ያስፈልጋል (Needs Clarification)", bgColor: "bg-blue-500/10" },
  "Policy Gap – Admin Action Required": { icon: AlertOctagon, color: "text-destructive", label: "የፖሊሲ ክፍተት — አስተዳዳሪ እርምጃ ያስፈልጋል (Policy Gap)", bgColor: "bg-destructive/10" },
  "Not Eligible": { icon: Shield, color: "text-destructive", label: "ውሳኔ ታግዷል — ማስረጃ ይጎድላል (Decision Blocked — Evidence Missing)", bgColor: "bg-destructive/10", safeLabel: "ተጨማሪ ማስረጃ ያስፈልጋል" },
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
  const [showFormalReport, setShowFormalReport] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  
  // State for soft-block override - must be at top level before any conditional returns
  const [proceedWithManualReview, setProceedWithManualReview] = useState(false);
  
  // State for Officer Verification Mode - must be at top level before any conditional returns
  const [isOfficerVerificationMode, setIsOfficerVerificationMode] = useState(false);
  
  // Get trace functions - must be at top level before any conditional returns
  const { addEvent, updateWorkflowStage } = useDecisionTrace();
  
  // State for database policy clauses - fetched directly from DB
  const [dbPolicyClauses, setDbPolicyClauses] = useState<PolicyClause[]>([]);
  
  // Fetch policy clauses from database on mount
  useEffect(() => {
    const fetchPolicyClauses = async () => {
      try {
        const { data: clauses, error } = await supabase
          .from('policy_clauses')
          .select('*')
          .eq('is_verified', true);
        
        if (error) {
          console.error('Error fetching policy clauses:', error);
          return;
        }
        
        if (clauses && clauses.length > 0) {
          // Transform DB format to component format
          const transformed: PolicyClause[] = clauses.map((c: any) => ({
            clause_id: c.clause_id,
            policy_document_name: c.policy_document_name,
            issuing_authority: c.issuing_authority,
            policy_version: c.policy_version,
            language: c.language as "Amharic" | "English" | "Mixed",
            section_type: c.section_type as ClauseSectionType,
            section_number: c.section_number,
            page_number: c.page_number,
            clause_heading: c.clause_heading,
            clause_heading_amharic: c.clause_heading_amharic,
            clause_text: c.clause_text,
            clause_text_amharic: c.clause_text_amharic,
            keywords: c.keywords || [],
            applies_to: c.applies_to || [],
            inclusion_type: c.inclusion_type as ClauseInclusionType,
            notes: c.notes,
          }));
          setDbPolicyClauses(transformed);
          console.log(`Loaded ${transformed.length} policy clauses from database`);
        }
      } catch (err) {
        console.error('Failed to fetch policy clauses:', err);
      }
    };
    
    fetchPolicyClauses();
  }, []);

  const tryRepairJson = (raw: string): AnalysisData | null => {
    try {
      let s = raw.trim();

      // Strip markdown code fences
      s = s.replace(/^```json\s*/i, "");
      s = s.replace(/^```\s*/i, "");
      s = s.replace(/```\s*$/i, "");

      // Try direct parse first
      try {
        return JSON.parse(s);
      } catch {
        // Try to extract the JSON object portion
        const first = s.indexOf("{");
        const last = s.lastIndexOf("}");
        if (first !== -1 && last !== -1 && last > first) {
          const candidate = s.slice(first, last + 1);
          return JSON.parse(candidate);
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  // Handle parse error or raw response
  if (data?.parseError && data?.rawResponse) {
    const repaired = tryRepairJson(data.rawResponse);
    if (repaired && !repaired.parseError) {
      // Re-render using the repaired JSON so the UI shows the normal report view.
      // Ensure repaired data won't trigger another repair loop
      return <AnalysisResults data={repaired} />;
    }

    return (
      <section className="py-16 bg-muted/20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Analysis Results</h2>
            <p className="text-muted-foreground">Could not render the report (invalid/truncated JSON)</p>
          </div>

          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-destructive" />
                <CardTitle className="text-lg">የትንተና ውጤት ማሳየት አልተቻለም (Render Failed)</CardTitle>
              </div>
              <CardDescription>
                The backend returned an incomplete or malformed response. Please re-run the analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRawResponse((v) => !v)}
                  className="gap-2"
                >
                  {showRawResponse ? "Hide raw output" : "Show raw output"}
                </Button>
              </div>

              {showRawResponse && (
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                  {data.rawResponse}
                </pre>
              )}
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
  const analysisCompleteness = data?.analysisCompleteness;

  // Normalize documents list (backend may return string[] or object[])
  const documentsRead = React.useMemo(() => {
    const docs: any = (documentComprehension as any)?.documents;
    if (!Array.isArray(docs)) return [] as DocumentComprehension["documents"];

    return docs.map((doc: any) => {
      if (typeof doc === "string") {
        const name = doc;
        const lower = name.toLowerCase();
        const documentType =
          lower.includes("invoice")
            ? "Invoice"
            : lower.includes("permit") || lower.includes("license")
              ? "License"
              : lower.includes("directive") ||
                  lower.includes("proclamation") ||
                  lower.includes("annex") ||
                  lower.includes("policy") ||
                  lower.includes("list")
                ? "Policy"
                : "Document";

        return {
          documentName: name,
          documentType,
          readStatus: "Complete",
        };
      }

      if (doc && typeof doc === "object") {
        return {
          ...doc,
          documentName: doc.documentName ?? doc.name ?? doc.title ?? "Document",
          documentType: doc.documentType ?? "Document",
          readStatus: doc.readStatus ?? "Complete",
        };
      }

      return {
        documentName: String(doc),
        documentType: "Document",
        readStatus: "Complete",
      };
    });
  }, [documentComprehension]);

  // Build Guideline Mapping Data from license snapshot and policy clauses
  const guidelineMappingData = useMemo((): GuidelineMappingData | null => {
    const licenseUnderstanding = documentComprehension?.licenseUnderstanding;
    const policyIndex = documentComprehension?.policyIndex || [];
    // Use dbPolicyClauses as fallback when AI response doesn't include clauses
    const policyClauseIndex = data?.policyClauseIndex || 
                               documentComprehension?.policyClauseIndex || 
                               dbPolicyClauses || 
                               [];
    
    // Extract license name from various sources
    const licenseName = licenseSnapshot?.licensedActivity || 
                        licenseUnderstanding?.licensedActivity || 
                        "Investment License";
    
    const licenseNameAmharic = licenseSnapshot?.licensedActivityAmharic || 
                                licenseUnderstanding?.licensedActivityAmharic;
    
    // Determine mapping status based on policy clause availability
    // Handle both camelCase (from AI) and snake_case (from DB) field names
    const hasMatchedClauses = policyClauseIndex.length > 0 || policyIndex.length > 0;
    const hasCapitalGoodsClauses = policyClauseIndex.some((c: any) => {
      // Check applies_to array (handles both camelCase and snake_case)
      const appliesTo = c.applies_to || c.appliesTo || [];
      const sectionType = c.section_type || c.sectionType || '';
      return appliesTo.includes('capital_goods') || sectionType === 'Annex';
    });
    
    // Also check if we have a valid license-to-guideline match from the AI response
    const hasGuidelineMapping = data?.guidelineMapping?.matchStatus === 'matched' ||
                                data?.guidelineMapping?.matchStatus === 'partial';
    
    let mappingStatus: GuidelineMappingData['mappingStatus'] = 'not_found';
    
    // Priority: Use AI-provided guidelineMapping if available
    if (hasGuidelineMapping) {
      mappingStatus = data?.guidelineMapping?.matchStatus === 'matched' ? 'matched' : 'partial';
    } else if (hasMatchedClauses && hasCapitalGoodsClauses) {
      mappingStatus = 'matched';
    } else if (hasMatchedClauses) {
      mappingStatus = 'partial';
    } else if (documentComprehension?.gateStatus === 'PASSED' && !hasMatchedClauses) {
      // Gate passed but no clauses found - not_found
      mappingStatus = 'not_found';
    } else if (!documentComprehension) {
      // No document comprehension yet - pending
      mappingStatus = 'pending';
    }
    
    // Build matched sections from policy index
    const matchedSections: GuidelineSection[] = policyIndex.slice(0, 5).map((p: any) => ({
      sectionTitle: p.clauseHeading || p.articleSection || 'Policy Section',
      sectionTitleAmharic: p.clauseHeadingAmharic,
      articleNumber: p.articleSection,
      pageNumber: p.pageNumber || 0,
      clauseIds: p.clause_id ? [p.clause_id] : undefined,
    }));
    
    // If no policyIndex, try to build from policyClauseIndex
    if (matchedSections.length === 0 && policyClauseIndex.length > 0) {
      policyClauseIndex.slice(0, 5).forEach((c: any) => {
        matchedSections.push({
          sectionTitle: c.clause_heading || c.section_number || 'Clause',
          sectionTitleAmharic: c.clause_heading_amharic,
          articleNumber: c.section_number,
          pageNumber: c.page_number || 0,
          clauseIds: [c.clause_id],
        });
      });
    }
    
    // Build allowed categories from capital goods clauses (handle both snake_case and camelCase)
    const allowedCategories: AllowedCategory[] = policyClauseIndex
      .filter((c: any) => {
        const appliesTo = c.applies_to || c.appliesTo || [];
        const sectionType = c.section_type || c.sectionType || '';
        return appliesTo.includes('capital_goods') || sectionType === 'Annex';
      })
      .slice(0, 10)
      .map((c: any) => ({
        categoryName: c.clause_heading || c.clauseHeading || c.keywords?.[0] || 'Capital Good Category',
        categoryNameAmharic: c.clause_heading_amharic || c.clauseHeadingAmharic,
        description: (c.clause_text || c.clauseText)?.substring(0, 100) + ((c.clause_text || c.clauseText)?.length > 100 ? '...' : ''),
        clauseId: c.clause_id || c.clauseId,
      }));
    
    // Extract conditions and exclusions
    const conditions = policyClauseIndex
      .filter((c: any) => c.inclusion_type === 'restrictive' || c.inclusion_type === 'procedural')
      .slice(0, 3)
      .map((c: any) => c.clause_heading || c.clause_text?.substring(0, 80));
    
    const exclusions = policyClauseIndex
      .filter((c: any) => c.inclusion_type === 'exclusion' || c.applies_to?.includes('exclusion'))
      .slice(0, 3)
      .map((c: any) => c.clause_heading || c.clause_text?.substring(0, 80));
    
    // Get source document info
    const sourceDocument = policyClauseIndex[0]?.policy_document_name || 
                           policyIndex[0]?.documentName ||
                           'Policy Document';
    
    const issuingAuthority = policyClauseIndex[0]?.issuing_authority || 'Ministry of Finance';
    
    // Build warning message if needed
    let warningMessage: string | undefined;
    let adminActionRequired = false;
    
    if (mappingStatus === 'not_found') {
      warningMessage = 'License type not located in guideline. Cannot determine duty-free eligibility without matching license category.';
      adminActionRequired = true;
    } else if (mappingStatus === 'partial') {
      warningMessage = 'Some guideline sections matched, but capital goods list may be incomplete. Officer review recommended.';
    }
    
    return {
      licenseNameVerbatim: licenseName,
      licenseNameAmharic,
      licenseNumber: licenseSnapshot?.licenseNumber || licenseUnderstanding?.licenseNumber,
      licensedActivity: licenseSnapshot?.scopeOfOperation,
      sector: licenseSnapshot?.sector,
      mappingStatus,
      matchedSections,
      allowedCategories,
      sourceDocument,
      issuingAuthority,
      conditions: conditions.filter(Boolean) as string[],
      exclusions: exclusions.filter(Boolean) as string[],
      warningMessage,
      adminActionRequired,
    };
  }, [data, documentComprehension, licenseSnapshot, dbPolicyClauses]);

  // Emit trace events when analysis data changes - license-first workflow
  useEffect(() => {
    if (!data) return;

    // Stage 1: License Extracted
    if (licenseSnapshot?.licensedActivity) {
      addEvent(createTraceEvent.licenseExtracted(
        licenseSnapshot.licensedActivity,
        licenseSnapshot.sector || 'Investment'
      ));
    }

    // Stage 2: Guideline Section Matched
    if (guidelineMappingData) {
      const firstSection = guidelineMappingData.matchedSections?.[0];
      addEvent(createTraceEvent.guidelineMatched(
        guidelineMappingData.mappingStatus === 'matched' ? 'matched' :
        guidelineMappingData.mappingStatus === 'partial' ? 'partial' : 'not_found',
        firstSection?.sectionTitle,
        firstSection?.pageNumber
      ));
    }

    // Stage 3: Allowed Categories Loaded
    if (guidelineMappingData?.allowedCategories && guidelineMappingData.allowedCategories.length > 0) {
      addEvent(createTraceEvent.categoriesLoaded(
        guidelineMappingData.allowedCategories.length,
        guidelineMappingData.allowedCategories.map(c => c.categoryName)
      ));
    }

    // Stage 4 & 5: Item Clause Bound and Citation Validated - for each compliance item
    complianceItems.forEach((item, index) => {
      if (item.citations && item.citations.length > 0) {
        const citation = item.citations[0];
        addEvent(createTraceEvent.itemClauseBound(
          item.itemNumber || index + 1,
          citation.clause_id || citation.articleSection,
          citation.documentName,
          citation.pageNumber
        ));

        // Citation validation
        const hasCitation = citation.documentName && citation.pageNumber > 0;
        addEvent(createTraceEvent.citationValidated(
          item.itemNumber || index + 1,
          hasCitation,
          !hasCitation ? ['document name', 'page number'].filter((_, i) => 
            i === 0 ? !citation.documentName : citation.pageNumber <= 0
          ) : undefined
        ));
      }
    });
  }, [data, licenseSnapshot, guidelineMappingData, complianceItems, addEvent]);

  // Build Investor & License Context Data
  const investorLicenseContextData = useMemo((): InvestorLicenseContextData | null => {
    if (!data) return null;
    
    const licenseUnderstanding = documentComprehension?.licenseUnderstanding;
    
    // Check for missing required fields
    const missingFields: string[] = [];
    if (!licenseSnapshot?.licensedActivity && !licenseUnderstanding?.licensedActivity) {
      missingFields.push("የፍቃድ ስም / ተግባር (License Name / Activity)");
    }
    if (!guidelineMappingData || guidelineMappingData.mappingStatus === "not_found") {
      missingFields.push("የፖሊሲ መመሪያ ካርታ (Policy Guideline Mapping)");
    }
    
    const firstSection = guidelineMappingData?.matchedSections?.[0];
    
    return {
      // Investor name - try to extract from various sources
      investorName: (data as any).investorName || 
                    (data as any).companyName || 
                    licenseSnapshot?.licenseNumber ? `License #${licenseSnapshot.licenseNumber}` : undefined,
      
      // License information (verbatim)
      licenseName: licenseSnapshot?.licensedActivity || 
                   licenseUnderstanding?.licensedActivity || 
                   "Investment License",
      licenseNameAmharic: licenseSnapshot?.licensedActivityAmharic || 
                          licenseUnderstanding?.licensedActivityAmharic,
      licensedActivity: licenseSnapshot?.scopeOfOperation,
      licenseNumber: licenseSnapshot?.licenseNumber || licenseUnderstanding?.licenseNumber,
      
      // License category
      licenseCategory: licenseSnapshot?.sector,
      isCategoryDerived: !!licenseSnapshot?.sector && !licenseUnderstanding?.licensedActivity,
      
      // Guideline mapping
      guidelineMappingStatus: guidelineMappingData?.mappingStatus || "pending",
      matchedGuidelineSection: firstSection?.sectionTitle,
      matchedGuidelineSectionAmharic: firstSection?.sectionTitleAmharic,
      guidelineArticle: firstSection?.articleNumber,
      guidelinePageNumber: firstSection?.pageNumber,
      guidelineDocumentName: guidelineMappingData?.sourceDocument,
      
      // Validation
      isContextComplete: missingFields.length === 0 && guidelineMappingData?.mappingStatus !== "not_found",
      missingFields: missingFields.length > 0 ? missingFields : undefined,
    };
  }, [data, licenseSnapshot, documentComprehension, guidelineMappingData]);

  // Build Goods Interpretation Table Data
  const goodsInterpretationRows = useMemo((): GoodsInterpretationRow[] => {
    return complianceItems.map((item: ComplianceItem & { itemClassification?: string; systemAssociation?: string; systemAssociationAmharic?: string }): GoodsInterpretationRow => {
      const firstCitation = item.citations?.[0];
      
      // Determine interpretation type based on matchResult
      let interpretationType: GoodsInterpretationRow["interpretationType"] = "not_supported";
      const matchResult = item.matchResult;
      if (matchResult === "Exact") {
        interpretationType = "exact";
      } else if (matchResult === "Mapped") {
        interpretationType = "mapped";
      } else if (matchResult === "Essential" || item.essentialityAnalysis?.testResult === "PASSED") {
        interpretationType = "essential";
      } else if (item.eligibilityStatus?.includes("Eligible")) {
        // Fallback for eligible items without explicit match result
        interpretationType = "mapped";
      }
      
      // Determine confidence
      let confidenceLevel: GoodsInterpretationRow["confidenceLevel"] = "low";
      const hasCitations = item.citations && item.citations.length > 0;
      const hasReasoning = item.reasoning && item.reasoning.length > 0;
      if (hasCitations && hasReasoning && item.matchResult === "Exact") {
        confidenceLevel = "high";
      } else if (hasCitations || hasReasoning) {
        confidenceLevel = "medium";
      }
      
      // Spec 4️⃣: Use AI-provided itemClassification first, fallback to derivation
      let itemClassification: GoodsInterpretationRow["itemClassification"] = (item as any).itemClassification || "unknown";
      
      // Only derive if AI didn't provide classification
      if (itemClassification === "unknown" || !itemClassification) {
        const lowerName = item.normalizedName?.toLowerCase() || "";
        const lowerInvoice = item.invoiceItem?.toLowerCase() || "";
        
        // Check for tools/consumables/PPE
        if (lowerName.includes("tool") || lowerName.includes("wrench") || lowerName.includes("screwdriver") ||
            lowerInvoice.includes("hand tool") || lowerInvoice.includes("consumable")) {
          itemClassification = "tool_consumable";
        } else if (lowerName.includes("glove") || lowerName.includes("helmet") || lowerName.includes("safety") ||
                   lowerName.includes("vest") || lowerName.includes("goggles") || lowerInvoice.includes("ppe")) {
          itemClassification = "ppe";
        } else if (item.eligibilityStatus?.includes("Eligible") || item.matchResult === "Exact" || item.matchResult === "Mapped") {
          // Capital goods that are eligible
          if (lowerName.includes("part") || lowerName.includes("component") || lowerName.includes("accessory")) {
            itemClassification = "capital_component";
          } else {
            itemClassification = "capital_equipment";
          }
        } else if (item.matchResult === "Essential") {
          itemClassification = "capital_equipment";
        }
      }
      
      // Spec 4️⃣: Use AI-provided systemAssociation first, fallback to derivation
      let systemAssociation: string | undefined = (item as any).systemAssociation;
      let systemAssociationAmharic: string | undefined = (item as any).systemAssociationAmharic;
      
      // Only derive if AI didn't provide system association
      if (!systemAssociation) {
        const lowerName = item.normalizedName?.toLowerCase() || "";
        
        if (lowerName.includes("transform") || lowerName.includes("switch") || lowerName.includes("breaker") || 
            lowerName.includes("cable") || lowerName.includes("panel") || lowerName.includes("meter")) {
          systemAssociation = "Power Distribution System";
          systemAssociationAmharic = "የኃይል ስርጭት ስርዓት";
        } else if (lowerName.includes("cool") || lowerName.includes("hvac") || lowerName.includes("chiller") ||
                   lowerName.includes("air condition") || lowerName.includes("refriger")) {
          systemAssociation = "Cooling / HVAC System";
          systemAssociationAmharic = "የማቀዝቀዣ / HVAC ስርዓት";
        } else if (lowerName.includes("server") || lowerName.includes("network") || lowerName.includes("router") ||
                   lowerName.includes("storage") || lowerName.includes("rack")) {
          systemAssociation = "IT Infrastructure";
          systemAssociationAmharic = "የአይቲ መሠረተ ልማት";
        } else if (lowerName.includes("generator") || lowerName.includes("ups") || lowerName.includes("battery")) {
          systemAssociation = "Power Generation / Backup";
          systemAssociationAmharic = "የኃይል ማመንጫ / ማስቀመጫ";
        } else if (lowerName.includes("fire") || lowerName.includes("suppression") || lowerName.includes("alarm")) {
          systemAssociation = "Fire Safety System";
          systemAssociationAmharic = "የእሳት ደህንነት ስርዓት";
        } else if (lowerName.includes("security") || lowerName.includes("access") || lowerName.includes("cctv") ||
                   lowerName.includes("camera")) {
          systemAssociation = "Security / Access Control";
          systemAssociationAmharic = "የደህንነት / መግቢያ ቁጥጥር";
        }
      }
      
      return {
        itemNumber: item.itemNumber,
        invoiceDescription: item.invoiceItem, // Original, NOT translated
        normalizedName: item.normalizedName,
        systemAssociation,
        systemAssociationAmharic,
        itemClassification,
        matchedClause: firstCitation ? {
          documentName: firstCitation.documentName,
          articleNumber: firstCitation.articleSection,
          pageNumber: firstCitation.pageNumber,
          clauseId: firstCitation.clause_id,
        } : undefined,
        interpretationType,
        eligibilityOutcome: item.eligibilityStatus || item.policyCompliance || "Unknown",
        confidenceLevel,
        reasoning: item.reasoning?.map(r => r.point).join("; "),
      };
    });
  }, [complianceItems]);

  // Emit Decision Trace events for investor identity and item interpretations
  useEffect(() => {
    if (!investorLicenseContextData) return;
    
    // Log investor identification
    if (investorLicenseContextData.investorName) {
      addEvent(createTraceEvent.info(`Investor identified: ${investorLicenseContextData.investorName}`));
    }
    
    // Log license extraction
    if (investorLicenseContextData.licenseName) {
      addEvent(createTraceEvent.info(`License extracted: ${investorLicenseContextData.licenseName}`));
    }
    
    // Log guideline section match
    if (investorLicenseContextData.matchedGuidelineSection) {
      addEvent(createTraceEvent.info(
        `Guideline section matched: ${investorLicenseContextData.matchedGuidelineSection} (p.${investorLicenseContextData.guidelinePageNumber || '?'})`
      ));
    }

    // Log item interpretations
    goodsInterpretationRows.forEach((item) => {
      if (item.matchedClause) {
        addEvent(createTraceEvent.info(
          `Item ${item.itemNumber} interpreted under: ${item.matchedClause.clauseId || item.matchedClause.articleNumber}`
        ));
      }
    });
  }, [investorLicenseContextData, goodsInterpretationRows, addEvent]);

  // Filter officer actions to only include valid items with a type property
  const officerActionsNeeded = (data?.officerActionsNeeded || [])
    .filter((action): action is ActionItem => action != null && typeof action.type === 'string' && action.type.length > 0);


  // Handle empty analysis results (AI returned structure but no actual data)
  // Only show this if we have data but it's empty - not if data is undefined/null
  // Also exclude if documentComprehension exists (we want to show that card)
  const isEmptyAnalysis = data && 
    complianceItems.length === 0 && 
    !documentComprehension?.blockedReason && 
    documentComprehension?.gateStatus !== "BLOCKED" &&
    !documentComprehension; // Don't show empty state if we have documentComprehension

  if (isEmptyAnalysis) {
    return (
      <section className="py-16 bg-muted/20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">የትንተና ውጤቶች (Analysis Results)</h2>
            <p className="text-muted-foreground">Analysis produced no results</p>
          </div>

          <Card className="max-w-4xl mx-auto border-warning border-l-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <CardTitle className="text-lg">ባዶ ትንተና ውጤት (Empty Analysis)</CardTitle>
              </div>
              <CardDescription>
                The AI analysis completed but returned no items. This usually means:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>The invoice had no recognizable line items</li>
                <li>The policy documents were too large for processing</li>
                <li>The AI ran out of processing capacity</li>
                <li>The documents could not be properly parsed</li>
              </ul>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Suggested actions:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Try re-uploading the documents</li>
                  <li>Use simpler or shorter invoice files</li>
                  <li>Ensure documents are clear and readable</li>
                  <li>Contact support if the issue persists</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  // Calculate completeness metrics
  const totalInvoiceItems = analysisCompleteness?.totalInvoiceItems || 
    documentComprehension?.invoiceUnderstanding?.totalLineItems || 0;
  const analyzedItems = analysisCompleteness?.analyzedItems || complianceItems.length;
  const isAnalysisComplete = analysisCompleteness?.isComplete ?? 
    (totalInvoiceItems > 0 ? analyzedItems >= totalInvoiceItems : true);
  const skippedItems = analysisCompleteness?.skippedItems || [];

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

  // Collect all citations from compliance items, normalizing property names
  const allCitations = React.useMemo(() => {
    const citationsFromItems = complianceItems.flatMap(item => 
      (item.citations || []).map((c: any) => ({
        documentName: c.documentName || c.document || c.source || 'Unknown Document',
        articleSection: c.articleSection || c.article || c.section || c.reference || 'N/A',
        pageNumber: c.pageNumber || c.page || 0,
        quote: c.quote || c.text || c.excerpt || '',
        relevance: c.relevance || c.reason || c.explanation || '',
        itemName: item.normalizedName || item.invoiceItem || 'Unknown Item'
      }))
    ).filter(c => c.quote || c.articleSection !== 'N/A'); // Filter out empty citations

    // If no citations from items, try to extract from policyBasis or policyIndex
    if (citationsFromItems.length === 0) {
      const policyBasis = (data as any)?.policyBasis || [];
      const policyIndex = documentComprehension?.policyIndex || [];
      
      // Extract from policyBasis
      const citationsFromPolicyBasis = policyBasis.flatMap((pb: any) => 
        (pb.quotedClauses || []).map((quote: string, idx: number) => ({
          documentName: pb.documentName || 'Policy Document',
          articleSection: (pb.relevantArticles || [])[idx] || pb.relevantArticles?.[0] || 'Policy Reference',
          pageNumber: (pb.pageNumbers || [])[idx] || pb.pageNumbers?.[0] || 0,
          quote: quote,
          relevance: `Referenced in policy basis for compliance analysis`,
          itemName: 'Policy Reference'
        }))
      );

      // Extract from policyIndex
      const citationsFromPolicyIndex = policyIndex.map((pi: any) => ({
        documentName: pi.documentName || 'Policy Document',
        articleSection: pi.articleSection || 'Section Reference',
        pageNumber: pi.pageNumber || 0,
        quote: pi.clauseText || pi.clauseHeading || pi.scopeOfApplication || '',
        relevance: pi.scopeOfApplication || 'Indexed policy clause',
        itemName: 'Policy Index'
      })).filter((c: any) => c.quote);

      return [...citationsFromPolicyBasis, ...citationsFromPolicyIndex];
    }

    return citationsFromItems;
  }, [complianceItems, data, documentComprehension]);

  // Show formal report view
  if (showFormalReport) {
    return (
      <section className="py-8 bg-muted/20 print:bg-white print:py-0">
        <div className="container print:max-w-none print:px-0">
          {/* Toggle back to interactive view - hidden in print */}
          <div className="flex justify-end mb-4 print:hidden">
            <Button 
              variant="outline" 
              onClick={() => setShowFormalReport(false)}
              className="gap-2"
            >
              <LayoutList className="h-4 w-4" />
              <span>ወደ ተግባራዊ እይታ ተመለስ (Back to Interactive View)</span>
            </Button>
          </div>
          
          <ReportGenerator analysisData={data} />
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">የትንተና ውጤቶች (Analysis Results)</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            በፖሊሲ ላይ የተመሰረተ የብቁነት ግምገማ ከሊከታተሉ የሚችሉ ማጣቀሻዎች ጋር
          </p>
          <p className="text-sm text-muted-foreground mt-2">(Policy-anchored compliance assessment with traceable citations)</p>
          
          {/* Button to generate formal report */}
          <div className="mt-6">
            <Button 
              onClick={() => setShowFormalReport(true)}
              className="gap-2 gradient-hero text-primary-foreground"
            >
              <FileOutput className="h-4 w-4" />
              <span>ሪፖርት ያውርዱ / ያትሙ (Generate Formal Report)</span>
            </Button>
          </div>
        </div>

        {/* Officer Verification Mode Toggle */}
        <div className="max-w-4xl mx-auto mb-6">
          <OfficerVerificationToggle
            isEnabled={isOfficerVerificationMode}
            onToggle={setIsOfficerVerificationMode}
          />
        </div>

        {/* MANDATORY: Investor & License Context Panel */}
        {investorLicenseContextData && (
          <InvestorLicenseContextPanel 
            data={investorLicenseContextData}
            className="max-w-4xl mx-auto mb-8"
          />
        )}

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
              <div>
                <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  የተነበቡ ሰነዶች (Documents Read)
                  {documentsRead.length > 0 && <span>({documentsRead.length})</span>}
                </h5>
                {documentsRead.length > 0 ? (
                  <div className="grid gap-2">
                    {documentsRead.map((doc, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-center gap-3 p-3 rounded bg-muted/50 text-sm border border-border/50"
                      >
                        {doc.readStatus === "Complete" ? (
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        ) : doc.readStatus === "Partial" ? (
                          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                        <span className="font-medium flex-1 min-w-[200px]">{doc.documentName}</span>
                        <Badge variant="secondary" className="text-xs">{doc.documentType}</Badge>
                        {doc.issuingAuthority && (
                          <span className="text-muted-foreground text-xs">by {doc.issuingAuthority}</span>
                        )}
                        {doc.pageCount && <span className="text-muted-foreground text-xs">{doc.pageCount} pages</span>}
                        {doc.languagesDetected && doc.languagesDetected.length > 0 && (
                          <span className="text-muted-foreground text-xs">[{doc.languagesDetected.join(", ")}]</span>
                        )}
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
                        {doc.capitalGoodsListPresent === true && (
                          <Badge variant="outline" className="text-xs text-success bg-success/10">
                            ካፒታል ዕቃዎች ዝርዝር (Capital Goods List) ✓
                          </Badge>
                        )}
                        {doc.annexesDetected && doc.annexesDetected.length > 0 && (
                          <div className="w-full mt-1 pl-6 text-xs text-muted-foreground">
                            አባሪዎች (Annexes): {doc.annexesDetected.join(", ")}
                          </div>
                        )}
                        {doc.keySectionsDetected && doc.keySectionsDetected.length > 0 && (
                          <div className="w-full mt-1 pl-6 text-xs text-muted-foreground">
                            ቁልፍ ክፍሎች (Key sections): {doc.keySectionsDetected.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded bg-warning/10 border border-warning/30 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="font-medium text-warning">የሰነድ ዝርዝር አልተገኘም (Document list not provided)</span>
                    </div>
                    <p className="text-muted-foreground">
                      የተነበቡ ሰነዶች ዝርዝር በትንተና ውጤት ውስጥ አልተሰጠም። ይህ የኦዲት እና የማስረጃ ክትትል ጥራት ሊቀንስ ይችላል።
                    </p>
                    <p className="text-muted-foreground mt-2">
                      The backend did not include a detailed list of documents read. This reduces traceability.
                    </p>
                  </div>
                )}
              </div>

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

        {/* Guideline Mapping Panel - License→Policy Matching */}
        {guidelineMappingData && (guidelineMappingData.mappingStatus !== 'not_found' || !proceedWithManualReview) && (
          <GuidelineMappingPanel 
            data={guidelineMappingData}
            onProceedAnyway={() => setProceedWithManualReview(true)}
            className="max-w-4xl mx-auto mb-8"
          />
        )}

        {/* Analysis Completeness Warning */}
        {totalInvoiceItems > 0 && !isAnalysisComplete && (
          <Card className="max-w-4xl mx-auto mb-8 border-l-4 border-l-warning bg-warning/5 animate-fade-in">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-warning" />
                <CardTitle className="text-lg text-warning">
                  ያልተተነተኑ ዕቃዎች ተገኝተዋል (Incomplete Analysis Detected)
                </CardTitle>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  {analyzedItems}/{totalInvoiceItems} ዕቃዎች (items)
                </Badge>
              </div>
              <CardDescription>
                ከጠቅላላ {totalInvoiceItems} የደረሰኝ ዕቃዎች ውስጥ {analyzedItems} ብቻ ተተንትነዋል። 
                (Only {analyzedItems} out of {totalInvoiceItems} invoice items were analyzed.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-sm font-medium text-warning mb-2">
                  ⚠️ ማስጠንቀቂያ (Warning):
                </p>
                <p className="text-sm text-muted-foreground">
                  አንዳንድ ዕቃዎች ሊታለፉ ወይም ሊቧደኑ ይችላሉ። ለተሟላ ትንተና ድጋሚ ይሞክሩ።
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  (Some items may have been skipped or grouped. Consider re-running for complete analysis.)
                </p>
              </div>
              
              {skippedItems.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold mb-2 text-warning">
                    ያልተተነተኑ ዕቃዎች (Skipped Items):
                  </h5>
                  <ul className="space-y-1">
                    {skippedItems.map((item, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-warning" />
                        {item}
                      </li>
                    ))}
                  </ul>
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

        {/* MANDATORY: Goods Interpretation Table */}
        {goodsInterpretationRows.length > 0 && (
          <GoodsInterpretationTable 
            items={goodsInterpretationRows}
            isOfficerReviewMode={isOfficerVerificationMode}
            className="max-w-6xl mx-auto mb-8"
          />
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
                      <TableHead className="font-semibold">እምነት (Confidence)</TableHead>
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
                          <TableCell><ConfidenceBadge level={getItemConfidence(item)} size="sm" showLabel={false} /></TableCell>
                          <TableCell><LicenseBadge status={item.licenseAlignment} /></TableCell>
                          <TableCell><EligibilityBadge status={item.eligibilityStatus || item.policyCompliance} /></TableCell>
                        </TableRow>
                        {expandedRows.includes(item.itemNumber) && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/20 p-0">
                              <div className="p-6 space-y-6">
                              {/* License Evidence */}
                                {item.licenseEvidence && item.licenseEvidence.trim() !== '' && (
                                  <div>
                                    <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-primary" />
                                      የፍቃድ ማስረጃ (License Evidence)
                                    </h5>
                                    <p className="text-sm text-muted-foreground bg-background p-3 rounded border">
                                      {item.licenseEvidence}
                                    </p>
                                  </div>
                                )}

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
                          {action.severity || 'medium'} priority
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {(action.type || 'unknown').replace(/-/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm">{action.description || 'No description provided'}</p>
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
