import { FileText, Upload, CheckCircle2, AlertTriangle, Lock, Gauge } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadedDocument {
  id: string;
  name: string;
  type: "license" | "invoice";
  status: "pending" | "processing" | "complete" | "error";
  specsFound?: number;
  ambiguousItems?: number;
}

interface CaseReadinessStepProps {
  uploadedDocuments: UploadedDocument[];
  licenseUploaded: boolean;
  invoiceUploaded: boolean;
  children?: React.ReactNode;
}

/**
 * Step 2 — Case Readiness
 * Shows ONLY:
 * - Case document uploads
 * - Readiness meters
 * - Document status
 *
 * Does NOT show:
 * - Executive Summary
 * - Eligibility labels
 * - Verdict colors
 */
const CaseReadinessStep = ({
  uploadedDocuments,
  licenseUploaded,
  invoiceUploaded,
  children,
}: CaseReadinessStepProps) => {
  // Calculate readiness score
  const readinessItems = [
    { label: "License Uploaded", done: licenseUploaded },
    { label: "Invoice Uploaded", done: invoiceUploaded },
  ];

  const readinessScore = (readinessItems.filter((r) => r.done).length / readinessItems.length) * 100;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Case Readiness</h2>
            <p className="text-sm text-muted-foreground">
              Upload license and invoice documents to begin
            </p>
          </div>
        </div>
      </div>

      {/* Readiness Meter Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              Case Readiness
            </CardTitle>
            <Badge
              variant="outline"
              className={cn(
                readinessScore === 100
                  ? "bg-success/10 text-success border-success/30"
                  : "bg-warning/10 text-warning border-warning/30"
              )}
            >
              {Math.round(readinessScore)}% Ready
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visual meter */}
          <div className="space-y-2">
            <Progress value={readinessScore} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Checklist */}
          <div className="grid gap-2">
            {readinessItems.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  item.done
                    ? "bg-success/5 border-success/20"
                    : "bg-muted/30 border-border"
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <p className={cn("text-sm font-medium", item.done ? "text-success" : "text-muted-foreground")}>
                    {item.label}
                  </p>
                </div>
                {item.done ? (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                    ✓ Uploaded
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground text-xs">
                    Required
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Document status list */}
          {uploadedDocuments.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                Document Status
              </h4>
              <div className="space-y-2">
                {uploadedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-2 rounded bg-muted/30 text-sm"
                  >
                    {doc.status === "complete" ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : doc.status === "processing" ? (
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : doc.status === "error" ? (
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="flex-1 truncate">{doc.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {doc.type === "license" ? "License" : "Invoice"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specs summary if available */}
          {uploadedDocuments.some((d) => d.specsFound !== undefined) && (
            <div className="flex gap-4 text-sm pt-2">
              {uploadedDocuments
                .filter((d) => d.specsFound !== undefined)
                .map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2">
                    <span className="font-medium">{doc.specsFound}</span>
                    <span className="text-muted-foreground">specs found</span>
                    {doc.ambiguousItems && doc.ambiguousItems > 0 && (
                      <Badge variant="outline" className="text-warning border-warning/30 text-xs">
                        {doc.ambiguousItems} ambiguous
                      </Badge>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Upload Content (passed as children) */}
      {children}

      {/* No conclusions notice */}
      <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 border border-border text-sm text-muted-foreground">
        <Lock className="h-4 w-4 shrink-0" />
        <span>
          <span className="font-medium">Note:</span> No conclusions are made at this stage.
        </span>
      </div>
    </div>
  );
};

export default CaseReadinessStep;
