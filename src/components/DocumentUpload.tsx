import { useState, useEffect, type ChangeEvent, type DragEvent, type ElementType } from "react";
import { Upload, FileText, Receipt, CheckCircle2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { usePolicyDocuments } from "@/hooks/usePolicyDocuments";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWorkflowStatus } from "@/hooks/useWorkflowStatus";
import { useDecisionTrace, createTraceEvent, createEngagementSignal } from "@/hooks/useDecisionTrace";
import { useAnalysisCheckpoint, classifyError, type ClassifiedError } from "@/hooks/useAnalysisCheckpoint";
import { NetworkRetryPanel } from "@/components/NetworkRetryPanel";

interface UploadZone {
  id: string;
  title: string;
  description: string;
  icon: ElementType;
  accept: string;
  file: File | null;
  fileText?: string;
}

interface DocumentUploadProps {
  onAnalyze: (analysisResult: any) => void;
}

const BACKOFF_DELAY_MS = 2000;

const DocumentUpload = ({ onAnalyze }: DocumentUploadProps) => {
  const { user } = useAuth();
  const { data: policyDocuments } = usePolicyDocuments();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadZones, setUploadZones] = useState<UploadZone[]>([
    {
      id: "license",
      title: "Investment License",
      description: "Upload the official investment license document",
      icon: FileText,
      accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt",
      file: null,
    },
    {
      id: "invoice",
      title: "Commercial Invoice(s)",
      description: "Upload invoices for capital goods",
      icon: Receipt,
      accept: ".pdf,.xls,.xlsx,.jpg,.jpeg,.png,.txt",
      file: null,
    },
  ]);

  const [dragOver, setDragOver] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<ClassifiedError | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStepLabel, setAnalysisStepLabel] = useState("");

  const {
    status,
    startCaseImport,
    updateCaseImportStage,
    completeCaseImport,
    blockCaseImport,
    startAnalysis,
    updateAnalysisStage,
    completeAnalysis,
    blockAnalysis,
    errorAnalysis,
    setNetworkRetryReady,
    clearNetworkError: clearWorkflowNetworkError,
    addDocumentStatus,
    updateDocumentStatus,
    setCaseFilesReady,
  } = useWorkflowStatus();

  const {
    addEvent,
    addEngagementSignal,
    setAnalyzing,
    clear: clearTrace,
  } = useDecisionTrace();

  const {
    checkpoint,
    networkRetryState,
    createCheckpoint,
    updateCheckpoint,
    clearCheckpoint,
    setNetworkError: setCheckpointNetworkError,
    clearNetworkError: clearCheckpointNetworkError,
    incrementRetry,
    addTechnicalLog,
    canResume,
  } = useAnalysisCheckpoint();

  // Update case files ready status when both files are uploaded
  useEffect(() => {
    const hasLicense = uploadZones.find(z => z.id === "license")?.file;
    const hasInvoice = uploadZones.find(z => z.id === "invoice")?.file;
    setCaseFilesReady(!!(hasLicense && hasInvoice));
  }, [uploadZones, setCaseFilesReady]);

  const readFileAsText = async (file: File, zoneId: string): Promise<string> => {
    // For plain text files, read directly
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      updateCaseImportStage("OCR_AND_TEXT_EXTRACTION");
      updateDocumentStatus(file.name, { status: "processing", progress: 35 });
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          updateDocumentStatus(file.name, { status: "complete", progress: 100 });
          resolve(e.target?.result as string);
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }

    // For PDFs and images, use AI-powered parsing
    if (file.type === "application/pdf" || file.type.startsWith("image/")) {
      // Check file size - limit to 10MB for reliable transmission
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`);
        updateDocumentStatus(file.name, { status: "error", error: "File too large" });
        return `[File too large: ${file.name} - ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds 10MB limit]`;
      }

      try {
        updateCaseImportStage("OCR_AND_TEXT_EXTRACTION");
        updateDocumentStatus(file.name, { status: "processing", progress: 25 });
        toast.info(`Parsing ${file.name}...`);
        
        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            // Remove the data:...;base64, prefix
            const base64Data = result.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = (err) => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });

        updateDocumentStatus(file.name, { progress: 50 });

        // Call the parse-document edge function with retry logic
        let retries = 0;
        const maxRetries = 2;
        let lastError: Error | null = null;

        while (retries <= maxRetries) {
          try {
            const { data, error } = await supabase.functions.invoke("parse-document", {
              body: {
                fileBase64: base64,
                fileName: file.name,
                fileType: file.type,
              },
            });

            if (error) {
              // Check if it's a network/size error
              if (error.message?.includes("Load failed") || error.message?.includes("Failed to send")) {
                throw new Error("Network request failed - file may be too large");
              }
              console.error("Parse error:", error);
              updateDocumentStatus(file.name, { status: "error", error: error.message });
              toast.error(`Failed to parse ${file.name}`);
              return `[Parse error for ${file.name}: ${error.message}]`;
            }

            if (data?.error) {
              updateDocumentStatus(file.name, { status: "error", error: data.error });
              toast.error(data.error);
              return `[Parse error for ${file.name}: ${data.error}]`;
            }

            if (data?.extractedText) {
              updateDocumentStatus(file.name, { status: "complete", progress: 100 });
              toast.success(`Successfully parsed ${file.name}`);
              return data.extractedText;
            }

            return `[No text extracted from ${file.name}]`;
          } catch (fetchErr: any) {
            lastError = fetchErr;
            retries++;
            if (retries <= maxRetries) {
              console.log(`Retry ${retries}/${maxRetries} for ${file.name}...`);
              toast.info(`Retrying parse for ${file.name}... (${retries}/${maxRetries})`);
              await new Promise(r => setTimeout(r, 1000 * retries));
            }
          }
        }

        // All retries failed
        console.error("Parse error after retries:", lastError);
        updateDocumentStatus(file.name, { status: "error", error: "Parse failed after retries" });
        toast.error(`Error parsing ${file.name}: ${lastError?.message || "Network error"}`);
        return `[Parse error for ${file.name}: ${lastError?.message || "Network error - try a smaller file"}]`;
      } catch (err: any) {
        console.error("Parse error:", err);
        updateDocumentStatus(file.name, { status: "error", error: err.message || "Parse failed" });
        toast.error(`Error parsing ${file.name}`);
        return `[Parse error for ${file.name}: ${err.message || "Unknown error"}]`;
      }
    }

    // For other file types (xlsx, doc, etc.)
    return `[File: ${file.name}, Size: ${(file.size / 1024).toFixed(1)} KB, Type: ${file.type}]

Note: This file type cannot be automatically parsed. Please convert to PDF or paste the text content manually.`;
  };

  const handleDrop = async (e: DragEvent, zoneId: string) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) {
      startCaseImport();
      addDocumentStatus({
        name: file.name,
        type: zoneId === "license" ? "license" : "invoice",
        status: "pending",
        progress: 10,
      });
      updateCaseImportStage("RECEIVED_FILES");
      
      const fileText = await readFileAsText(file, zoneId);
      
      updateCaseImportStage("FIELD_EXTRACTION");
      
      setUploadZones(zones =>
        zones.map(zone =>
          zone.id === zoneId ? { ...zone, file, fileText } : zone
        )
      );

      updateCaseImportStage("READABILITY_AND_COMPLETENESS_CHECK");
      
      // Check if both files are now uploaded
      const updatedZones = uploadZones.map(zone =>
        zone.id === zoneId ? { ...zone, file, fileText } : zone
      );
      const hasLicense = updatedZones.find(z => z.id === "license")?.file;
      const hasInvoice = updatedZones.find(z => z.id === "invoice")?.file;
      
      if (hasLicense && hasInvoice) {
        completeCaseImport();
      }
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>, zoneId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      startCaseImport();
      addDocumentStatus({
        name: file.name,
        type: zoneId === "license" ? "license" : "invoice",
        status: "pending",
        progress: 10,
      });
      updateCaseImportStage("RECEIVED_FILES");
      
      const fileText = await readFileAsText(file, zoneId);
      
      updateCaseImportStage("FIELD_EXTRACTION");
      
      setUploadZones(zones =>
        zones.map(zone =>
          zone.id === zoneId ? { ...zone, file, fileText } : zone
        )
      );

      updateCaseImportStage("READABILITY_AND_COMPLETENESS_CHECK");
      
      // Check if both files are now uploaded
      const updatedZones = uploadZones.map(zone =>
        zone.id === zoneId ? { ...zone, file, fileText } : zone
      );
      const hasLicense = updatedZones.find(z => z.id === "license")?.file;
      const hasInvoice = updatedZones.find(z => z.id === "invoice")?.file;
      
      if (hasLicense && hasInvoice) {
        completeCaseImport();
      }
    }
  };

  const removeFile = (zoneId: string) => {
    setUploadZones(zones =>
      zones.map(zone =>
        zone.id === zoneId ? { ...zone, file: null, fileText: undefined } : zone
      )
    );
  };

  const hasRequiredFiles = uploadZones[0].file && uploadZones[1].file;

  /**
   * Core analysis function with checkpointing.
   * Can be called for initial analysis or resume.
   */
  const executeAnalysis = async (isResume: boolean = false) => {
    if (!hasRequiredFiles) return;

    // Clear network error state
    setNetworkError(null);
    clearCheckpointNetworkError();
    clearWorkflowNetworkError();

    // Check prerequisites
    if (!status.policyLibraryReady) {
      blockAnalysis(
        "Policy/Case ingestion incomplete",
        "Complete Policy Import phase first — add policy documents to the library"
      );
      addEvent(createTraceEvent.blocked(
        undefined,
        "Policy Library not ready",
        "Add policy documents to the library first"
      ));
      toast.error("Policy Library is empty. Please add policy documents first.");
      return;
    }

    // Create checkpoint if starting fresh
    if (!isResume) {
      clearTrace();
      createCheckpoint();
    }

    setIsAnalyzing(true);
    setAnalyzing(true);
    startAnalysis();
    setAnalysisProgress(5);
    setAnalysisStepLabel("Uploading documents...");

    const licenseZone = uploadZones.find(z => z.id === "license");
    const invoiceZone = uploadZones.find(z => z.id === "invoice");

    try {
      // ═══════════════════════════════════════════════════════════════════════════════
      // CHECKPOINT 1: Document parsing (skip if resuming with documents already parsed)
      // ═══════════════════════════════════════════════════════════════════════════════
      if (!isResume || !checkpoint?.documentsParseComplete) {
        addEvent(createTraceEvent.documentIngestion(licenseZone?.file?.name || "License", "started"));
        addEvent(createTraceEvent.documentIngestion(invoiceZone?.file?.name || "Invoice", "complete"));
        
        updateCheckpoint({
          documentsParseComplete: true,
          ocrComplete: true,
          licenseText: licenseZone?.fileText,
          invoiceText: invoiceZone?.fileText,
          licenseFileName: licenseZone?.file?.name,
          invoiceFileName: invoiceZone?.file?.name,
        });
        
        addTechnicalLog("Documents parsed and checkpoint saved");
      } else {
        addEvent(createTraceEvent.info("Resuming from checkpoint — documents already parsed"));
        addTechnicalLog("Resuming from checkpoint with existing document data");
      }

      setAnalysisProgress(20);
      setAnalysisStepLabel("Parsing documents...");
      updateAnalysisStage("ITEM_NORMALIZATION");
      addEvent(createTraceEvent.info("Starting item normalization..."));

      // ═══════════════════════════════════════════════════════════════════════════════
      // CHECKPOINT 2: Prepare policy documents
      // ═══════════════════════════════════════════════════════════════════════════════
      const policyDocsForAI = policyDocuments?.map(doc => ({
        name: doc.name,
        directive_number: doc.directive_number,
        effective_date: doc.effective_date,
        version: doc.version,
        content_markdown: doc.content_markdown,
        content_text: doc.content_text,
      })) || [];

      if (policyDocsForAI.length === 0) {
        blockAnalysis(
          "Policy Library empty",
          "Admin must upload policy documents before analysis can proceed"
        );
        addEvent(createTraceEvent.blocked(
          undefined,
          "No policy documents in library",
          "Admin must upload policy documents"
        ));
        toast.error("No policy documents in library. Please add policy documents first.");
        setIsAnalyzing(false);
        setAnalyzing(false);
        return;
      }

      updateCheckpoint({
        policyDocumentIds: policyDocuments?.map(d => d.id),
      });

      setAnalysisProgress(40);
      setAnalysisStepLabel("Retrieving policy clauses...");
      updateAnalysisStage("LIST_MATCHING");
      addEvent(createTraceEvent.info("Querying PolicyClauseIndex for matching clauses..."));

      // ═══════════════════════════════════════════════════════════════════════════════
      // CHECKPOINT 3: Before AI call (critical - save everything)
      // ═══════════════════════════════════════════════════════════════════════════════
      updateCheckpoint({
        invoiceItemsExtracted: true,
        clausesRetrieved: true, // Will be updated with actual count after call
        analysisStarted: true,
        lastAICallStage: "AI_GATEWAY_CALL",
        lastAICallTimestamp: Date.now(),
      });
      
      setAnalysisProgress(60);
      setAnalysisStepLabel("Running AI analysis...");
      addTechnicalLog("Checkpoint saved before AI gateway call");

      // Call the edge function with timeout handling
      // Analysis can take up to 4 minutes for large invoices, so set a 5 minute timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      let data: any;
      let error: any;

      try {
        const response = await supabase.functions.invoke("analyze-documents", {
          body: {
            licenseText: licenseZone?.fileText || `License file: ${licenseZone?.file?.name}`,
            invoiceText: invoiceZone?.fileText || `Invoice file: ${invoiceZone?.file?.name}`,
            policyDocuments: policyDocsForAI,
          },
        });
        
        clearTimeout(timeoutId);
        data = response.data;
        error = response.error;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        error = fetchError;
      }

      // ═══════════════════════════════════════════════════════════════════════════════
      // ERROR CLASSIFICATION AND HANDLING
      // ═══════════════════════════════════════════════════════════════════════════════
      if (error) {
        console.error("Analysis error:", error);
        const classifiedError = classifyError(error, "AI_GATEWAY_CALL");
        
        if (classifiedError.category === "TRANSIENT_NETWORK") {
          // Handle transient network error - show retry UI
          handleTransientNetworkError(classifiedError);
          return;
        } else {
          // Non-retryable error
          errorAnalysis(error.message || "Failed to analyze documents");
          addEvent(createTraceEvent.error(error.message || "Failed to analyze documents"));
          toast.error(error.message || "Failed to analyze documents");
          setAnalyzing(false);
          setIsAnalyzing(false);
          return;
        }
      }

      if (data?.error) {
        const classifiedError = classifyError({ message: data.error }, "AI_RESPONSE_PROCESSING");
        
        if (classifiedError.category === "TRANSIENT_NETWORK") {
          handleTransientNetworkError(classifiedError);
          return;
        }
        
        errorAnalysis(data.error);
        addEvent(createTraceEvent.error(data.error));
        toast.error(data.error);
        setAnalyzing(false);
        setIsAnalyzing(false);
        return;
      }

      // ═══════════════════════════════════════════════════════════════════════════════
      // SUCCESS - Update checkpoint and process results
      // ═══════════════════════════════════════════════════════════════════════════════
      updateCheckpoint({
        clausesRetrieved: true,
        clauseCount: data?.clausesRetrieved || 0,
        analysisComplete: true,
      });
      
      addTechnicalLog(`Analysis complete. Clauses retrieved: ${data?.clausesRetrieved || 0}`);

      setAnalysisProgress(90);
      setAnalysisStepLabel("Generating report...");
      updateAnalysisStage("LICENSE_ALIGNMENT_CHECK");
      addEvent(createTraceEvent.info("Checking license alignment for each item..."));

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 300));
      
      updateAnalysisStage("ESSENTIALITY_EVALUATION");
      addEvent(createTraceEvent.info("Evaluating essentiality requirements..."));
      
      await new Promise(resolve => setTimeout(resolve, 300));

      if (data?.success && data?.analysis) {
        updateAnalysisStage("DECISION_TABLE_AND_CITATIONS_OUTPUT");
        
        // Process trace events from analysis result
        processAnalysisTrace(data.analysis);
        
        // Check if analysis was blocked due to document comprehension issues
        if (data.analysis.documentComprehension?.gateStatus === "BLOCKED") {
          blockAnalysis(
            data.analysis.documentComprehension.blockedReason || "Document ingestion incomplete",
            "Review blocked documents and provide missing information"
          );
          addEvent(createTraceEvent.blocked(
            undefined,
            data.analysis.documentComprehension.blockedReason || "Document ingestion incomplete",
            "Review blocked documents"
          ));
        } else {
          completeAnalysis();
          addEvent(createTraceEvent.success("Analysis complete — all items processed"));
          addEngagementSignal(createEngagementSignal.readyForReport());
        }
        
        // Clear checkpoint on success
        clearCheckpoint();
        setAnalysisProgress(100);
        setAnalysisStepLabel("Complete");

        toast.success("Analysis complete!");
        onAnalyze(data.analysis);
      } else {
        errorAnalysis("Unexpected response from analysis");
        addEvent(createTraceEvent.error("Unexpected response from analysis"));
        toast.error("Unexpected response from analysis");
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      const classifiedError = classifyError(error, "ANALYSIS_EXECUTION");
      
      if (classifiedError.category === "TRANSIENT_NETWORK") {
        handleTransientNetworkError(classifiedError);
      } else {
        errorAnalysis("An error occurred during analysis");
        addEvent(createTraceEvent.error("An error occurred during analysis"));
        toast.error("An error occurred during analysis");
        setIsAnalyzing(false);
        setAnalyzing(false);
      }
    }
  };

  /**
   * Handle transient network errors with proper UI and state management.
   */
  const handleTransientNetworkError = (classifiedError: ClassifiedError) => {
    setNetworkError(classifiedError);
    setCheckpointNetworkError(classifiedError);
    setNetworkRetryReady(classifiedError.stage);
    
    addEvent(createTraceEvent.warning(classifiedError.message));
    addTechnicalLog(`Network error: ${classifiedError.technicalDetails}`);
    
    toast.error(classifiedError.message, {
      description: "Your progress has been saved. Click Retry to continue.",
      duration: 10000,
    });
    
    setIsAnalyzing(false);
    setAnalyzing(false);
    
    // Attempt auto-retry if allowed (only 1 auto-retry)
    if (networkRetryState.canAutoRetry && networkRetryState.retryCount < 1) {
      addTechnicalLog("Attempting automatic retry after backoff...");
      setTimeout(() => {
        handleRetry();
      }, BACKOFF_DELAY_MS);
    }
  };

  /**
   * Handle retry button click.
   */
  const handleRetry = async () => {
    incrementRetry();
    addTechnicalLog("User initiated retry");
    await executeAnalysis(true);
  };

  /**
   * Handle resume from checkpoint.
   */
  const handleResume = async () => {
    if (!canResume()) {
      toast.error("Cannot resume — checkpoint data incomplete. Starting fresh analysis.");
      await executeAnalysis(false);
      return;
    }
    
    addTechnicalLog("User initiated resume from checkpoint");
    await executeAnalysis(true);
  };

  /**
   * Main analyze button handler.
   */
  const handleAnalyze = async () => {
    await executeAnalysis(false);
  };

  // Process analysis result and emit trace events
  const processAnalysisTrace = (analysis: any) => {
    if (!analysis?.complianceItems) return;

    const items = analysis.complianceItems;
    let totalClauses = 0;
    let blockedItems = 0;

    // Trace: Invoice preservation
    addEvent(createTraceEvent.invoicePreservation(items.length));

    items.forEach((item: any, index: number) => {
      const itemNumber = item.itemNumber || index + 1;

      // Trace: Normalization
      if (item.normalizedName && item.invoiceItem) {
        addEvent(createTraceEvent.normalization(
          itemNumber,
          item.invoiceItem,
          item.normalizedName
        ));
      }

      // Trace: Clause retrieval
      const clauseIds = item.referencedClauseIds || item.citations?.map((c: any) => c.clauseId).filter(Boolean) || [];
      const keywords = item.matchKeywords || [item.normalizedName?.split(" ")[0] || "item"].slice(0, 3);
      
      addEvent(createTraceEvent.clauseRetrieval(
        itemNumber,
        keywords,
        clauseIds.length,
        clauseIds
      ));

      // Trace: Clause binding (if clauses found)
      if (clauseIds.length > 0 && item.citations?.length > 0) {
        const citation = item.citations[0];
        addEvent(createTraceEvent.clauseBinding(
          itemNumber,
          clauseIds[0] || citation.clauseId || "UNKNOWN",
          citation.documentName || "Policy Document",
          citation.pageNumber || 1
        ));
        totalClauses += clauseIds.length;
      }

      // Trace: Decision path
      const decisionPath = item.matchResult === "Exact" ? "exact" :
                          item.matchResult === "Mapped" ? "mapped" :
                          item.essentialityAnalysis ? "essentiality" : "deferred";
      
      addEvent(createTraceEvent.decisionPath(itemNumber, decisionPath));

      // Trace: License alignment
      if (item.licenseAlignment) {
        addEvent(createTraceEvent.licenseAlignment(
          itemNumber,
          item.licenseScope || "Licensed Investment Activity",
          item.licenseAlignment === "Aligned"
        ));
      }

      // Trace: Essentiality check
      if (item.essentialityAnalysis) {
        addEvent(createTraceEvent.essentialityCheck(
          itemNumber,
          item.essentialityAnalysis.isEssential ? "passed" : "pending"
        ));
      }

      // Trace: Decision output
      const decision = item.eligibilityStatus || "Pending";
      const isBlocked = item.clauseRetrievalBlocked || decision.includes("Deferred");
      
      if (isBlocked) {
        blockedItems++;
        addEvent(createTraceEvent.blocked(
          itemNumber,
          "No applicable policy clause retrieved from PolicyClauseIndex",
          "Admin must index relevant clauses or officer must request policy update"
        ));
      } else {
        addEvent(createTraceEvent.decisionOutput(
          itemNumber,
          decision,
          clauseIds.length
        ));
      }
    });

    // Engagement signals
    if (totalClauses > 0) {
      addEngagementSignal(createEngagementSignal.evidenceCollected(totalClauses));
    }
    if (blockedItems === 0 && items.length > 0) {
      addEngagementSignal(createEngagementSignal.citationsComplete());
    } else if (blockedItems > 0) {
      addEngagementSignal(createEngagementSignal.awaitingClarification());
    }
  };

  // Show network retry panel if there's a network error
  if (networkError) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <NetworkRetryPanel
              error={networkError}
              onRetry={handleRetry}
              onResume={handleResume}
              isRetrying={isAnalyzing}
              checkpoint={checkpoint ? {
                clausesRetrieved: checkpoint.clausesRetrieved,
                clauseCount: checkpoint.clauseCount,
                documentsParseComplete: checkpoint.documentsParseComplete,
                invoiceItemsExtracted: checkpoint.invoiceItemsExtracted,
                extractedItemCount: checkpoint.extractedItemCount,
              } : undefined}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6">
      <div className="max-w-3xl">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-foreground">Upload Case Documents</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload the investment license and commercial invoice for AI-powered compliance analysis.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {uploadZones.map((zone, index) => (
            <Card
              key={zone.id}
              className={cn(
                "relative border rounded-xl transition-all duration-200 animate-fade-in shadow-soft",
                dragOver === zone.id && "ring-2 ring-primary/40 shadow-medium border-primary/40",
                zone.file ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-white"
              )}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between mb-1">
                  <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center",
                    zone.file ? "bg-emerald-100" : "bg-primary/10"
                  )}>
                    <zone.icon className={cn("h-4.5 w-4.5", zone.file ? "text-emerald-600" : "text-primary")} />
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">
                    Required
                  </span>
                </div>
                <CardTitle className="text-sm font-semibold">{zone.title}</CardTitle>
                <CardDescription className="text-xs">{zone.description}</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {zone.file ? (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/60">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate text-slate-700">{zone.file.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {(zone.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      onClick={() => removeFile(zone.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <label
                    className={cn(
                      "flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                      "hover:border-primary/50 hover:bg-primary/3",
                      dragOver === zone.id && "border-primary/60 bg-primary/5"
                    )}
                    onDragOver={e => { e.preventDefault(); setDragOver(zone.id); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => handleDrop(e, zone.id)}
                  >
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2.5">
                      <Upload className="h-5 w-5 text-slate-400" />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">Drop file here</span>
                    <span className="text-[10px] text-slate-400 mt-1">or click to browse</span>
                    <input
                      type="file"
                      className="hidden"
                      accept={zone.accept}
                      onChange={e => handleFileSelect(e, zone.id)}
                    />
                  </label>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-2.5">
          <Button
            disabled={!hasRequiredFiles || isAnalyzing || !user}
            onClick={handleAnalyze}
            className="w-full h-11 text-sm font-semibold bg-primary hover:bg-primary/90 text-white shadow-sm rounded-xl transition-all hover:shadow-md"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Documents...
              </>
            ) : (
              "Analyze Documents"
            )}
          </Button>

          {isAnalyzing && (
            <div className="space-y-1.5 pt-1">
              <Progress value={analysisProgress} className="h-2 rounded-full transition-all duration-500" />
              <p className="text-xs text-center text-muted-foreground">
                {analysisStepLabel} ({analysisProgress}%)
              </p>
            </div>
          )}
          {!hasRequiredFiles && (
            <p className="text-xs text-center text-muted-foreground">
              Upload both the investment license and invoice to proceed
            </p>
          )}
          {!user && (
            <p className="text-xs text-center text-amber-600 font-medium">
              Sign in required to analyze documents
            </p>
          )}
          {policyDocuments?.length === 0 && (
            <p className="text-xs text-center text-amber-600 font-medium">
              Policy library is empty — an admin must add policy documents first
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default DocumentUpload;
