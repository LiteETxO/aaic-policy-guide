// Types for the formal Decision Analysis Report
// Aligned with AAIC bilingual (Amharic-first) requirements

export type EligibilityStatus = 
  | "Eligible – Listed Capital Good" 
  | "Eligible – Listed Capital Good (Mapped)" 
  | "Eligible – Essential Capital Good (Not Listed)" 
  | "Requires Clarification" 
  | "Not Eligible"
  | "Policy Gap – Admin Action Required";

export type LicenseAlignment = "Aligned" | "Conditional" | "Needs Clarification" | "Not Aligned";

export type MatchingMethod = "Exact" | "Mapped" | "Essential" | "Not Matched";

export interface Citation {
  documentName: string;
  articleSection: string;
  pageNumber: number;
  quote: string;
  relevance: string;
}

export interface ReasoningPoint {
  point: string;
  type: "listed-match" | "mapped-match" | "essential-inclusion" | "exclusion" | "ambiguity" | "match" | "assumption-avoided";
}

export interface EssentialityAnalysis {
  functionalNecessity: string;
  operationalLink: string;
  capitalNature: string;
  noProhibition: string;
}

export interface MatchCandidate {
  policyEntry: string;
  similarities: string;
  differences: string;
  confidence: "High" | "Medium" | "Low";
}

export interface ComplianceItem {
  itemNumber: number;
  invoiceItem: string;
  normalizedName: string;
  category?: string;
  specs?: string;
  invoiceRef?: string;
  matchResult?: MatchingMethod;
  matchCandidates?: MatchCandidate[];
  eligibilityStatus?: EligibilityStatus;
  eligibilityPath?: string;
  licenseAlignment: LicenseAlignment;
  licenseEvidence: string;
  citations: Citation[];
  essentialityAnalysis?: EssentialityAnalysis;
  reasoning: ReasoningPoint[];
  policyCompliance?: string;
}

export interface DocumentReviewed {
  documentName: string;
  documentType: string;
  issuingAuthority?: string;
  languagesDetected?: string[];
  pageCount?: number;
  ocrConfidence?: string;
  keySectionsDetected?: string[];
  capitalGoodsListPresent?: boolean;
  annexesDetected?: string[];
  articlesIndexed?: Array<{ articleNumber: string; page: number }>;
  unreadablePages?: number[];
  readStatus?: string;
}

export interface PolicyBasis {
  documentName: string;
  issuingAuthority?: string;
  relevantArticles: string[];
  pageNumbers: number[];
  quotedClauses: string[];
  quotedClausesAmharic?: string[];
}

export interface ActionItem {
  type: "missing" | "unreadable" | "conflict" | "policy-gap" | "missing-evidence" | "ambiguous-mapping" | "document-ingestion-blocked";
  description: string;
  descriptionAmharic?: string;
  severity: "high" | "medium" | "low";
  relatedItems?: number[];
  whatIsMissing?: string;
  whyItMatters?: string;
  resolutionAction?: string;
}

export interface ReportMetadata {
  investorName: string;
  licenseNumber: string;
  caseReferenceId: string;
  dateOfAnalysis: string;
  preparedBy: string;
}

export interface ExecutiveSummary {
  overallStatus: string;
  overallStatusAmharic?: string;
  totalItemsReviewed: number;
  eligibleCount: number;
  clarificationCount: number;
  notEligibleCount: number;
  topIssues: string[];
  topIssuesAmharic?: string[];
  additionalInfoNeeded: string[];
  recommendation: string;
}

export interface LicenseSnapshot {
  licensedActivity: string;
  licensedActivityAmharic?: string;
  sector: string;
  scopeOfOperation: string;
  restrictions: string;
  licenseNumber?: string;
  issueDate?: string;
}

export interface AnalyticalNotes {
  nameMismatchHandling: string[];
  essentialityDecisions: string[];
  conservativeAssumptions: string[];
  officerDiscretion: string[];
}

export interface PolicyIndex {
  documentName: string;
  articleSection: string;
  pageNumber: number;
  clauseHeading: string;
  clauseHeadingAmharic?: string;
  scopeOfApplication: string;
  keywords: string[];
}

export interface LicenseUnderstanding {
  licensedActivity: string;
  licensedActivityAmharic?: string;
  scopeLimitations: string;
  conditions: string;
  licenseNumber?: string;
  extractionStatus: string;
}

export interface InvoiceUnderstanding {
  totalLineItems: number;
  itemsWithSpecs: number;
  ambiguousItems: number;
  invoiceLanguage?: string;
  readabilityStatus: string;
}

export interface DocumentComprehension {
  gateStatus: "PASSED" | "BLOCKED";
  blockedReason?: string;
  documents: DocumentReviewed[];
  policyIndex: PolicyIndex[];
  licenseUnderstanding: LicenseUnderstanding;
  invoiceUnderstanding: InvoiceUnderstanding;
  analysisPermissionStatement: string;
}

export interface AnalysisCompleteness {
  totalInvoiceItems: number;
  analyzedItems: number;
  isComplete: boolean;
  skippedItems?: number[];
  completenessNote: string;
}

export interface Conclusion {
  canProceed: string[];
  requiresClarification: string[];
  cannotApprove: string[];
  officerAuthorityReminder: string;
}

export interface DecisionReportData {
  documentComprehension?: DocumentComprehension;
  metadata: ReportMetadata;
  executiveSummary: ExecutiveSummary;
  documentsReviewed: DocumentReviewed[];
  policyBasis: PolicyBasis[];
  complianceItems: ComplianceItem[];
  analyticalNotes?: AnalyticalNotes;
  analysisCompleteness?: AnalysisCompleteness;
  issuesAndClarifications: ActionItem[];
  licenseSnapshot?: LicenseSnapshot;
  conclusion: Conclusion;
}
