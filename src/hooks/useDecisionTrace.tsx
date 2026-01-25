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
  | "error";

export type TraceConfidence = "high" | "medium" | "low" | "none";

export interface TraceEvent {
  id: string;
  type: TraceEventType;
  labelAmharic: string;
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
  isAnalyzing: boolean;
  isPanelOpen: boolean;
  currentItemIndex: number | null;

  // Actions
  addEvent: (event: Omit<TraceEvent, "id" | "timestamp">) => void;
  addEngagementSignal: (signal: Omit<EngagementSignal, "id" | "timestamp">) => void;
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

  setAnalyzing: (analyzing) => {
    set({ isAnalyzing: analyzing });
    if (analyzing) {
      // Auto-open panel when analysis starts
      set({ isPanelOpen: true });
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
      currentItemIndex: null,
    });
  },
}));

// Helper to create trace events with proper formatting
export const createTraceEvent = {
  policyIndexed: (clauseCount: number, documentVersions: string[]): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "policy_indexed",
    labelAmharic: "የፖሊሲ ማውጫ ተፈጥሯል",
    labelEnglish: "Policy Indexed",
    action: `Indexed ${clauseCount} clauses from ${documentVersions.length} document(s)`,
    result: `Documents: ${documentVersions.join(", ")}`,
    confidence: clauseCount > 0 ? "high" : "none",
  }),

  annexVerification: (found: boolean, itemCount?: number): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "annex_verification",
    labelAmharic: "አባሪ ማረጋገጫ",
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
    labelAmharic: "ሰነድ ማስገባት",
    labelEnglish: "Document Ingestion",
    action: status === "started" ? `Processing ${fileName}...` : `Processed ${fileName}`,
    result: status === "complete" ? "Text extracted successfully" : status === "error" ? "Extraction failed" : "In progress...",
    confidence: status === "complete" ? "high" : status === "error" ? "none" : "medium",
  }),

  invoicePreservation: (itemCount: number): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "invoice_preservation",
    labelAmharic: "የደረሰኝ ጽሑፍ ማስቀመጥ",
    labelEnglish: "Invoice Preservation",
    action: "Preserving original invoice text verbatim",
    result: `${itemCount} invoice items identified — original text preserved (not translated)`,
    confidence: "high",
  }),

  normalization: (itemNumber: number, original: string, normalized: string): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "normalization",
    labelAmharic: "ዕቃ መደበኛ ማድረግ",
    labelEnglish: "Item Normalization",
    action: `Normalizing: "${original}"`,
    result: `→ "${normalized}"`,
    itemNumber,
    confidence: "medium",
  }),

  clauseQuery: (itemNumber: number, queryTerms: string[]): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "clause_query",
    labelAmharic: "የፍለጋ መጠይቅ",
    labelEnglish: "Clause Query Terms",
    action: `Building search query for item ${itemNumber}`,
    result: `Query terms: [${queryTerms.map(t => `"${t}"`).join(", ")}]`,
    itemNumber,
    confidence: "medium",
  }),

  clauseRetrieval: (itemNumber: number, keywords: string[], foundCount: number, clauseIds: string[]): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "clause_retrieval",
    labelAmharic: "የፖሊሲ አንቀጽ መፈለጊያ",
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
    labelAmharic: "አንቀጽ ማሰር",
    labelEnglish: "Clause Binding",
    action: `Binding clause ${clauseId} to item ${itemNumber}`,
    result: `Bound from ${documentName}, page ${pageNumber}`,
    evidence: { clauseIds: [clauseId], documentName, pageNumber },
    itemNumber,
    confidence: "high",
  }),

  decisionPath: (itemNumber: number, path: "exact" | "mapped" | "essentiality" | "deferred"): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "decision_path",
    labelAmharic: "የውሳኔ መንገድ",
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
    labelAmharic: "የፈቃድ ማመሳከር",
    labelEnglish: "License Alignment",
    action: `Checking license scope: "${scope}"`,
    result: aligned ? "Item aligns with licensed activity" : "Alignment unclear — requires clarification",
    itemNumber,
    confidence: aligned ? "high" : "low",
  }),

  essentialityCheck: (itemNumber: number, status: "passed" | "pending" | "failed"): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "essentiality_check",
    labelAmharic: "አስፈላጊነት ግምገማ",
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
    labelAmharic: "ጥቅስ ማረጋገጫ",
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
    labelAmharic: "የእምነት ነጥብ",
    labelEnglish: "Confidence Score",
    action: `Calculating confidence for item ${itemNumber}`,
    result: `Score: ${score}% | Factors: ${factors.join(", ")}`,
    itemNumber,
    confidence: score >= 80 ? "high" : score >= 50 ? "medium" : "low",
  }),

  decisionOutput: (itemNumber: number, decision: string, clauseCount: number): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "decision_output",
    labelAmharic: "የውሳኔ ውጤት",
    labelEnglish: "Decision Output",
    action: `Finalizing decision for item ${itemNumber}`,
    result: `${decision} (${clauseCount} citation(s) bound)`,
    itemNumber,
    confidence: clauseCount > 0 ? "high" : "low",
  }),

  checkpointState: (stage: string, canResume: boolean): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "checkpoint_state",
    labelAmharic: "ማስቀመጫ ነጥብ",
    labelEnglish: "Checkpoint State",
    action: `Checkpoint saved at: ${stage}`,
    result: canResume ? "Resume available if interrupted" : "Progress saved",
    confidence: "high",
  }),

  blocked: (itemNumber: number | undefined, reason: string, nextAction: string): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "blocked",
    labelAmharic: "ውሳኔ ተቋርጧል",
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
    labelAmharic: "መረጃ",
    labelEnglish: "Info",
    action: message,
    result: "",
  }),

  success: (message: string): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "success",
    labelAmharic: "ተሳክቷል",
    labelEnglish: "Success",
    action: message,
    result: "",
    confidence: "high",
  }),

  warning: (message: string): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "warning",
    labelAmharic: "ማስጠንቀቂያ",
    labelEnglish: "Warning",
    action: message,
    result: "",
    confidence: "low",
  }),

  error: (message: string): Omit<TraceEvent, "id" | "timestamp"> => ({
    type: "error",
    labelAmharic: "ስህተት",
    labelEnglish: "Error",
    action: message,
    result: "",
    confidence: "none",
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
