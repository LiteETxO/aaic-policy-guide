import { useEffect, useState } from "react";
import { 
  BookOpen, ShieldCheck, Lock, FileText, Calendar, User, Plus, 
  Upload, Trash2, Edit2, FileCheck, AlertCircle, ExternalLink, Loader2,
  Sparkles, ListChecks
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { usePolicyDocuments, useUploadPolicyDocument, useDeletePolicyDocument, PolicyDocument } from "@/hooks/usePolicyDocuments";
import { usePolicyClauseExtraction } from "@/hooks/usePolicyClauseExtraction";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWorkflowStatus } from "@/hooks/useWorkflowStatus";

const PolicyLibrary = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { data: policyDocuments, isLoading, error } = usePolicyDocuments();
  const uploadMutation = useUploadPolicyDocument();
  const deleteMutation = useDeletePolicyDocument();
  const { extractClauses, progress: extractionProgress, isExtracting } = usePolicyClauseExtraction();
  
  const {
    startPolicyImport,
    updatePolicyImportStage,
    completePolicyImport,
    blockPolicyImport,
    addDocumentStatus,
    updateDocumentStatus,
    setPolicyLibraryReady,
  } = useWorkflowStatus();
  
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [showClauseManager, setShowClauseManager] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    nameAmharic: "",
    directiveNumber: "",
    version: "1.0",
    effectiveDate: "",
    documentType: "primary",
    contentMarkdown: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Update policy library ready status when documents change
  useEffect(() => {
    if (policyDocuments && policyDocuments.length > 0) {
      setPolicyLibraryReady(true);
    } else {
      setPolicyLibraryReady(false);
    }
  }, [policyDocuments, setPolicyLibraryReady]);

  // Prevent browser navigation when a user drops a file anywhere while the dialog is open
  useEffect(() => {
    if (!showUploadDialog) return;

    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);

    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, [showUploadDialog]);

  // Parse PDF, extract metadata, and auto-import
  const handleFileSelect = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);
    
    // Start policy import workflow
    startPolicyImport();
    addDocumentStatus({
      name: file.name,
      type: "policy",
      status: "pending",
      progress: 10,
    });

    try {
      updatePolicyImportStage("OCR_AND_TEXT_EXTRACTION");
      updateDocumentStatus(file.name, { status: "processing", progress: 25 });
      
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);

      updateDocumentStatus(file.name, { progress: 35 });

      // Call parse-document edge function with metadata extraction
      const { data, error } = await supabase.functions.invoke("parse-document", {
        body: {
          fileBase64: base64,
          fileName: file.name,
          fileType: file.type,
          extractMetadata: true,
        },
      });

      if (error) throw error;

      updatePolicyImportStage("STRUCTURE_DETECTION");
      updateDocumentStatus(file.name, { progress: 50 });

      if (data?.extractedText) {
        const metadata = data.metadata || {};
        
        updatePolicyImportStage("POLICY_INDEX_BUILD");
        updateDocumentStatus(file.name, { progress: 70 });
        
        // Auto-fill form with extracted metadata
        setUploadForm({
          name: metadata.name || file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " "),
          nameAmharic: metadata.nameAmharic || "",
          directiveNumber: metadata.directiveNumber || "",
          version: "1.0",
          effectiveDate: metadata.effectiveDate || "",
          documentType: metadata.documentType || "primary",
          contentMarkdown: data.extractedText,
        });

        updatePolicyImportStage("CITATION_MAPPING");
        updateDocumentStatus(file.name, { progress: 85 });

        // Show success with summary if available
        if (metadata.summary) {
          toast.success(`Document parsed: ${metadata.summary.substring(0, 100)}...`);
        } else {
          toast.success("Document parsed and ready to import");
        }
        
        updateDocumentStatus(file.name, { status: "complete", progress: 100 });
        
        // Auto-open the dialog if not already open
        if (!showUploadDialog) {
          setShowUploadDialog(true);
        }
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("Parse error:", err);
      updateDocumentStatus(file.name, { status: "error", error: "Parse failed" });
      blockPolicyImport("Document parsing failed", "Please try a different PDF file or contact support");
      toast.error("Failed to parse document. Please try again.");
      setSelectedFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Quick import - parse and immediately upload with extracted metadata
  const handleQuickImport = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    setIsParsing(true);
    toast.info("Parsing and importing document...");
    
    // Start policy import workflow
    startPolicyImport();
    addDocumentStatus({
      name: file.name,
      type: "policy",
      status: "pending",
      progress: 10,
    });

    try {
      updatePolicyImportStage("OCR_AND_TEXT_EXTRACTION");
      updateDocumentStatus(file.name, { status: "processing", progress: 20 });
      
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);

      updateDocumentStatus(file.name, { progress: 30 });

      // Call parse-document edge function with metadata extraction
      const { data, error } = await supabase.functions.invoke("parse-document", {
        body: {
          fileBase64: base64,
          fileName: file.name,
          fileType: file.type,
          extractMetadata: true,
        },
      });

      if (error) throw error;

      updatePolicyImportStage("STRUCTURE_DETECTION");
      updateDocumentStatus(file.name, { progress: 50 });

      if (data?.extractedText) {
        const metadata = data.metadata || {};
        
        updatePolicyImportStage("POLICY_INDEX_BUILD");
        updateDocumentStatus(file.name, { progress: 65 });
        
        updatePolicyImportStage("CITATION_MAPPING");
        updateDocumentStatus(file.name, { progress: 80 });
        
        // Directly upload the document
        const uploadedDoc = await uploadMutation.mutateAsync({
          file,
          name: metadata.name || file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " "),
          nameAmharic: metadata.nameAmharic || "",
          directiveNumber: metadata.directiveNumber || "",
          version: "1.0",
          effectiveDate: metadata.effectiveDate || "",
          documentType: metadata.documentType || "primary",
          contentMarkdown: data.extractedText,
        });

        updateDocumentStatus(file.name, { status: "complete", progress: 90 });
        
        // Auto-extract clauses from the uploaded document
        if (uploadedDoc?.id && data.extractedText) {
          toast.info("Extracting policy clauses...");
          const extractResult = await extractClauses(
            uploadedDoc.id,
            data.extractedText,
            metadata.name || file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " "),
            metadata.directiveNumber
          );
          
          if (extractResult?.extractedCount) {
            toast.success(`Extracted ${extractResult.extractedCount} clauses from policy document`);
          }
        }
        
        updateDocumentStatus(file.name, { status: "complete", progress: 100 });
        completePolicyImport();
        toast.success(`Policy document imported: ${metadata.name || file.name}`);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("Quick import error:", err);
      updateDocumentStatus(file.name, { status: "error", error: "Import failed" });
      blockPolicyImport("Document import failed", "Please try manual upload or contact support");
      toast.error("Failed to import document. Please try manual upload.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.name) return;

    const uploadedDoc = await uploadMutation.mutateAsync({
      file: selectedFile,
      name: uploadForm.name,
      nameAmharic: uploadForm.nameAmharic,
      directiveNumber: uploadForm.directiveNumber,
      version: uploadForm.version,
      effectiveDate: uploadForm.effectiveDate,
      documentType: uploadForm.documentType,
      contentMarkdown: uploadForm.contentMarkdown,
    });

    // Auto-extract clauses after manual upload
    if (uploadedDoc?.id && uploadForm.contentMarkdown) {
      toast.info("Extracting policy clauses...");
      const extractResult = await extractClauses(
        uploadedDoc.id,
        uploadForm.contentMarkdown,
        uploadForm.name,
        uploadForm.directiveNumber
      );
      
      if (extractResult?.extractedCount) {
        toast.success(`Extracted ${extractResult.extractedCount} clauses`);
      }
    }

    setShowUploadDialog(false);
    setUploadForm({
      name: "",
      nameAmharic: "",
      directiveNumber: "",
      version: "1.0",
      effectiveDate: "",
      documentType: "primary",
      contentMarkdown: "",
    });
    setSelectedFile(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this policy document? It will be marked as superseded.")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <section className="py-12 bg-background">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg gradient-hero flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold">Policy Library</h2>
              <Badge variant="outline" className="gap-1.5 text-xs">
                <Lock className="h-3 w-3" />
                Admin Managed
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Official Ministry of Finance policy documents — the permanent source of truth for compliance decisions.
            </p>
            <p className="text-sm text-muted-foreground mt-1">የፖሊሲ ቤተ-መጽሐፍት • የውሳኔ ድጋፍ መሠረት</p>
          </div>

          {!authLoading && (
            <div className="flex items-center gap-3">
              {!user ? (
                <Button variant="outline" onClick={() => setShowAuthModal(true)}>
                  Sign In
                </Button>
              ) : isAdmin ? (
                <div className="flex items-center gap-2">
                  {/* Manage Clauses Button */}
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => setShowClauseManager(true)}
                  >
                    <ListChecks className="h-4 w-4" />
                    Manage Clauses
                  </Button>
                  
                  {/* Quick Import Button */}
                  <div className="relative">
                    <input
                      id="header-quick-import"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      disabled={isParsing || isExtracting}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleQuickImport(file);
                        e.target.value = "";
                      }}
                    />
                    <label htmlFor="header-quick-import">
                      <Button 
                        variant="outline" 
                        className="gap-2 cursor-pointer" 
                        disabled={isParsing || isExtracting}
                        asChild
                      >
                        <span>
                          {isParsing || isExtracting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {isParsing ? "Importing..." : isExtracting ? "Extracting..." : "Quick Import"}
                        </span>
                      </Button>
                    </label>
                  </div>
                  
                  {/* Manual Upload Dialog */}
                  <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                    <DialogTrigger asChild>
                      <Button variant="hero" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Manually
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Upload Policy Document</DialogTitle>
                      <DialogDescription>
                        Add a new Ministry of Finance policy document to the library.
                        This will become part of the permanent source of truth for compliance decisions.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Document Name (English) *</Label>
                          <Input
                            id="name"
                            placeholder="Investment Incentives Directive"
                            value={uploadForm.name}
                            onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nameAmharic">Document Name (Amharic)</Label>
                          <Input
                            id="nameAmharic"
                            placeholder="የኢንቨስትመንት ማበረታቻ መመሪያ"
                            value={uploadForm.nameAmharic}
                            onChange={(e) => setUploadForm({ ...uploadForm, nameAmharic: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="directiveNumber">Directive Number</Label>
                          <Input
                            id="directiveNumber"
                            placeholder="1064/2025"
                            value={uploadForm.directiveNumber}
                            onChange={(e) => setUploadForm({ ...uploadForm, directiveNumber: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="version">Version</Label>
                          <Input
                            id="version"
                            placeholder="1.0"
                            value={uploadForm.version}
                            onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="effectiveDate">Effective Date</Label>
                          <Input
                            id="effectiveDate"
                            type="date"
                            value={uploadForm.effectiveDate}
                            onChange={(e) => setUploadForm({ ...uploadForm, effectiveDate: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="documentType">Document Type</Label>
                        <Select
                          value={uploadForm.documentType}
                          onValueChange={(value) => setUploadForm({ ...uploadForm, documentType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary Directive</SelectItem>
                            <SelectItem value="supplemental">Supplemental Document</SelectItem>
                            <SelectItem value="clarification">Clarification/Amendment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="file">PDF Document *</Label>
                        <div 
                          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                            isParsing ? "border-primary/50 bg-primary/5" : "hover:border-primary/50"
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const files = e.dataTransfer?.files;
                            if (files && files.length > 0) {
                              handleFileSelect(files[0]);
                            }
                          }}
                        >
                          <input
                            id="file"
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            disabled={isParsing}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileSelect(file);
                            }}
                          />
                          <label htmlFor="file" className={isParsing ? "cursor-wait" : "cursor-pointer"}>
                            {isParsing ? (
                              <div className="flex flex-col items-center gap-2 text-primary">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <span className="font-medium">Parsing document...</span>
                                <span className="text-xs text-muted-foreground">Extracting text content with AI</span>
                              </div>
                            ) : selectedFile ? (
                              <div className="flex items-center justify-center gap-2 text-success">
                                <FileCheck className="h-8 w-8" />
                                <span className="font-medium">{selectedFile.name}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Upload className="h-8 w-8" />
                                <span>Click or drag PDF document here</span>
                                <span className="text-xs">Content will be automatically extracted</span>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="contentMarkdown">Document Content (Auto-extracted)</Label>
                          {uploadForm.contentMarkdown && (
                            <Badge variant="outline" className="text-xs">
                              {uploadForm.contentMarkdown.length.toLocaleString()} characters
                            </Badge>
                          )}
                        </div>
                        <Textarea
                          id="contentMarkdown"
                          placeholder="Upload a PDF and the text content will be extracted automatically..."
                          className="min-h-[200px] font-mono text-sm"
                          value={uploadForm.contentMarkdown}
                          onChange={(e) => setUploadForm({ ...uploadForm, contentMarkdown: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Text is automatically extracted from the PDF. You can review and edit if needed.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={!selectedFile || !uploadForm.name || uploadMutation.isPending}
                      >
                        {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>
              ) : (
                <Badge variant="secondary">Officer Access</Badge>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-4 w-3/4 mt-3" />
                  <Skeleton className="h-3 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-3 py-6">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-muted-foreground">
                {user ? "Failed to load policy documents. Please try again." : "Sign in to view policy documents."}
              </p>
              {!user && (
                <Button variant="outline" size="sm" onClick={() => setShowAuthModal(true)}>
                  Sign In
                </Button>
              )}
            </CardContent>
          </Card>
        ) : policyDocuments && policyDocuments.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            {policyDocuments.map((doc, index) => (
              <Card
                key={doc.id}
                className="relative overflow-hidden animate-fade-in group hover:shadow-medium transition-shadow"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full" />
                {isAdmin && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(doc.file_url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.document_type !== "primary" && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {doc.document_type}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        v{doc.version}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-base mt-3 leading-snug">{doc.name}</CardTitle>
                  {doc.name_amharic && (
                    <p className="text-xs text-muted-foreground">{doc.name_amharic}</p>
                  )}
                  {doc.directive_number && (
                    <p className="text-xs font-mono text-primary">Directive {doc.directive_number}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {doc.effective_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(doc.effective_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-success" />
                      <span className="text-xs font-medium">Active</span>
                    </div>
                    {doc.total_pages && (
                      <>
                        <div className="text-xs text-muted-foreground">•</div>
                        <span className="text-xs text-muted-foreground">{doc.total_pages} pages</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card 
            className={`border-dashed transition-colors ${isAdmin ? "hover:border-primary/50" : ""}`}
            onDragOver={isAdmin ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined}
            onDrop={isAdmin ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              const files = e.dataTransfer?.files;
              if (files && files.length > 0 && files[0].type === "application/pdf") {
                handleQuickImport(files[0]);
              }
            } : undefined}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              {isParsing ? (
                <>
                  <Loader2 className="h-12 w-12 text-primary mb-4 animate-spin" />
                  <h3 className="font-semibold mb-1">Importing Policy Document...</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Parsing document content and extracting metadata with AI. This may take a moment.
                  </p>
                </>
              ) : (
                <>
                  <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-1">No Policy Documents</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                    {isAdmin 
                      ? "Drop a PDF here or click below to import your first policy document. Content will be automatically extracted."
                      : "Contact an administrator to add policy documents."}
                  </p>
                  {isAdmin && (
                    <>
                      <input
                        id="quick-import-file"
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleQuickImport(file);
                        }}
                      />
                      <label htmlFor="quick-import-file">
                        <Button asChild className="gap-2 cursor-pointer">
                          <span>
                            <Upload className="h-4 w-4" />
                            Import Policy Document
                          </span>
                        </Button>
                      </label>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Extraction Progress Indicator */}
        {isExtracting && (
          <Card className="mt-6 border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{extractionProgress.message}</p>
                  <p className="text-xs text-muted-foreground">Extracting articles, annexes, and capital goods items...</p>
                </div>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">All citations must reference this library</p>
              <p className="text-xs text-muted-foreground mt-1">
                Every compliance statement includes: Document Name, Article/Section, Page Number, and direct quote.
                If a needed rule is not found, the system will flag it for admin update or manual legal review.
              </p>
            </div>
          </div>
        </div>
      </div>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      
      {/* Policy Clause Manager Dialog */}
      <Dialog open={showClauseManager} onOpenChange={setShowClauseManager}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Policy Clause Manager
            </DialogTitle>
            <DialogDescription>
              Review, edit, and verify extracted policy clauses for accurate invoice matching.
            </DialogDescription>
          </DialogHeader>
          <PolicyClauseManagerInline />
        </DialogContent>
      </Dialog>
    </section>
  );
};

// Inline version of PolicyClauseManager to avoid circular imports
const PolicyClauseManagerInline = () => {
  const [clauses, setClauses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClauses = async () => {
      try {
        const { data, error } = await supabase
          .from("policy_clauses")
          .select("*")
          .order("section_number", { ascending: true })
          .limit(100);

        if (error) throw error;
        setClauses(data || []);
      } catch (err) {
        console.error("Error fetching clauses:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClauses();
  }, []);

  const verifiedCount = clauses.filter(c => c.is_verified).length;
  const itemCount = clauses.filter(c => c.section_type === "item").length;

  if (isLoading) {
    return (
      <div className="space-y-4 py-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xl font-bold">{clauses.length}</div>
            <p className="text-xs text-muted-foreground">Total Clauses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xl font-bold text-success">{verifiedCount}</div>
            <p className="text-xs text-muted-foreground">Verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xl font-bold text-warning">{clauses.length - verifiedCount}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-xl font-bold text-primary">{itemCount}</div>
            <p className="text-xs text-muted-foreground">Capital Goods</p>
          </CardContent>
        </Card>
      </div>

      {/* Clauses List */}
      {clauses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No clauses extracted yet</p>
          <p className="text-sm">Upload a policy document to extract clauses automatically</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium">Clause ID</th>
                  <th className="text-left p-3 font-medium">Heading</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-center p-3 font-medium">Page</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {clauses.map((clause) => (
                  <tr key={clause.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{clause.clause_id}</td>
                    <td className="p-3">
                      <p className="font-medium truncate max-w-[250px]">{clause.clause_heading}</p>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {clause.section_type}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">{clause.page_number}</td>
                    <td className="p-3">
                      {clause.is_verified ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        For full clause management, use the dedicated Policy Clause Manager component.
      </p>
    </div>
  );
};

export default PolicyLibrary;
