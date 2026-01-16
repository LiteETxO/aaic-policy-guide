import { useEffect, useState } from "react";
import { 
  BookOpen, ShieldCheck, Lock, FileText, Calendar, User, Plus, 
  Upload, Trash2, Edit2, FileCheck, AlertCircle, ExternalLink
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePolicyDocuments, useUploadPolicyDocument, useDeletePolicyDocument, PolicyDocument } from "@/hooks/usePolicyDocuments";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";
import { Skeleton } from "@/components/ui/skeleton";

const PolicyLibrary = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { data: policyDocuments, isLoading, error } = usePolicyDocuments();
  const uploadMutation = useUploadPolicyDocument();
  const deleteMutation = useDeletePolicyDocument();
  
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
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

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.name) return;

    await uploadMutation.mutateAsync({
      file: selectedFile,
      name: uploadForm.name,
      nameAmharic: uploadForm.nameAmharic,
      directiveNumber: uploadForm.directiveNumber,
      version: uploadForm.version,
      effectiveDate: uploadForm.effectiveDate,
      documentType: uploadForm.documentType,
      contentMarkdown: uploadForm.contentMarkdown,
    });

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
                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                  <DialogTrigger asChild>
                    <Button variant="hero" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Policy Document
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
                          className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
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
                              const file = files[0];
                              if (file.type === "application/pdf") {
                                setSelectedFile(file);
                              }
                            }
                          }}
                        >
                          <input
                            id="file"
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          />
                          <label htmlFor="file" className="cursor-pointer">
                            {selectedFile ? (
                              <div className="flex items-center justify-center gap-2 text-success">
                                <FileCheck className="h-8 w-8" />
                                <span className="font-medium">{selectedFile.name}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Upload className="h-8 w-8" />
                                <span>Click or drag PDF document here</span>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contentMarkdown">Document Content (Markdown/Text)</Label>
                        <Textarea
                          id="contentMarkdown"
                          placeholder="Paste the full text content of the document here for AI analysis..."
                          className="min-h-[200px]"
                          value={uploadForm.contentMarkdown}
                          onChange={(e) => setUploadForm({ ...uploadForm, contentMarkdown: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Paste the extracted text from the PDF here. This enables AI-powered analysis and citation.
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
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-1">No Policy Documents</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                The Policy Library is empty. {isAdmin ? "Upload your first policy document to enable AI-powered compliance analysis." : "Contact an administrator to add policy documents."}
              </p>
              {isAdmin && (
                <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Document
                </Button>
              )}
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
    </section>
  );
};

export default PolicyLibrary;
