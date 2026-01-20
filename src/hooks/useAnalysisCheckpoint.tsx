import { create } from "zustand";

/**
 * Error classification for resilient analysis handling.
 * Category A: Transient network/gateway errors (safe to retry)
 * Category B: Data/Document errors (need user action)
 * Category C: Logic/Citation errors (need admin action)
 * Category D: Application bugs (need developer action)
 */
export type ErrorCategory = "TRANSIENT_NETWORK" | "DATA_DOCUMENT" | "LOGIC_CITATION" | "APPLICATION_BUG";

export interface ClassifiedError {
  category: ErrorCategory;
  code: string;
  message: string;
  messageAmharic: string;
  isRetryable: boolean;
  stage: string;
  timestamp: number; // Use number instead of Date for serialization
  technicalDetails?: string;
}

export interface AnalysisCheckpoint {
  id: string;
  createdAt: number; // Use number instead of Date for serialization
  updatedAt: number;
  
  // Document state (expensive operations - don't repeat)
  documentsParseComplete: boolean;
  licenseText?: string;
  invoiceText?: string;
  licenseFileName?: string;
  invoiceFileName?: string;
  
  // OCR state
  ocrComplete: boolean;
  
  // Invoice extraction
  invoiceItemsExtracted: boolean;
  extractedItemCount?: number;
  
  // Policy clause retrieval (expensive - don't repeat)
  clausesRetrieved: boolean;
  retrievedClauseIds?: string[];
  clauseCount?: number;
  clauseContext?: string;
  
  // Analysis state
  analysisStarted: boolean;
  analysisComplete: boolean;
  
  // Partial results
  partialResults?: any;
  completedItemIndices?: number[];
  
  // AI gateway state
  lastAICallStage?: string;
  aiCallAttempts: number;
  lastAICallTimestamp?: number;
  
  // Policy documents (for regenerating context)
  policyDocumentIds?: string[];
}

export interface NetworkRetryState {
  isNetworkError: boolean;
  error?: ClassifiedError;
  retryCount: number;
  maxRetries: number;
  lastRetryAt?: number;
  canAutoRetry: boolean;
  technicalLog: string[];
}

interface AnalysisCheckpointStore {
  checkpoint: AnalysisCheckpoint | null;
  networkRetryState: NetworkRetryState;
  
  // Checkpoint actions
  createCheckpoint: () => void;
  updateCheckpoint: (updates: Partial<AnalysisCheckpoint>) => void;
  clearCheckpoint: () => void;
  
  // Network error handling
  setNetworkError: (error: ClassifiedError) => void;
  clearNetworkError: () => void;
  incrementRetry: () => void;
  addTechnicalLog: (log: string) => void;
  
  // Helper getters
  canResume: () => boolean;
  getResumeStage: () => string | null;
}

