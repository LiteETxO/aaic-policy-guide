import { create } from "zustand";

export type WorkflowPhase = "POLICY_IMPORT" | "CASE_IMPORT" | "ANALYSIS" | "IDLE";
export type WorkflowState = "RUNNING" | "BLOCKED" | "COMPLETE" | "ERROR" | "IDLE" | "NETWORK_RETRY_READY";

export interface WorkflowStage {
  id: string;
  label: string;
  progress: number;
}

// Phase A - Policy Import stages
export const POLICY_IMPORT_STAGES: WorkflowStage[] = [
  { id: "RECEIVED_FILES", label: "Receiving Files", progress: 10 },
  { id: "OCR_AND_TEXT_EXTRACTION", label: "OCR & Text Extraction", progress: 25 },
  { id: "STRUCTURE_DETECTION", label: "Structure Detection", progress: 45 },
  { id: "POLICY_INDEX_BUILD", label: "Policy Index Build", progress: 60 },
  { id: "CITATION_MAPPING", label: "Citation Mapping", progress: 80 },
  { id: "VALIDATION_COMPLETE", label: "Validation Complete", progress: 100 },
];

// Phase B - Case Import stages
export const CASE_IMPORT_STAGES: WorkflowStage[] = [
  { id: "RECEIVED_FILES", label: "Receiving Files", progress: 10 },
  { id: "OCR_AND_TEXT_EXTRACTION", label: "OCR & Text Extraction", progress: 35 },
  { id: "FIELD_EXTRACTION", label: "Field Extraction", progress: 60 },
  { id: "READABILITY_AND_COMPLETENESS_CHECK", label: "Readability Check", progress: 85 },
  { id: "CASE_READY", label: "Case Ready", progress: 100 },
];

// Phase C - Analysis stages
export const ANALYSIS_STAGES: WorkflowStage[] = [
  { id: "ANALYSIS_START", label: "Starting Analysis", progress: 10 },
  { id: "ITEM_NORMALIZATION", label: "Item Normalization", progress: 25 },
  { id: "LIST_MATCHING", label: "List Matching", progress: 55 },
  { id: "LICENSE_ALIGNMENT_CHECK", label: "License Alignment Check", progress: 70 },
  { id: "ESSENTIALITY_EVALUATION", label: "Essentiality Evaluation", progress: 85 },
  { id: "DECISION_TABLE_AND_CITATIONS_OUTPUT", label: "Generating Results", progress: 100 },
  { id: "NETWORK_RETRY_READY", label: "Network Retry Ready", progress: 55 },
];

export interface WorkflowStatus {
  phase: WorkflowPhase;
  stageId: string;
  stageLabel: string;
  progress: number;
  state: WorkflowState;
  blockingReason: string | null;
  nextAction: string | null;
  documentStatuses: DocumentStatus[];
  policyLibraryReady: boolean;
  caseFilesReady: boolean;
  // Network error state
  isNetworkError: boolean;
  networkErrorStage: string | null;
}

export interface DocumentStatus {
  name: string;
  type: "policy" | "license" | "invoice" | "supporting";
  status: "pending" | "processing" | "complete" | "error";
  progress: number;
  error?: string;
}

interface WorkflowStore {
  status: WorkflowStatus;
  
  // Actions
  startPolicyImport: () => void;
  updatePolicyImportStage: (stageId: string) => void;
  completePolicyImport: () => void;
  blockPolicyImport: (reason: string, nextAction: string) => void;
  
  startCaseImport: () => void;
  updateCaseImportStage: (stageId: string) => void;
  completeCaseImport: () => void;
  blockCaseImport: (reason: string, nextAction: string) => void;
  
  startAnalysis: () => void;
  updateAnalysisStage: (stageId: string) => void;
  completeAnalysis: () => void;
  blockAnalysis: (reason: string, nextAction: string) => void;
  errorAnalysis: (reason: string) => void;
  setNetworkRetryReady: (stage: string) => void;
  clearNetworkError: () => void;
  
  addDocumentStatus: (doc: DocumentStatus) => void;
  updateDocumentStatus: (name: string, updates: Partial<DocumentStatus>) => void;
  
  reset: () => void;
  setPolicyLibraryReady: (ready: boolean) => void;
  setCaseFilesReady: (ready: boolean) => void;
}

const initialStatus: WorkflowStatus = {
  phase: "IDLE",
  stageId: "",
  stageLabel: "",
  progress: 0,
  state: "IDLE",
  blockingReason: null,
  nextAction: null,
  documentStatuses: [],
  policyLibraryReady: false,
  caseFilesReady: false,
  isNetworkError: false,
  networkErrorStage: null,
};

