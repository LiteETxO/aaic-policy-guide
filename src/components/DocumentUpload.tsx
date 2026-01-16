import { useState } from "react";
import { Upload, FileText, Receipt, BookOpen, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface UploadZone {
  id: string;
  title: string;
  titleAmharic: string;
  description: string;
  icon: React.ElementType;
  accept: string;
  file: File | null;
}

interface DocumentUploadProps {
  onAnalyze: () => void;
}

const DocumentUpload = ({ onAnalyze }: DocumentUploadProps) => {
  const [uploadZones, setUploadZones] = useState<UploadZone[]>([
    {
      id: "license",
      title: "Investment License",
      titleAmharic: "የኢንቨስትመንት ፈቃድ",
      description: "Upload the official investment license document",
      icon: FileText,
      accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png",
      file: null,
    },
    {
      id: "invoice",
      title: "Commercial Invoice(s)",
      titleAmharic: "የንግድ ደረሰኞች",
      description: "Upload invoices for capital goods",
      icon: Receipt,
      accept: ".pdf,.xls,.xlsx,.jpg,.jpeg,.png",
      file: null,
    },
    {
      id: "policy",
      title: "Policy Guidelines",
      titleAmharic: "የፖሊሲ መመሪያዎች",
      description: "Ministry of Finance policy documents (optional)",
      icon: BookOpen,
      accept: ".pdf,.doc,.docx",
      file: null,
    },
  ]);

  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadZones(zones =>
        zones.map(zone =>
          zone.id === zoneId ? { ...zone, file } : zone
        )
      );
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, zoneId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadZones(zones =>
        zones.map(zone =>
          zone.id === zoneId ? { ...zone, file } : zone
        )
      );
    }
  };

  const removeFile = (zoneId: string) => {
    setUploadZones(zones =>
      zones.map(zone =>
        zone.id === zoneId ? { ...zone, file: null } : zone
      )
    );
  };

  const hasRequiredFiles = uploadZones[0].file && uploadZones[1].file;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Upload Documents</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload your investment license and commercial invoices for AI-powered compliance analysis.
            Policy guidelines are optional but recommended for accuracy.
          </p>
          <p className="text-sm text-muted-foreground mt-2">ሰነዶችዎን ይጫኑ</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
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
                  {zone.id !== "policy" && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                      Required
                    </span>
                  )}
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
            disabled={!hasRequiredFiles}
            onClick={onAnalyze}
            className="min-w-[200px]"
          >
            Analyze Documents
          </Button>
          {!hasRequiredFiles && (
            <p className="text-sm text-muted-foreground mt-3">
              Please upload both the investment license and invoice(s) to proceed
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default DocumentUpload;