const generateCheckpointId = () => `ckpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

/**
 * Classifies an error into the appropriate category.
 * Critical for determining correct user-facing behavior.
 */
export function classifyError(error: any, stage: string): ClassifiedError {
  const errorMessage = error?.message || error?.toString() || "Unknown error";
  const errorCode = error?.code || error?.status || "";
  
  // Category A: Transient Network/Gateway errors
  const networkPatterns = [
    /502/i, /503/i, /504/i,
    /timeout/i, /timed out/i,
    /connection.*reset/i, /connection.*lost/i, /connection.*dropped/i,
    /network.*error/i, /network.*unavailable/i,
    /fetch.*failed/i, /failed.*fetch/i,
    /aborted/i, /abort/i,
    /ECONNRESET/i, /ECONNREFUSED/i, /ETIMEDOUT/i,
    /gateway/i,
    /stream.*interrupted/i,
    /service.*unavailable/i,
  ];
  
  const isTransientNetwork = networkPatterns.some(pattern => 
    pattern.test(errorMessage) || pattern.test(String(errorCode))
  );
  
  if (isTransientNetwork) {
    return {
      category: "TRANSIENT_NETWORK",
      code: "NETWORK_TRANSIENT",
      message: "Temporary AI connection issue. Your progress is saved.",
      messageAmharic: "የአይ ኔትዎርክ ግንኙነት ተቋርጧል",
      isRetryable: true,
      stage,
      timestamp: Date.now(),
      technicalDetails: `Error: ${errorMessage}. Stage: ${stage}.`,
    };
  }
  
  // Category B: Data/Document errors
  const documentPatterns = [
    /pdf.*error/i, /document.*error/i,
    /ocr.*fail/i, /parse.*fail/i,
    /unreadable/i, /corrupt/i,
    /missing.*annex/i, /missing.*document/i,
    /extraction.*fail/i,
  ];
  
  const isDocumentError = documentPatterns.some(pattern => pattern.test(errorMessage));
  
  if (isDocumentError) {
    return {
      category: "DATA_DOCUMENT",
      code: "DOCUMENT_ERROR",
      message: "Document processing error. Please check the uploaded files.",
      messageAmharic: "የሰነድ ማስኬጃ ስህተት",
      isRetryable: false,
      stage,
      timestamp: Date.now(),
      technicalDetails: errorMessage,
    };
  }
  
  // Category C: Logic/Citation errors
  const logicPatterns = [
    /no.*clause/i, /clause.*not.*found/i,
    /citation.*incomplete/i,
    /policy.*gap/i,
    /no.*policy.*clauses/i,
  ];
  
  const isLogicError = logicPatterns.some(pattern => pattern.test(errorMessage));
  
  if (isLogicError) {
    return {
      category: "LOGIC_CITATION",
      code: "CITATION_ERROR",
      message: "Policy clause retrieval issue. Admin action may be required.",
      messageAmharic: "የፖሊሲ አንቀጽ ማስኬጃ ችግር",
      isRetryable: false,
      stage,
      timestamp: Date.now(),
      technicalDetails: errorMessage,
    };
  }
  
  // Category D: Application bugs (fallback)
  return {
    category: "APPLICATION_BUG",
    code: "APP_ERROR",
    message: "An unexpected error occurred. Please try again.",
    messageAmharic: "ያልተጠበቀ ስህተት ተከስቷል",
    isRetryable: true,
    stage,
    timestamp: Date.now(),
    technicalDetails: errorMessage,
  };
}

const initialNetworkRetryState: NetworkRetryState = {
  isNetworkError: false,
  retryCount: 0,
  maxRetries: 3,
  canAutoRetry: true,
  technicalLog: [],
};

export const useAnalysisCheckpoint = create<AnalysisCheckpointStore>()(
  (set, get) => ({
    checkpoint: null,
    networkRetryState: initialNetworkRetryState,
    
    createCheckpoint: () => {
      const id = generateCheckpointId();
      set({
        checkpoint: {
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          documentsParseComplete: false,
          ocrComplete: false,
          invoiceItemsExtracted: false,
          clausesRetrieved: false,
          analysisStarted: false,
          analysisComplete: false,
          aiCallAttempts: 0,
        },
      });
    },
      
    updateCheckpoint: (updates) => {
      const current = get().checkpoint;
      if (current) {
        set({
          checkpoint: {
            ...current,
            ...updates,
            updatedAt: Date.now(),
          },
        });
      }
    },
      
      clearCheckpoint: () => {
        set({
          checkpoint: null,
          networkRetryState: initialNetworkRetryState,
        });
      },
      
      setNetworkError: (error) => {
        const currentState = get().networkRetryState;
        const newLog = [
          ...currentState.technicalLog,
          `[${new Date().toISOString()}] ${error.category}: ${error.message} at ${error.stage}`,
        ];
        
        set({
          networkRetryState: {
            ...currentState,
            isNetworkError: true,
            error,
            technicalLog: newLog,
            // After 1 auto-retry, require manual click
            canAutoRetry: currentState.retryCount < 1,
          },
        });
      },
      
      clearNetworkError: () => {
        set({
          networkRetryState: {
            ...get().networkRetryState,
            isNetworkError: false,
            error: undefined,
          },
        });
      },
      
    incrementRetry: () => {
      const currentState = get().networkRetryState;
      const checkpoint = get().checkpoint;
      
      set({
        networkRetryState: {
          ...currentState,
          retryCount: currentState.retryCount + 1,
          lastRetryAt: Date.now(),
          canAutoRetry: currentState.retryCount + 1 < 1, // Only 1 auto retry
        },
      });
      
      if (checkpoint) {
        set({
          checkpoint: {
            ...checkpoint,
            aiCallAttempts: checkpoint.aiCallAttempts + 1,
            updatedAt: Date.now(),
          },
        });
      }
    },
      
      addTechnicalLog: (log) => {
        const currentState = get().networkRetryState;
        set({
          networkRetryState: {
            ...currentState,
            technicalLog: [
              ...currentState.technicalLog,
              `[${new Date().toISOString()}] ${log}`,
            ],
          },
        });
      },
      
      canResume: () => {
        const checkpoint = get().checkpoint;
        if (!checkpoint) return false;
        
        // Can resume if we have documents parsed and clauses retrieved
        return checkpoint.documentsParseComplete && checkpoint.clausesRetrieved;
      },
      
      getResumeStage: () => {
        const checkpoint = get().checkpoint;
        if (!checkpoint) return null;
        
        if (!checkpoint.documentsParseComplete) return "DOCUMENT_PARSING";
        if (!checkpoint.ocrComplete) return "OCR";
        if (!checkpoint.invoiceItemsExtracted) return "ITEM_EXTRACTION";
        if (!checkpoint.clausesRetrieved) return "CLAUSE_RETRIEVAL";
        if (!checkpoint.analysisStarted) return "ANALYSIS_START";
        if (!checkpoint.analysisComplete) return "ANALYSIS_CONTINUE";
        
      return "COMPLETE";
    },
  })
);
