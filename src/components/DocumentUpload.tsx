import { useState, useEffect, type ChangeEvent, type DragEvent, type ElementType } from "react";
import { Upload, FileText, Receipt, CheckCircle2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePolicyDocuments } from "@/hooks/usePolicyDocuments";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWorkflowStatus } from "@/hooks/useWorkflowStatus";

interface UploadZone {
  id: string;
  title: string;
  titleAmharic: string;
  description: string;
  icon: ElementType;
  accept: string;
  file: File | null;
  fileText?: string;
}

interface DocumentUploadProps {
  onAnalyze: (analysisResult: any) => void;
}

const DocumentUpload = ({ onAnalyze }: DocumentUploadProps) => {
  const { user } = useAuth();
  const { data: policyDocuments } = usePolicyDocuments();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadZones, setUploadZones] = useState<UploadZone[]>([
    {
      id: "license",
      title: "Investment License",
      titleAmharic: "የኢንቨስትመንት ፈቃድ",
      description: "Upload the official investment license document",
      icon: FileText,
      accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt",
      file: null,
    },
    {
      id: "invoice",
      title: "Commercial Invoice(s)",
      titleAmharic: "የንግድ ደረሰኞች",
      description: "Upload invoices for capital goods",
      icon: Receipt,
      accept: ".pdf,.xls,.xlsx,.jpg,.jpeg,.png,.txt",
      file: null,
    },
  ]);

  const [dragOver, setDragOver] = useState<string | null>(null);

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
    addDocumentStatus,
    updateDocumentStatus,
    setCaseFilesReady,
  } = useWorkflowStatus();

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
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        updateDocumentStatus(file.name, { progress: 50 });

        // Call the parse-document edge function
        const { data, error } = await supabase.functions.invoke("parse-document", {
          body: {
            fileBase64: base64,
            fileName: file.name,
            fileType: file.type,
          },
        });

        if (error) {
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
      } catch (err) {
        console.error("Parse error:", err);
        updateDocumentStatus(file.name, { status: "error", error: "Parse failed" });
        toast.error(`Error parsing ${file.name}`);
        return `[Parse error for ${file.name}]`;
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

  const handleAnalyze = async () => {
    if (!hasRequiredFiles) return;

    // Check prerequisites
    if (!status.policyLibraryReady) {
      blockAnalysis(
        "Policy/Case ingestion incomplete",
        "Complete Policy Import phase first — add policy documents to the library"
      );
      toast.error("Policy Library is empty. Please add policy documents first.");
      return;
    }

    setIsAnalyzing(true);
    startAnalysis();

    try {
      const licenseZone = uploadZones.find(z => z.id === "license");
      const invoiceZone = uploadZones.find(z => z.id === "invoice");

      updateAnalysisStage("ITEM_NORMALIZATION");

      // Prepare policy documents for the AI
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
        toast.error("No policy documents in library. Please add policy documents first.");
        setIsAnalyzing(false);
        return;
      }

      updateAnalysisStage("LIST_MATCHING");

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("analyze-documents", {
        body: {
          licenseText: licenseZone?.fileText || `License file: ${licenseZone?.file?.name}`,
          invoiceText: invoiceZone?.fileText || `Invoice file: ${invoiceZone?.file?.name}`,
          policyDocuments: policyDocsForAI,
        },
      });

      if (error) {
        console.error("Analysis error:", error);
        errorAnalysis(error.message || "Failed to analyze documents");
        toast.error(error.message || "Failed to analyze documents");
        return;
      }

      if (data?.error) {
        errorAnalysis(data.error);
        toast.error(data.error);
        return;
      }

      updateAnalysisStage("LICENSE_ALIGNMENT_CHECK");

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 300));
      
      updateAnalysisStage("ESSENTIALITY_EVALUATION");
      
      await new Promise(resolve => setTimeout(resolve, 300));

      if (data?.success && data?.analysis) {
        updateAnalysisStage("DECISION_TABLE_AND_CITATIONS_OUTPUT");
        
        // Check if analysis was blocked due to document comprehension issues
        if (data.analysis.documentComprehension?.gateStatus === "BLOCKED") {
          blockAnalysis(
            data.analysis.documentComprehension.blockedReason || "Document ingestion incomplete",
            "Review blocked documents and provide missing information"
          );
        } else {
          completeAnalysis();
        }
        
        toast.success("Analysis complete!");
        onAnalyze(data.analysis);
      } else {
        errorAnalysis("Unexpected response from analysis");
        toast.error("Unexpected response from analysis");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      errorAnalysis("An error occurred during analysis");
      toast.error("An error occurred during analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Upload Case Documents</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload the investment license and commercial invoices for AI-powered compliance analysis 
            against the Policy Library.
          </p>
          <p className="text-sm text-muted-foreground mt-2">የጉዳይ ሰነዶችን ይጫኑ</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          {uploadZones.map((zone, index) => (
            <Card
              key={zone.id}
              className={cn(
                "relative transition-all duration-300 animate-fade-in",
                dragOver === zone.id && "ring-2 ring-primary shadow-elevated",
                zone.file && "border-success"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <zone.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                    Required
                  </span>
                </div>
                <CardTitle className="text-lg">{zone.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{zone.titleAmharic}</p>
                <CardDescription className="text-sm">{zone.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {zone.file ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{zone.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(zone.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeFile(zone.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    className={cn(
                      "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                      "hover:border-primary hover:bg-primary/5",
                      dragOver === zone.id && "border-primary bg-primary/5"
                    )}
                    onDragOver={e => {
                      e.preventDefault();
                      setDragOver(zone.id);
                    }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => handleDrop(e, zone.id)}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium">Drop file here</span>
                    <span className="text-xs text-muted-foreground mt-1">or click to browse</span>
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

        <div className="text-center">
          <Button
            variant="hero"
            size="xl"
            disabled={!hasRequiredFiles || isAnalyzing || !user}
            onClick={handleAnalyze}
            className="min-w-[200px]"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Documents"
            )}
          </Button>
          {!hasRequiredFiles && (
            <p className="text-sm text-muted-foreground mt-3">
              Please upload both the investment license and invoice(s) to proceed
            </p>
          )}
          {!user && (
            <p className="text-sm text-warning mt-3">
              Please sign in to analyze documents
            </p>
          )}
          {policyDocuments?.length === 0 && (
            <p className="text-sm text-warning mt-3">
              No policy documents in library — analysis requires at least one policy document
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default DocumentUpload;
