import { create } from "zustand";

export type TraceEventType = 
  | "policy_indexed"          // Policy indexed (counts + versions)
  | "annex_verification"      // Annex II verification gate
  | "document_ingestion"
  | "invoice_preservation"
  | "normalization"
  | "clause_query"            // Clause retrieval query terms
  | "clause_retrieval"        // Clause IDs retrieved
  | "clause_binding"          // Clause binding success/failure
  | "decision_path"           // Decision path (Annex match vs Essentiality vs Exclusion)
  | "license_alignment"
  | "essentiality_check"
  | "citation_check"          // Citation completeness checks
  | "confidence_score"        // Confidence score
  | "decision_output"
  | "checkpoint_state"        // Resumable checkpoint state
  | "blocked"
  | "info"
  | "success"
  | "warning"
  | "error"
  // License-first workflow stages
  | "license_extracted"
  | "guideline_matched"
  | "categories_loaded"
  | "item_clause_bound"
  | "citation_validated";

export type TraceConfidence = "high" | "medium" | "low" | "none";

// License-first workflow stages for progress tracking
export type WorkflowStage = 
  | "license_extracted"
  | "guideline_matched"
  | "categories_loaded"
  | "item_clause_bound"
  | "citation_validated";

export interface WorkflowStageInfo {
  id: WorkflowStage;
  labelEnglish: string;
  status: "pending" | "in_progress" | "complete" | "failed";
  timestamp?: Date;
}

export const WORKFLOW_STAGES: WorkflowStageInfo[] = [
  { id: "license_extracted", labelEnglish: "License extracted", status: "pending" },
  { id: "guideline_matched", labelEnglish: "Guideline section matched", status: "pending" },
  { id: "categories_loaded", labelEnglish: "Allowed categories loaded", status: "pending" },
  { id: "item_clause_bound", labelEnglish: "Item clause bound", status: "pending" },
  { id: "citation_validated", labelEnglish: "Citation validated", status: "pending" },
];

export interface TraceEvent {
  id: string;
  type: TraceEventType;
  labelEnglish: string;
  action: string;
  result: string;
  evidence?: {
    clauseIds?: string[];
    documentName?: string;
    pageNumber?: number;
    quote?: string;
  };
  confidence?: TraceConfidence;
  timestamp: Date;
  itemNumber?: number;
  isBlocked?: boolean;
  nextAction?: string;
}

export interface EngagementSignal {
  id: string;
  message: string;
  type: "evidence_collected" | "citations_complete" | "awaiting_clarification" | "ready_for_report";
  timestamp: Date;
}

interface DecisionTraceStore {
  events: TraceEvent[];
  engagementSignals: EngagementSignal[];
  workflowStages: WorkflowStageInfo[];
  isAnalyzing: boolean;
  isPanelOpen: boolean;
  currentItemIndex: number | null;

