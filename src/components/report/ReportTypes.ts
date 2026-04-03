// Types for the formal Decision Analysis Report
// Aligned with AAIC bilingual (Amharic-first) requirements
// Enhanced with Policy Clause Index enforcement

export type EligibilityStatus = 
  | "Eligible – Listed Capital Good" 
  | "Eligible – Listed Capital Good (Mapped)" 
  | "Eligible – Essential Capital Good (Not Listed)" 
  | "Decision Deferred — Citation Incomplete"
  | "Requires Clarification" 
  | "Not Eligible"
  | "Policy Gap – Admin Action Required";

export type LicenseAlignment = "Aligned" | "Conditional" | "Needs Clarification" | "Not Aligned";

export type MatchingMethod = "Exact" | "Mapped" | "Essential" | "Not Matched";

export type ClauseSectionType = "Article" | "Annex" | "Schedule" | "Item";

export type ClauseInclusionType = "enabling" | "restrictive" | "exclusion" | "procedural";

export type ClauseAppliesTo = 
  | "capital_goods" 
  | "customs_duty" 
  | "income_tax" 
  | "essentiality" 
  | "exclusion" 
  | "general_incentive";

// Policy Clause Index Entry - MANDATORY for all citations
export interface PolicyClause {
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

// Enhanced Citation with clause_id reference (optional for backwards compatibility)
export interface Citation {
  clause_id?: string; // Reference to policyClauseIndex - REQUIRED in new format, optional for legacy
  documentName: string;
  articleSection: string;
  pageNumber: number;
  quote: string;
  relevance: string;
}

export interface ReasoningPoint {
  point: string;
  type: "listed-match" | "mapped-match" | "essential-inclusion" | "exclusion" | "ambiguity" | "match" | "assumption-avoided" | "clause-reference";
}

export interface EssentialityAnalysis {
  functionalNecessity: string;
  operationalLink: string;
  capitalNature: string;
  noProhibition: string;
  testResult?: "PASSED" | "FAILED" | "INCONCLUSIVE";
  supportingClauseIds?: string[]; // Clause IDs that support essentiality determination
}

export interface MatchCandidate {
  policyEntry: string;
  similarities: string;
  differences: string;
  confidence: "High" | "Medium" | "Low";
  sourceClauseId?: string; // Reference to the clause containing this entry
}

export interface ComplianceItem {
  itemNumber: number;
  invoiceItem: string;
  normalizedName?: string;
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
  referencedClauseIds?: string[]; // Array of clause_ids from policyClauseIndex (optional for backwards compatibility)
  essentialityAnalysis?: EssentialityAnalysis;
  reasoning: ReasoningPoint[];
  policyCompliance?: string;
  notEligibleJustification?: string; // REQUIRED if status is Not Eligible
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
  articlesIndexed?: Array<{ articleNumber: string; page: number; clauseSummary?: string }>;
  unreadablePages?: number[];
  readStatus?: string;
  clausesExtracted?: number; // Count of clauses extracted from this document
}

export interface PolicyBasis {
  documentName: string;
  issuingAuthority?: string;
  relevantArticles: string[];
  pageNumbers: number[];
  quotedClauses: string[];
  quotedClausesAmharic?: string[];
  referencedClauseIds?: string[]; // Clause IDs from policy clause index
}

export interface ActionItem {
  type: "missing" | "unreadable" | "conflict" | "policy-gap" | "missing-evidence" | "ambiguous-mapping" | "document-ingestion-blocked" | "citation-incomplete" | "essentiality-review";
  description: string;
  descriptionAmharic?: string;
  severity: "high" | "medium" | "low";
  relatedItems?: number[];
  whatIsMissing?: string;
  whyItMatters?: string;
  resolutionAction?: string;
  missingClauseTypes?: ClauseAppliesTo[]; // What types of clauses are missing
}

export interface ReportMetadata {
  investorName: string;
  licenseNumber: string;
  caseReferenceId: string;
  dateOfAnalysis: string;
  preparedBy: string;
}

// Policy Clause Index Summary for Document Comprehension
export interface PolicyClauseIndexSummary {
  totalClausesIndexed: number;
  clauseIdsAvailable: string[];
  capitalGoodsClauses: number;
  essentialityClauses: number;
  exclusionClauses: number;
  generalIncentiveClauses: number;
  isComplete: boolean;
  missingClauseTypes?: ClauseAppliesTo[];
}

export interface ExecutiveSummary {
  overallStatus: string;
  overallStatusAmharic?: string;
  totalItemsReviewed: number;
  eligibleCount: number;
  clarificationCount: number;
  notEligibleCount: number;
  deferredCount?: number; // Items with Decision Deferred — Citation Incomplete
  topIssues: string[];
  topIssuesAmharic?: string[];
  additionalInfoNeeded: string[];
  recommendation: string;
  clauseIndexCompleteness?: string; // Statement about policy clause index coverage
  notEligibleJustification?: string; // REQUIRED if notEligibleCount > 0
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
  clauseSelectionRationale?: string[]; // Why specific clauses were selected
  policySeparationCompliance?: string; // Confirmation of income/customs separation
}

export interface PolicyIndex {
  documentName: string;
  articleSection: string;
  pageNumber: number;
  clauseHeading: string;
  clauseHeadingAmharic?: string;
  clauseText?: string;
  scopeOfApplication: string;
  keywords: string[];
  clause_id?: string; // Link to full PolicyClause
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
  policyClauseIndex?: PolicyClause[]; // MANDATORY - Full policy clause index
  policyClauseIndexSummary?: PolicyClauseIndexSummary; // Summary for quick validation
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
  itemsWithValidCitations?: number; // Items with proper clause_id references
  itemsDeferredForCitations?: number; // Items marked as Decision Deferred
}

export interface Conclusion {
  canProceed: string[];
  requiresClarification: string[];
  cannotApprove: string[];
  deferredForCitations?: string[]; // Items deferred due to citation issues
  officerAuthorityReminder: string;
  antiInferenceCompliance?: string; // Confirmation of policy separation
}

export interface DecisionReportData {
  documentComprehension?: DocumentComprehension;
  metadata: ReportMetadata;
  executiveSummary: ExecutiveSummary;
  documentsReviewed: DocumentReviewed[];
  policyBasis: PolicyBasis[];
  policyClauseIndex?: PolicyClause[]; // Top-level access to full clause index
  complianceItems: ComplianceItem[];
  analyticalNotes?: AnalyticalNotes;
  analysisCompleteness?: AnalysisCompleteness;
  issuesAndClarifications: ActionItem[];
  licenseSnapshot?: LicenseSnapshot;
  conclusion: Conclusion;
}
