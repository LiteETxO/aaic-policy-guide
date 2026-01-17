import { 
  FileText, BookOpen, Upload, CheckCircle2, XCircle, AlertTriangle, Lock, Gauge, Eye, Plus 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AnalysisHistoryPanel } from "@/components/AnalysisHistoryPanel";
import type { AnalysisSession } from "@/hooks/useAnalysisSessions";

interface PolicyDocument {
  id: string;
  name: string;
  nameAmharic?: string;
  directiveNumber?: string;
  status: string;
  documentType: string;
  articlesIndexed?: number;
  annexesDetected?: string[];
  capitalGoodsListPresent?: boolean;
}

interface UploadedDocument {
  id: string;
  name: string;
  type: "license" | "invoice";
  status: "pending" | "processing" | "complete" | "error";
}

interface DocumentPreparationStepProps {
  policyDocuments: PolicyDocument[];
  uploadedDocuments: UploadedDocument[];
  licenseUploaded: boolean;
  invoiceUploaded: boolean;
  isPolicyLoading?: boolean;
  children?: React.ReactNode;
  // Analysis session management
  hasActiveAnalysis?: boolean;
  onClearAnalysis?: () => void;
  onViewResults?: () => void;
  sessions?: AnalysisSession[];
  sessionsLoading?: boolean;
  currentSessionId?: string | null;
  onLoadSession?: (session: AnalysisSession) => void;
  onDeleteSession?: (id: string) => void;
  isDeleting?: boolean;
}

/**
 * Step 1 — Document Preparation (Combined)
 * Shows:
 * - Policy Library readiness
 * - Case document uploads (license + invoice)
 * - Combined readiness meter
 * - Analysis history panel
 * 
 * Does NOT show:
 * - Executive Summary
 * - Eligibility labels
 * - Verdict colors
 */