export const useWorkflowStatus = create<WorkflowStore>((set, get) => ({
  status: initialStatus,

  startPolicyImport: () => {
    const stage = POLICY_IMPORT_STAGES[0];
    set({
      status: {
        ...get().status,
        phase: "POLICY_IMPORT",
        stageId: stage.id,
        stageLabel: stage.label,
        progress: stage.progress,
        state: "RUNNING",
        blockingReason: null,
        nextAction: null,
      },
    });
  },

  updatePolicyImportStage: (stageId: string) => {
    const stage = POLICY_IMPORT_STAGES.find((s) => s.id === stageId);
    if (stage) {
      set({
        status: {
          ...get().status,
          stageId: stage.id,
          stageLabel: stage.label,
          progress: stage.progress,
        },
      });
    }
  },

  completePolicyImport: () => {
    set({
      status: {
        ...get().status,
        phase: "POLICY_IMPORT",
        stageId: "VALIDATION_COMPLETE",
        stageLabel: "Policy Library Ready for Analysis",
        progress: 100,
        state: "COMPLETE",
        policyLibraryReady: true,
      },
    });
  },

  blockPolicyImport: (reason: string, nextAction: string) => {
    set({
      status: {
        ...get().status,
        state: "BLOCKED",
        blockingReason: reason,
        nextAction: nextAction,
      },
    });
  },

  startCaseImport: () => {
    const stage = CASE_IMPORT_STAGES[0];
    set({
      status: {
        ...get().status,
        phase: "CASE_IMPORT",
        stageId: stage.id,
        stageLabel: stage.label,
        progress: stage.progress,
        state: "RUNNING",
        blockingReason: null,
        nextAction: null,
      },
    });
  },

  updateCaseImportStage: (stageId: string) => {
    const stage = CASE_IMPORT_STAGES.find((s) => s.id === stageId);
    if (stage) {
      set({
        status: {
          ...get().status,
          stageId: stage.id,
          stageLabel: stage.label,
          progress: stage.progress,
        },
      });
    }
  },

  completeCaseImport: () => {
    set({
      status: {
        ...get().status,
        phase: "CASE_IMPORT",
        stageId: "CASE_READY",
        stageLabel: "Case File Ready for Analysis",
        progress: 100,
        state: "COMPLETE",
        caseFilesReady: true,
      },
    });
  },

  blockCaseImport: (reason: string, nextAction: string) => {
    set({
      status: {
        ...get().status,
        state: "BLOCKED",
        blockingReason: reason,
        nextAction: nextAction,
      },
    });
  },

  startAnalysis: () => {
    const { policyLibraryReady, caseFilesReady } = get().status;
    
    if (!policyLibraryReady) {
      set({
        status: {
          ...get().status,
          phase: "ANALYSIS",
          state: "BLOCKED",
          blockingReason: "Policy/Case Ingestion Incomplete",
          nextAction: "Complete Policy Import Phase First",
        },
      });
      return;
    }
    
    if (!caseFilesReady) {
      set({
        status: {
          ...get().status,
          phase: "ANALYSIS",
          state: "BLOCKED",
          blockingReason: "Policy/Case Ingestion Incomplete",
          nextAction: "Complete Case Import Phase First",
        },
      });
      return;
    }
    
    const stage = ANALYSIS_STAGES[0];
    set({
      status: {
        ...get().status,
        phase: "ANALYSIS",
        stageId: stage.id,
        stageLabel: stage.label,
        progress: stage.progress,
        state: "RUNNING",
        blockingReason: null,
        nextAction: null,
      },
    });
  },

  updateAnalysisStage: (stageId: string) => {
    const stage = ANALYSIS_STAGES.find((s) => s.id === stageId);
    if (stage) {
      set({
        status: {
          ...get().status,
          stageId: stage.id,
          stageLabel: stage.label,
          progress: stage.progress,
        },
      });
    }
  },

  completeAnalysis: () => {
    set({
      status: {
        ...get().status,
        phase: "ANALYSIS",
        stageId: "DECISION_TABLE_AND_CITATIONS_OUTPUT",
        stageLabel: "Analysis Complete",
        progress: 100,
        state: "COMPLETE",
      },
    });
  },

  blockAnalysis: (reason: string, nextAction: string) => {
    set({
      status: {
        ...get().status,
        state: "BLOCKED",
        blockingReason: reason,
        nextAction: nextAction,
      },
    });
  },

  errorAnalysis: (reason: string) => {
    set({
      status: {
        ...get().status,
        state: "ERROR",
        blockingReason: reason,
        nextAction: "Please Retry or Contact Support",
      },
    });
  },

  setNetworkRetryReady: (stage: string) => {
    set({
      status: {
        ...get().status,
        phase: "ANALYSIS",
        stageId: "NETWORK_RETRY_READY",
        stageLabel: "AI Network Retry Ready",
        state: "NETWORK_RETRY_READY",
        blockingReason: "AI gateway transient error (502/timeout)",
        nextAction: "Retry or Resume from Checkpoint",
        isNetworkError: true,
        networkErrorStage: stage,
      },
    });
  },

  clearNetworkError: () => {
    set({
      status: {
        ...get().status,
        isNetworkError: false,
        networkErrorStage: null,
        state: "RUNNING",
        blockingReason: null,
        nextAction: null,
      },
    });
  },

  addDocumentStatus: (doc: DocumentStatus) => {
    set({
      status: {
        ...get().status,
        documentStatuses: [...get().status.documentStatuses, doc],
      },
    });
  },

  updateDocumentStatus: (name: string, updates: Partial<DocumentStatus>) => {
    set({
      status: {
        ...get().status,
        documentStatuses: get().status.documentStatuses.map((doc) =>
          doc.name === name ? { ...doc, ...updates } : doc
        ),
      },
    });
  },

  reset: () => {
    set({ status: { ...initialStatus } });
  },

  setPolicyLibraryReady: (ready: boolean) => {
    set({
      status: {
        ...get().status,
        policyLibraryReady: ready,
      },
    });
  },

  setCaseFilesReady: (ready: boolean) => {
    set({
      status: {
        ...get().status,
        caseFilesReady: ready,
      },
    });
  },
}));