  // Actions
  addEvent: (event: Omit<TraceEvent, "id" | "timestamp">) => void;
  addEngagementSignal: (signal: Omit<EngagementSignal, "id" | "timestamp">) => void;
  updateWorkflowStage: (stageId: WorkflowStage, status: WorkflowStageInfo["status"]) => void;
  resetWorkflowStages: () => void;
  setAnalyzing: (analyzing: boolean) => void;
  setCurrentItem: (index: number | null) => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  clear: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useDecisionTrace = create<DecisionTraceStore>((set, get) => ({
  events: [],
  engagementSignals: [],
  workflowStages: WORKFLOW_STAGES.map(s => ({ ...s })),
  isAnalyzing: false,
  isPanelOpen: true,
  currentItemIndex: null,

  addEvent: (event) => {
    const newEvent: TraceEvent = {
      ...event,
      id: generateId(),
      timestamp: new Date(),
    };
    set((state) => ({
      events: [...state.events, newEvent],
    }));

    // Auto-update workflow stages based on event type
    const stageMapping: Record<string, WorkflowStage> = {
      license_extracted: "license_extracted",
      guideline_matched: "guideline_matched",
      categories_loaded: "categories_loaded",
      item_clause_bound: "item_clause_bound",
      citation_validated: "citation_validated",
      // Also map legacy events to stages
      license_alignment: "license_extracted",
      clause_binding: "item_clause_bound",
      citation_check: "citation_validated",
    };

    const mappedStage = stageMapping[event.type];
    if (mappedStage) {
      const status = event.isBlocked ? "failed" : "complete";
      get().updateWorkflowStage(mappedStage, status);
    }
  },

  addEngagementSignal: (signal) => {
    const newSignal: EngagementSignal = {
      ...signal,
      id: generateId(),
      timestamp: new Date(),
    };
    set((state) => ({
      engagementSignals: [...state.engagementSignals, newSignal],
    }));
  },

  updateWorkflowStage: (stageId, status) => {
    set((state) => ({
      workflowStages: state.workflowStages.map((stage) =>
        stage.id === stageId
          ? { ...stage, status, timestamp: new Date() }
          : stage
      ),
    }));
  },

  resetWorkflowStages: () => {
    set({
      workflowStages: WORKFLOW_STAGES.map(s => ({ ...s, status: "pending" as const, timestamp: undefined })),
    });
  },

  setAnalyzing: (analyzing) => {
    set({ isAnalyzing: analyzing });
    if (analyzing) {
      // Auto-open panel and reset workflow stages when analysis starts
      set({ isPanelOpen: true });
      get().resetWorkflowStages();
    }
  },

  setCurrentItem: (index) => {
    set({ currentItemIndex: index });
  },

  togglePanel: () => {
    set((state) => ({ isPanelOpen: !state.isPanelOpen }));
  },

  setPanelOpen: (open) => {
    set({ isPanelOpen: open });
  },

  clear: () => {
    set({
      events: [],
      engagementSignals: [],
      workflowStages: WORKFLOW_STAGES.map(s => ({ ...s, status: "pending" as const, timestamp: undefined })),
      currentItemIndex: null,
    });
  },
}));

// Helper to create trace events with proper formatting
export const createTraceEvent = {
  policyIndexed: (clauseCount: number, documentVersions: string[]): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "policy_indexed",
    labelEnglish: "Policy Indexed",
    action: `Indexed ${clauseCount} clauses from ${documentVersions.length} document(s)`,
    result: `Documents: ${documentVersions.join(", ")}`,
    confidence: clauseCount > 0 ? "high" : "none",
  }),

  annexVerification: (found: boolean, itemCount?: number): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "annex_verification",
    labelEnglish: "Annex II Verification",
    action: "Checking for Capital Goods List (Annex II)",
    result: found 
      ? `✓ Annex II present with ${itemCount || 0} items indexed` 
      : "🚫 Annex II (Capital Goods List) NOT FOUND — Admin action required",
    confidence: found ? "high" : "none",
    isBlocked: !found,
    nextAction: !found ? "Admin must upload policy documents containing Capital Goods List" : undefined,
  }),

  documentIngestion: (fileName: string, status: "started" | "complete" | "error"): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "document_ingestion",
    labelEnglish: "Document Ingestion",
    action: status === "started" ? `Processing ${fileName}...` : `Processed ${fileName}`,
    result: status === "complete" ? "Text extracted successfully" : status === "error" ? "Extraction failed" : "In progress...",
    confidence: status === "complete" ? "high" : status === "error" ? "none" : "medium",
  }),

  invoicePreservation: (itemCount: number): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "invoice_preservation",
    labelEnglish: "Invoice Preservation",
    action: "Preserving original invoice text verbatim",
    result: `${itemCount} invoice items identified — original text preserved (not translated)`,
    confidence: "high",
  }),

  normalization: (itemNumber: number, original: string, normalized: string): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "normalization",
    labelEnglish: "Item Normalization",
    action: `Normalizing: "${original}"`,
    result: `→ "${normalized}"`,
    itemNumber,
    confidence: "medium",
  }),

  clauseQuery: (itemNumber: number, queryTerms: string[]): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "clause_query",
    labelEnglish: "Clause Query Terms",
    action: `Building search query for item ${itemNumber}`,
    result: `Query terms: [${queryTerms.map(t => `"${t}"`).join(", ")}]`,
    itemNumber,
    confidence: "medium",
  }),

  clauseRetrieval: (itemNumber: number, keywords: string[], foundCount: number, clauseIds: string[]): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "clause_retrieval",
    labelEnglish: "Clause Retrieval",
    action: `Search PolicyClauseIndex using keywords: [${keywords.map(k => `"${k}"`).join(", ")}]`,
    result: foundCount > 0 ? `${foundCount} candidate clause(s) found` : "No clauses found",
    evidence: foundCount > 0 ? { clauseIds } : undefined,
    itemNumber,
    confidence: foundCount > 0 ? "medium" : "none",
    isBlocked: foundCount === 0,
  }),

  clauseBinding: (itemNumber: number, clauseId: string, documentName: string, pageNumber: number): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "clause_binding",
    labelEnglish: "Clause Binding",
    action: `Binding clause ${clauseId} to item ${itemNumber}`,
    result: `Bound from ${documentName}, page ${pageNumber}`,
    evidence: { clauseIds: [clauseId], documentName, pageNumber },
    itemNumber,
    confidence: "high",
  }),

  decisionPath: (itemNumber: number, path: "exact" | "mapped" | "essentiality" | "deferred"): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "decision_path",
    labelEnglish: "Decision Path",
    action: `Determining decision path for item ${itemNumber}`,
    result: path === "exact" ? "Exact Match — item found in Capital Goods List" :
            path === "mapped" ? "Mapped Match — functionally equivalent item identified" :
            path === "essentiality" ? "Essentiality Test Required — officer review needed" :
            "Decision Deferred — insufficient policy coverage",
    itemNumber,
    confidence: path === "exact" ? "high" : path === "mapped" ? "medium" : "low",
    isBlocked: path === "deferred",
  }),

  licenseAlignment: (itemNumber: number, scope: string, aligned: boolean): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "license_alignment",
    labelEnglish: "License Alignment",
    action: `Checking license scope: "${scope}"`,
    result: aligned ? "Item aligns with licensed activity" : "Alignment unclear — requires clarification",
    itemNumber,
    confidence: aligned ? "high" : "low",
  }),

  essentialityCheck: (itemNumber: number, status: "passed" | "pending" | "failed"): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "essentiality_check",
    labelEnglish: "Essentiality Evaluation",
    action: `Evaluating essentiality for item ${itemNumber}`,
    result: status === "passed" ? "Essential to licensed operation" :
            status === "pending" ? "Requires officer determination" :
            "Not essential to core operation",
    itemNumber,
    confidence: status === "passed" ? "high" : "medium",
  }),

  citationCheck: (itemNumber: number, complete: boolean, missingFields: string[]): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "citation_check",
    labelEnglish: "Citation Completeness",
    action: `Validating citations for item ${itemNumber}`,
    result: complete 
      ? "✓ All required citation fields present" 
      : `⚠️ Missing: ${missingFields.join(", ")}`,
    itemNumber,
    confidence: complete ? "high" : "none",
    isBlocked: !complete,
  }),

  confidenceScore: (itemNumber: number, score: number, factors: string[]): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "confidence_score",
    labelEnglish: "Confidence Score",
    action: `Calculating confidence for item ${itemNumber}`,
    result: `Score: ${score}% | Factors: ${factors.join(", ")}`,
    itemNumber,
    confidence: score >= 80 ? "high" : score >= 50 ? "medium" : "low",
  }),

  decisionOutput: (itemNumber: number, decision: string, clauseCount: number): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "decision_output",
    labelEnglish: "Decision Output",
    action: `Finalizing decision for item ${itemNumber}`,
    result: `${decision} (${clauseCount} citation(s) bound)`,
    itemNumber,
    confidence: clauseCount > 0 ? "high" : "low",
  }),

  checkpointState: (stage: string, canResume: boolean): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "checkpoint_state",
    labelEnglish: "Checkpoint State",
    action: `Checkpoint saved at: ${stage}`,
    result: canResume ? "Resume available if interrupted" : "Progress saved",
    confidence: "high",
  }),

  blocked: (itemNumber: number | undefined, reason: string, nextAction: string): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "blocked",
    labelEnglish: "Decision Blocked",
    action: "Analysis blocked",
    result: reason,
    itemNumber,
    isBlocked: true,
    nextAction,
    confidence: "none",
  }),

  info: (message: string): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "info",
    labelEnglish: "Info",
    action: message,
    result: "",
  }),

  success: (message: string): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "success",
    labelEnglish: "Success",
    action: message,
    result: "",
    confidence: "high",
  }),

  warning: (message: string): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "warning",
    labelEnglish: "Warning",
    action: message,
    result: "",
    confidence: "low",
  }),

  error: (message: string): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "error",
    labelEnglish: "Error",
    action: message,
    result: "",
    confidence: "none",
  }),

  // License-first workflow stage events
  licenseExtracted: (licenseName: string, licenseType: string): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "license_extracted",
    labelEnglish: "License Extracted",
    action: "Extracting license information verbatim",
    result: `License: "${licenseName}" | Type: "${licenseType}"`,
    confidence: licenseName ? "high" : "none",
  }),

  guidelineMatched: (matchStatus: "matched" | "partial" | "not_found", sectionTitle?: string, pageNumber?: number): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "guideline_matched",
    labelEnglish: "Guideline Section Matched",
    action: "Searching Policy Clause Index for matching guideline",
    result: matchStatus === "matched" 
      ? `✓ Matched: "${sectionTitle}" (p.${pageNumber})`
      : matchStatus === "partial"
      ? `⚠️ Partial match: "${sectionTitle}" (p.${pageNumber}) — manual review recommended`
      : "🚫 Not found — guideline mapping failed",
    evidence: sectionTitle && pageNumber ? { documentName: sectionTitle, pageNumber } : undefined,
    confidence: matchStatus === "matched" ? "high" : matchStatus === "partial" ? "medium" : "none",
    isBlocked: matchStatus === "not_found",
    nextAction: matchStatus === "not_found" ? "Admin must confirm guideline contains this license type OR update policy library" : undefined,
  }),

  categoriesLoaded: (categoryCount: number, categories: string[]): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "categories_loaded",
    labelEnglish: "Allowed Categories Loaded",
    action: "Loading allowed capital goods categories for this license type",
    result: categoryCount > 0 
      ? `${categoryCount} categories: ${categories.slice(0, 3).join(", ")}${categories.length > 3 ? "..." : ""}`
      : "No specific categories defined — general eligibility applies",
    confidence: categoryCount > 0 ? "high" : "medium",
  }),

  itemClauseBound: (itemNumber: number, clauseId: string, documentName: string, pageNumber: number): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "item_clause_bound",
    labelEnglish: "Item Clause Bound",
    action: `Binding item ${itemNumber} to policy clause`,
    result: `Bound to ${clauseId} from "${documentName}" (p.${pageNumber})`,
    evidence: { clauseIds: [clauseId], documentName, pageNumber },
    itemNumber,
    confidence: "high",
  }),

  citationValidated: (itemNumber: number, isValid: boolean, missingFields?: string[]): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "citation_validated",
    labelEnglish: "Citation Validated",
    action: `Validating citation completeness for item ${itemNumber}`,
    result: isValid 
      ? "✓ Citation complete: document, section, and page verified"
      : `⚠️ Incomplete: missing ${missingFields?.join(", ") || "required fields"}`,
    itemNumber,
    confidence: isValid ? "high" : "low",
    isBlocked: !isValid,
    nextAction: !isValid ? "Provide complete citation with document name, section, and page number" : undefined,
  }),
};

// Engagement signal creators
export const createEngagementSignal = {
  evidenceCollected: (count: number): Omit<EngagementSignal, "id" | "timestamp"> => ({
    type: "evidence_collected",
    message: `Evidence collected: ${count} clauses ✓`,
  }),

  citationsComplete: (): Omit<EngagementSignal, "id" | "timestamp"> => ({
    type: "citations_complete",
    message: "Citations complete ✓",
  }),

  awaitingClarification: (): Omit<EngagementSignal, "id" | "timestamp"> => ({
    type: "awaiting_clarification",
    message: "Awaiting officer clarification ⚠️",
  }),

  readyForReport: (): Omit<EngagementSignal, "id" | "timestamp"> => ({
    type: "ready_for_report",
    message: "Ready for supervisor report 📄",
  }),
};
