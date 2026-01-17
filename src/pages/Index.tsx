import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout";
import { 
  DocumentPreparationStep,
  ItemAnalysisStep,
  EvidenceReviewStep,
  ExecutiveSummaryStep,
  FormalReportStep 
} from "@/components/steps";
import PolicyLibrary from "@/components/PolicyLibrary";
import DocumentUpload from "@/components/DocumentUpload";
import { ReportGenerator } from "@/components/report/ReportGenerator";
import { usePolicyDocuments } from "@/hooks/usePolicyDocuments";
import { useWorkflowStatus } from "@/hooks/useWorkflowStatus";
import type { ConfidenceLevel } from "@/components/gamification";

const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [selectedEvidenceItem, setSelectedEvidenceItem] = useState(0);
  
  const { data: policyDocuments = [], isLoading: policyLoading } = usePolicyDocuments();
  const { status } = useWorkflowStatus();

  // Determine completed steps based on workflow status (now 5 steps)
  const completedSteps = useMemo(() => {
    const completed: number[] = [];
    // Step 1: Document Preparation - complete when policy & case files ready
    if (status.policyLibraryReady && policyDocuments.length > 0 && status.caseFilesReady) {
      completed.push(1);
    }
    // Steps 2-4: Complete after analysis
    if (analysisData?.complianceItems?.length > 0) {
      completed.push(2); // Item Analysis
      completed.push(3); // Evidence Review
      completed.push(4); // Executive Summary
    }
    return completed;
  }, [status, policyDocuments, analysisData]);

  // Determine blocked steps
  const blockedSteps = useMemo(() => {
    const blocked: { step: number; reason: string }[] = [];
    if (status.state === "BLOCKED" && status.blockingReason) {
      blocked.push({ step: currentStep, reason: status.blockingReason });
    }
    return blocked;
  }, [status, currentStep]);

  const handleAnalyze = (result: any) => {
    setAnalysisData(result);
    setCurrentStep(2); // Move to Item Analysis after analysis
  };

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
  };

  // Transform analysis data for step components
  const analysisItems = useMemo(() => {
    if (!analysisData?.complianceItems) return [];
    return analysisData.complianceItems.map((item: any) => ({
      itemNumber: item.itemNumber,
      invoiceItem: item.invoiceItem,
      normalizedName: item.normalizedName || item.invoiceItem,
      licenseAlignment: item.licenseAlignment || "Needs Clarification",
      policyMatch: item.matchResult === "Exact" ? "Listed" : 
                   item.matchResult === "Mapped" ? "Mapped" : "Not Listed",
      essentialityStatus: item.essentialityAnalysis ? "Complete" : "Pending",
      evidenceCount: item.citations?.length || 0,
      citations: item.citations || [],
      analysisStatus: item.eligibilityStatus?.startsWith("Eligible") ? "analysis_complete" as const :
                      item.eligibilityStatus === "Requires Clarification" ? "requires_clarification" as const :
                      "evidence_pending" as const,
      confidence: (item.citations?.length > 0 && item.reasoning?.length > 0 ? "high" : 
                  item.citations?.length > 0 ? "medium" : "low") as ConfidenceLevel,
    }));
  }, [analysisData]);

  const evidenceItems = useMemo(() => {
    return analysisItems.map((item: any) => ({
      itemNumber: item.itemNumber,
      itemName: item.normalizedName,
      citations: item.citations,
      essentialityAnalysis: analysisData?.complianceItems?.find(
        (c: any) => c.itemNumber === item.itemNumber
      )?.essentialityAnalysis,
      confidence: item.confidence,
    }));
  }, [analysisItems, analysisData]);

  const executiveSummary = useMemo(() => {
    if (!analysisData?.executiveSummary) {
      return {
        overallStatus: "Pending",
        eligibleCount: 0,
        clarificationCount: 0,
        deferredCount: 0,
        topIssues: [],
        additionalInfoNeeded: [],
        overallConfidence: "low" as ConfidenceLevel,
      };
    }
    return {
      overallStatus: analysisData.executiveSummary.overallStatus || "Mixed",
      eligibleCount: analysisData.executiveSummary.eligibleCount || 0,
      clarificationCount: analysisData.executiveSummary.clarificationCount || 0,
      deferredCount: analysisData.executiveSummary.notEligibleCount || 0,
      topIssues: analysisData.executiveSummary.topIssues || [],
      additionalInfoNeeded: analysisData.executiveSummary.additionalInfoNeeded || [],
      overallConfidence: (analysisItems.filter((i: any) => i.confidence === "high").length > 
                         analysisItems.length / 2 ? "high" : "medium") as ConfidenceLevel,
    };
  }, [analysisData, analysisItems]);

  // Render step content based on current step (now 5 steps)
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <DocumentPreparationStep 
            policyDocuments={policyDocuments.map(doc => ({
              id: doc.id,
              name: doc.name,
              nameAmharic: doc.name_amharic || undefined,
              directiveNumber: doc.directive_number || undefined,
              status: doc.status,
              documentType: doc.document_type,
            }))}
            uploadedDocuments={status.documentStatuses.map((d, i) => ({
              id: `doc-${i}`,
              name: d.name,
              type: d.type as "license" | "invoice",
              status: d.status,
            }))}
            licenseUploaded={status.documentStatuses.some(d => d.type === "license" && d.status === "complete")}
            invoiceUploaded={status.documentStatuses.some(d => d.type === "invoice" && d.status === "complete")}
            isPolicyLoading={policyLoading}
          >
            <PolicyLibrary />
            <DocumentUpload onAnalyze={handleAnalyze} />
          </DocumentPreparationStep>
        );
      case 2:
        return <ItemAnalysisStep items={analysisItems} />;
      case 3:
        return (
          <EvidenceReviewStep 
            evidenceItems={evidenceItems}
            selectedItemIndex={selectedEvidenceItem}
            onItemSelect={setSelectedEvidenceItem}
          />
        );
      case 4:
        return <ExecutiveSummaryStep summary={executiveSummary} />;
      case 5:
        return (
          <FormalReportStep isReady={completedSteps.includes(4)}>
            {analysisData && <ReportGenerator analysisData={analysisData} />}
          </FormalReportStep>
        );
      default:
        return null;
    }
  };

  return (
    <AppLayout
      currentStep={currentStep}
      completedSteps={completedSteps}
      blockedSteps={blockedSteps}
      onStepClick={handleStepClick}
    >
      {renderStepContent()}
    </AppLayout>
  );
};

export default Index;
