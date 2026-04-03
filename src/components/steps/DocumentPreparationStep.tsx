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

  const readinessItems = [
    {
      section: "policy",
      label: "Policy Documents Loaded",
      done: totalPolicyDocs > 0
    },
    {
      section: "policy",
      label: "Articles Indexed",
      done: policyDocuments.some((d) => (d.articlesIndexed ?? 0) > 0)
    },
    {
      section: "policy",
      label: "Capital Goods List Found",
      done: hasCapitalGoodsList
    },
    {
      section: "case",
      label: "License Uploaded",
      done: licenseUploaded
    },
    {
      section: "case",
      label: "Invoice Uploaded",
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
        "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
        item.done
          ? "bg-emerald-50 border-emerald-200/60"
          : "bg-slate-50 border-slate-200/60"
      )}
    >
      {item.done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
      )}
      <p className={cn(
        "flex-1 text-sm font-medium",
        item.done ? "text-slate-700" : "text-slate-400"
      )}>
        {item.label}
      </p>
      {item.done ? (
        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-medium px-2 h-5">
          Complete
        </Badge>
      ) : (
        <Badge variant="outline" className="text-slate-400 text-xs font-medium px-2 h-5">
          Pending
        </Badge>
      )}
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Document Preparation</h2>
          <p className="text-sm text-muted-foreground">
            Load all required documents before starting compliance analysis
          </p>
        </div>
      </div>

      {/* Active analysis banner */}
      {hasActiveAnalysis && (
        <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/50 border-emerald-200/60 shadow-none">
          <CardContent className="py-3.5 px-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Active Analysis Available</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose to view existing results or start a fresh analysis
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="default" size="sm" onClick={onViewResults} className="h-8 text-xs">
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  View Results
                </Button>
                <Button variant="outline" size="sm" onClick={onClearAnalysis} className="h-8 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Start New
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Readiness overview — 2-column */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Policy Library card */}
        <Card className="border border-slate-200 shadow-soft rounded-xl">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Policy Library</CardTitle>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs h-5 px-2 font-medium",
                  policyReadiness === 100
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : policyReadiness > 0
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-50 text-slate-500 border-slate-200"
                )}
              >
                {policyReadiness === 100 ? "Ready" : policyReadiness > 0 ? "Partial" : "Missing"}
              </Badge>
            </div>
            <Progress value={policyReadiness} className="h-1 mt-2" />
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1.5">
            {policyItems.map(renderReadinessItem)}
          </CardContent>
        </Card>

        {/* Case Documents card */}
        <Card className="border border-slate-200 shadow-soft rounded-xl">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Case Documents</CardTitle>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs h-5 px-2 font-medium",
                  caseReadiness === 100
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : caseReadiness > 0
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-50 text-slate-500 border-slate-200"
                )}
              >
                {caseReadiness === 100 ? "Ready" : caseReadiness > 0 ? "Partial" : "Missing"}
              </Badge>
            </div>
            <Progress value={caseReadiness} className="h-1 mt-2" />
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1.5">
            {caseItems.map(renderReadinessItem)}
          </CardContent>
        </Card>
      </div>

      {/* Overall readiness strip */}
      <div className={cn(
        "flex items-center gap-4 px-4 py-3 rounded-xl border",
        overallReadiness === 100
          ? "bg-emerald-50 border-emerald-200/60"
          : overallReadiness >= 60
            ? "bg-amber-50 border-amber-200/60"
            : "bg-slate-50 border-slate-200"
      )}>
        <Gauge className={cn(
          "h-4 w-4 shrink-0",
          overallReadiness === 100 ? "text-emerald-500" : overallReadiness >= 60 ? "text-amber-500" : "text-slate-400"
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-700">Overall Readiness</span>
            <span className="text-xs font-bold text-slate-700">{Math.round(overallReadiness)}%</span>
          </div>
          <Progress value={overallReadiness} className="h-1.5" />
        </div>
      </div>

      {/* Capital goods list warning */}
      {!hasCapitalGoodsList && totalPolicyDocs > 0 && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200/60">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Capital Goods List Missing</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Admin must upload policy documents containing the capital goods list before analysis can proceed.
            </p>
          </div>
        </div>
      )}

      {/* Children (PolicyLibrary + DocumentUpload) */}
      {children}

      {/* History panel */}
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

      {/* Footer notice */}
      <div className="flex items-center gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>
          <span className="font-semibold text-slate-600">Note:</span> No compliance conclusions are made at this stage. Complete all steps to generate an official decision.
        </span>
      </div>
    </div>
  );
};

export default DocumentPreparationStep;
