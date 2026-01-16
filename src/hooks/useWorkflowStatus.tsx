import { create } from "zustand";

export type WorkflowPhase = "POLICY_IMPORT" | "CASE_IMPORT" | "ANALYSIS" | "IDLE";
export type WorkflowState = "RUNNING" | "BLOCKED" | "COMPLETE" | "ERROR" | "IDLE";

export interface WorkflowStage {
  id: string;
  label: string;
  progress: number;
}

// Phase A - Policy Import stages (Amharic-first)
export const POLICY_IMPORT_STAGES: WorkflowStage[] = [
  { id: "RECEIVED_FILES", label: "ፋይሎችን መቀበል (Receiving Files)", progress: 10 },
  { id: "OCR_AND_TEXT_EXTRACTION", label: "የፅሁፍ ማውጣት (OCR & Text Extraction)", progress: 25 },
  { id: "STRUCTURE_DETECTION", label: "መዋቅር መለየት (Structure Detection)", progress: 45 },
  { id: "POLICY_INDEX_BUILD", label: "የፖሊሲ ማውጫ መገንባት (Policy Index Build)", progress: 60 },
  { id: "CITATION_MAPPING", label: "ማጣቀሻ ካርታ መዘርጋት (Citation Mapping)", progress: 80 },
  { id: "VALIDATION_COMPLETE", label: "ማረጋገጫ ተጠናቀቀ (Validation Complete)", progress: 100 },
];

// Phase B - Case Import stages (Amharic-first)
export const CASE_IMPORT_STAGES: WorkflowStage[] = [
  { id: "RECEIVED_FILES", label: "ፋይሎችን መቀበል (Receiving Files)", progress: 10 },
  { id: "OCR_AND_TEXT_EXTRACTION", label: "የፅሁፍ ማውጣት (OCR & Text Extraction)", progress: 35 },
  { id: "FIELD_EXTRACTION", label: "መረጃ ማውጣት (Field Extraction)", progress: 60 },
  { id: "READABILITY_AND_COMPLETENESS_CHECK", label: "ተነባቢነት ማረጋገጥ (Readability Check)", progress: 85 },
  { id: "CASE_READY", label: "ጉዳይ ዝግጁ ነው (Case Ready)", progress: 100 },
];

// Phase C - Analysis stages (Amharic-first)
export const ANALYSIS_STAGES: WorkflowStage[] = [
  { id: "ANALYSIS_START", label: "ትንተና መጀመር (Starting Analysis)", progress: 10 },
  { id: "ITEM_NORMALIZATION", label: "ዕቃዎችን መደበኛ ማድረግ (Item Normalization)", progress: 25 },
  { id: "LIST_MATCHING", label: "ከዝርዝር ጋር ማስማማት (List Matching)", progress: 55 },
  { id: "LICENSE_ALIGNMENT_CHECK", label: "የፍቃድ ማመሳከር (License Alignment Check)", progress: 70 },
  { id: "ESSENTIALITY_EVALUATION", label: "አስፈላጊነት ግምገማ (Essentiality Evaluation)", progress: 85 },
  { id: "DECISION_TABLE_AND_CITATIONS_OUTPUT", label: "ውጤቶችን ማዘጋጀት (Generating Results)", progress: 100 },
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
        stageLabel: "የፖሊሲ ቤተ-መጽሐፍት ለትንተና ዝግጁ ነው (Policy Library Ready for Analysis)",
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
        stageLabel: "የጉዳይ ፋይል ለትንተና ዝግጁ ነው (Case File Ready for Analysis)",
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
          blockingReason: "የፖሊሲ/ጉዳይ ማስገባት አልተጠናቀቀም (Policy/Case Ingestion Incomplete)",
          nextAction: "መጀመሪያ የፖሊሲ ማስመጣት ደረጃን ያጠናቅቁ (Complete Policy Import Phase First)",
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
          blockingReason: "የፖሊሲ/ጉዳይ ማስገባት አልተጠናቀቀም (Policy/Case Ingestion Incomplete)",
          nextAction: "መጀመሪያ የጉዳይ ማስመጣት ደረጃን ያጠናቅቁ (Complete Case Import Phase First)",
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
        stageLabel: "ትንተና ተጠናቀቀ (Analysis Complete)",
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
        nextAction: "እባክዎ እንደገና ይሞክሩ ወይም ድጋፍን ያግኙ (Please Retry or Contact Support)",
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
