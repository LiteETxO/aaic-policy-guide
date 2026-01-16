// Types for the formal Decision Analysis Report

export type EligibilityStatus = 
  | "Eligible – Listed Capital Good" 
  | "Eligible – Listed Capital Good (Mapped)" 
  | "Eligible – Essential Capital Good (Not Listed)" 
  | "Requires Clarification" 
  | "Not Eligible";

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

export interface ComplianceItem {
  itemNumber: number;
  invoiceItem: string;
  normalizedName: string;
  category?: string;
  specs?: string;
  invoiceRef?: string;
  matchResult?: MatchingMethod;
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
  languagesDetected?: string[];
  pageCount?: number;
  ocrConfidence?: string;
  keySectionsDetected?: string[];
  unreadablePages?: number[];
  readStatus?: string;
}

export interface PolicyBasis {
  documentName: string;
  issuingAuthority?: string;
  relevantArticles: string[];
  pageNumbers: number[];
  quotedClauses: string[];
}

export interface ActionItem {
  type: "missing" | "unreadable" | "conflict" | "policy-gap" | "missing-evidence" | "ambiguous-mapping" | "document-ingestion-blocked";
  description: string;
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
  totalItemsReviewed: number;
  eligibleCount: number;
  clarificationCount: number;
  notEligibleCount: number;
  topIssues: string[];
  additionalInfoNeeded: string[];
  recommendation: string;
}

export interface LicenseSnapshot {
  licensedActivity: string;
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

export interface DecisionReportData {
  metadata: ReportMetadata;
  executiveSummary: ExecutiveSummary;
  documentsReviewed: DocumentReviewed[];
  policyBasis: PolicyBasis[];
  complianceItems: ComplianceItem[];
  analyticalNotes?: AnalyticalNotes;
  issuesAndClarifications: ActionItem[];
  licenseSnapshot?: LicenseSnapshot;
  conclusion: {
    canProceed: string[];
    requiresClarification: string[];
    cannotApprove: string[];
    officerAuthorityReminder: string;
  };
}
