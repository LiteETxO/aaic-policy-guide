import { create } from "zustand";

export type WorkflowPhase = "POLICY_IMPORT" | "CASE_IMPORT" | "ANALYSIS" | "IDLE";
export type WorkflowState = "RUNNING" | "BLOCKED" | "COMPLETE" | "ERROR" | "IDLE";

export interface WorkflowStage {
  id: string;
  label: string;
  progress: number;
}

// Phase A - Policy Import stages
export const POLICY_IMPORT_STAGES: WorkflowStage[] = [
  { id: "RECEIVED_FILES", label: "Receiving files", progress: 10 },
  { id: "OCR_AND_TEXT_EXTRACTION", label: "OCR & text extraction", progress: 25 },
  { id: "STRUCTURE_DETECTION", label: "Structure detection", progress: 45 },
  { id: "POLICY_INDEX_BUILD", label: "Building policy index", progress: 60 },
  { id: "CITATION_MAPPING", label: "Mapping citations", progress: 80 },
  { id: "VALIDATION_COMPLETE", label: "Validation complete", progress: 100 },
];

// Phase B - Case Import stages
export const CASE_IMPORT_STAGES: WorkflowStage[] = [
  { id: "RECEIVED_FILES", label: "Receiving files", progress: 10 },
  { id: "OCR_AND_TEXT_EXTRACTION", label: "OCR & text extraction", progress: 35 },
  { id: "FIELD_EXTRACTION", label: "Field extraction", progress: 60 },
  { id: "READABILITY_AND_COMPLETENESS_CHECK", label: "Readability check", progress: 85 },
  { id: "CASE_READY", label: "Case ready", progress: 100 },
];

// Phase C - Analysis stages
export const ANALYSIS_STAGES: WorkflowStage[] = [
  { id: "ANALYSIS_START", label: "Starting analysis", progress: 10 },
  { id: "ITEM_NORMALIZATION", label: "Normalizing items", progress: 25 },
  { id: "LIST_MATCHING", label: "Matching to policy list", progress: 55 },
  { id: "LICENSE_ALIGNMENT_CHECK", label: "License alignment check", progress: 70 },
  { id: "ESSENTIALITY_EVALUATION", label: "Essentiality evaluation", progress: 85 },
  { id: "DECISION_TABLE_AND_CITATIONS_OUTPUT", label: "Generating results", progress: 100 },
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
        stageLabel: "Policy Library ready for analysis",
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
        stageLabel: "Case file ready for analysis",
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
          blockingReason: "Policy/Case ingestion incomplete",
          nextAction: "Complete Policy Import phase first",
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
          blockingReason: "Policy/Case ingestion incomplete",
          nextAction: "Complete Case Import phase first",
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
        stageLabel: "Analysis complete",
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
        nextAction: "Please retry or contact support",
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