const DocumentPreparationStep = ({
  policyDocuments,
  uploadedDocuments,
  licenseUploaded,
  invoiceUploaded,
  isPolicyLoading,
  children,
  hasActiveAnalysis,
  onClearAnalysis,
  onViewResults,
  sessions = [],
  sessionsLoading = false,
  currentSessionId,
  onLoadSession,
  onDeleteSession,
  isDeleting,
}: DocumentPreparationStepProps) => {
  const totalPolicyDocs = policyDocuments.length;
  const hasCapitalGoodsList = policyDocuments.some((d) => d.capitalGoodsListPresent);
  
  // Combined readiness checklist
  const readinessItems = [
    { 
      section: "policy",
      label: "Policy Documents Loaded", 
      labelAmharic: "የፖሊሲ ሰነዶች ተጫኑ", 
      done: totalPolicyDocs > 0 
    },
    { 
      section: "policy",
      label: "Articles Indexed", 
      labelAmharic: "አንቀጾች ተዘረዘሩ", 
      done: policyDocuments.some((d) => (d.articlesIndexed ?? 0) > 0) 
    },
    { 
      section: "policy",
      label: "Capital Goods List Found", 
      labelAmharic: "የካፒታል ዕቃዎች ዝርዝር ተገኘ", 
      done: hasCapitalGoodsList 
    },
    { 
      section: "case",
      label: "License Uploaded", 
      labelAmharic: "ፈቃድ ተጫነ", 
      done: licenseUploaded 
    },
    { 
      section: "case",
      label: "Invoice Uploaded", 
      labelAmharic: "ደረሰኝ ተጫነ", 
      done: invoiceUploaded 
    },
  ];
  
  const policyItems = readinessItems.filter(r => r.section === "policy");
  const caseItems = readinessItems.filter(r => r.section === "case");
  
  const policyReadiness = (policyItems.filter(r => r.done).length / policyItems.length) * 100;
  const caseReadiness = (caseItems.filter(r => r.done).length / caseItems.length) * 100;
  const overallReadiness = (readinessItems.filter(r => r.done).length / readinessItems.length) * 100;

  const renderReadinessItem = (item: typeof readinessItems[0], index: number) => (
    <div
      key={index}
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
        <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
      )}
      <div className="flex-1">
        <p className={cn("text-sm font-medium", item.done ? "text-success" : "text-muted-foreground")}>
          {item.labelAmharic}
        </p>
        <p className="text-xs text-muted-foreground">{item.label}</p>
      </div>
      {item.done ? (
        <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
          ✓ ተጠናቋል
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground text-xs">
          ይጠበቃል
        </Badge>
      )}
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">የሰነድ ዝግጅት (Document Preparation)</h2>
            <p className="text-sm text-muted-foreground">
              ሁሉንም ሰነዶች ከመተንተንዎ በፊት ያዘጋጁ
            </p>
          </div>
        </div>
      </div>

      {/* Active Analysis Banner */}
      {hasActiveAnalysis && (
        <Card className="border-l-4 border-l-success bg-success/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-success">ንቁ ትንታኔ አለ (Active Analysis Exists)</p>
                  <p className="text-sm text-muted-foreground">
                    ውጤቱን ለማየት ወይም አዲስ ጉዳይ ለመጀመር ይምረጡ
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="default" size="sm" onClick={onViewResults}>
                  <Eye className="h-4 w-4 mr-1" />
                  ውጤቱን ይመልከቱ (View Results)
                </Button>
                <Button variant="outline" size="sm" onClick={onClearAnalysis}>
                  <Plus className="h-4 w-4 mr-1" />
                  አዲስ ጀምር (Start New)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Readiness Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              አጠቃላይ ዝግጁነት (Overall Readiness)
            </CardTitle>
            <Badge
              variant="outline"
              className={cn(
                overallReadiness === 100
                  ? "bg-success/10 text-success border-success/30"
                  : overallReadiness >= 60
                    ? "bg-warning/10 text-warning border-warning/30"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {Math.round(overallReadiness)}% ዝግጁ
            </Badge>
          </div>
          <CardDescription>
            Complete all items to proceed with analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Progress bar */}
          <Progress value={overallReadiness} className="h-2" />

          {/* Policy Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">የፖሊሲ ቤተ-መጽሐፍት (Policy Library)</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {Math.round(policyReadiness)}%
              </Badge>
            </div>
            <div className="grid gap-2 pl-6">
              {policyItems.map(renderReadinessItem)}
            </div>
          </div>

          <Separator />

          {/* Case Documents Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">የጉዳይ ሰነዶች (Case Documents)</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {Math.round(caseReadiness)}%
              </Badge>
            </div>
            <div className="grid gap-2 pl-6">
              {caseItems.map(renderReadinessItem)}
            </div>
          </div>

          {/* Warning if missing critical items */}
          {!hasCapitalGoodsList && totalPolicyDocs > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">
                  የካፒታል ዕቃዎች ዝርዝር አልተገኘም (Capital Goods List Missing)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Admin must upload policy documents containing the capital goods list before analysis can proceed.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content (PolicyLibrary + DocumentUpload passed as children) */}
      {children}

      {/* Analysis History Panel */}
      {onLoadSession && onDeleteSession && (
        <AnalysisHistoryPanel
          sessions={sessions}
          isLoading={sessionsLoading}
          currentSessionId={currentSessionId ?? null}
          onLoadSession={onLoadSession}
          onDeleteSession={onDeleteSession}
          isDeleting={isDeleting}
        />
      )}

      {/* No conclusions notice */}
      <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 border border-border text-sm text-muted-foreground">
        <Lock className="h-4 w-4 shrink-0" />
        <span>
          <span className="font-medium">ማሳሰቢያ:</span> በዚህ ደረጃ ምንም ውሳኔ አይደረግም። (No conclusions are made at this stage.)
        </span>
      </div>
    </div>
  );
};

export default DocumentPreparationStep;
