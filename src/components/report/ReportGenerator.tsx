import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Eye, EyeOff } from "lucide-react";
import { DecisionReport } from "./DecisionReport";
import { ReportExportActions } from "./ReportExportActions";
import { useReportExport } from "@/hooks/useReportExport";
import type { DecisionReportData, ComplianceItem, DocumentReviewed, PolicyBasis, ActionItem } from "./ReportTypes";

interface AnalysisData {
  documentComprehension?: {
    gateStatus: string;
    documents?: Array<{
      documentName: string;
      documentType: string;
      languagesDetected?: string[];
      pageCount?: number;
      ocrConfidence?: string;
      readStatus?: string;
    }>;
    licenseUnderstanding?: {
      licensedActivity: string;
      scopeLimitations: string;
    };
  };
  executiveSummary?: {
    overallStatus: string;
    eligibleCount?: number;
    clarificationCount?: number;
    notEligibleCount?: number;
    topIssues: string[];
    additionalInfoNeeded: string[];
  };
  licenseSnapshot?: {
    licensedActivity: string;
    sector: string;
    scopeOfOperation: string;
    restrictions: string;
    licenseNumber?: string;
    issueDate?: string;
  };
  complianceItems?: ComplianceItem[];
  officerActionsNeeded?: ActionItem[];
}

interface ReportGeneratorProps {
  analysisData: AnalysisData;
}

export const ReportGenerator = ({ analysisData }: ReportGeneratorProps) => {
  const [showReport, setShowReport] = useState(false);
  const { reportRef, handlePrint, handleExportPDF, handleExportDOCX } = useReportExport();

  // Transform analysis data into formal report structure
  const reportData: DecisionReportData = useMemo(() => {
    const complianceItems = analysisData.complianceItems || [];
    const execSummary = analysisData.executiveSummary;
    const docComprehension = analysisData.documentComprehension;
    const licenseSnapshot = analysisData.licenseSnapshot;
    const officerActions = analysisData.officerActionsNeeded || [];

    // Calculate counts
    const eligibleCount = execSummary?.eligibleCount ?? complianceItems.filter(item => 
      item.eligibilityStatus?.startsWith("Eligible") || item.policyCompliance === "Compliant"
    ).length;
    
    const clarificationCount = execSummary?.clarificationCount ?? complianceItems.filter(item => 
      item.eligibilityStatus === "Requires Clarification" || 
      item.policyCompliance === "Needs Clarification" || 
      item.policyCompliance === "Conditional"
    ).length;
    
    const notEligibleCount = execSummary?.notEligibleCount ?? complianceItems.filter(item => 
      item.eligibilityStatus === "Not Eligible" || item.policyCompliance === "Non-Compliant"
    ).length;

    // Extract documents reviewed
    const documentsReviewed: DocumentReviewed[] = docComprehension?.documents?.map(doc => ({
      documentName: doc.documentName,
      documentType: doc.documentType,
      languagesDetected: doc.languagesDetected,
      pageCount: doc.pageCount,
      ocrConfidence: doc.ocrConfidence,
      readStatus: doc.readStatus,
    })) || [];

    // Extract policy basis from citations
    const policyBasisMap = new Map<string, PolicyBasis>();
    complianceItems.forEach(item => {
      item.citations?.forEach(citation => {
        const existing = policyBasisMap.get(citation.documentName);
        if (existing) {
          if (!existing.relevantArticles.includes(citation.articleSection)) {
            existing.relevantArticles.push(citation.articleSection);
          }
          if (!existing.pageNumbers.includes(citation.pageNumber)) {
            existing.pageNumbers.push(citation.pageNumber);
          }
          if (citation.quote && !existing.quotedClauses.includes(citation.quote)) {
            existing.quotedClauses.push(citation.quote);
          }
        } else {
          policyBasisMap.set(citation.documentName, {
            documentName: citation.documentName,
            relevantArticles: [citation.articleSection],
            pageNumbers: [citation.pageNumber],
            quotedClauses: citation.quote ? [citation.quote] : [],
          });
        }
      });
    });

    // Build conclusion
    const canProceed = complianceItems
      .filter(item => item.eligibilityStatus?.startsWith("Eligible") || item.policyCompliance === "Compliant")
      .map(item => `${item.itemNumber}. ${item.normalizedName || item.invoiceItem || "Item"}`);

    const requiresClarification = complianceItems
      .filter(item =>
        item.eligibilityStatus === "Requires Clarification" ||
        item.policyCompliance === "Needs Clarification" ||
        item.policyCompliance === "Conditional"
      )
      .map(item => `${item.itemNumber}. ${item.normalizedName || item.invoiceItem || "Item"}`);

    const cannotApprove = complianceItems
      .filter(item => item.eligibilityStatus === "Not Eligible" || item.policyCompliance === "Non-Compliant")
      .map(item => `${item.itemNumber}. ${item.normalizedName || item.invoiceItem || "Item"}`);

    // Build analytical notes from reasoning
    const analyticalNotes = {
      nameMismatchHandling: [] as string[],
      essentialityDecisions: [] as string[],
      conservativeAssumptions: [] as string[],
      officerDiscretion: [] as string[],
    };

    complianceItems.forEach(item => {
      const itemLabel = item.normalizedName || item.invoiceItem || "Item";
      item.reasoning?.forEach(r => {
        if (r.type === "mapped-match") {
          analyticalNotes.nameMismatchHandling.push(`${itemLabel}: ${r.point}`);
        }
        if (r.type === "essential-inclusion") {
          analyticalNotes.essentialityDecisions.push(`${itemLabel}: ${r.point}`);
        }
        if (r.type === "assumption-avoided") {
          analyticalNotes.conservativeAssumptions.push(`${itemLabel}: ${r.point}`);
        }
        if (r.type === "ambiguity") {
          analyticalNotes.officerDiscretion.push(`${itemLabel}: ${r.point}`);
        }
      });
    });

    return {
      metadata: {
        investorName: licenseSnapshot?.licensedActivity ? 
          `${licenseSnapshot.licensedActivity} Investor` : "ያልተገለጸ (Not Specified)",
        licenseNumber: licenseSnapshot?.licenseNumber || "ያልተገለጸ (Not Specified)",
        caseReferenceId: `AAIC-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        dateOfAnalysis: new Date().toLocaleDateString("am-ET", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }) + ` (${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })})`,
        preparedBy: "የኤ.አ.ኢ.ኮ የፖሊሲ ውሳኔ ድጋፍ ስርዓት (AAIC Policy Decision Support System)",
      },
      executiveSummary: {
        overallStatus: execSummary?.overallStatus || "ያልታወቀ (Unknown)",
        totalItemsReviewed: complianceItems.length,
        eligibleCount,
        clarificationCount,
        notEligibleCount,
        topIssues: execSummary?.topIssues || [],
        additionalInfoNeeded: execSummary?.additionalInfoNeeded || [],
        recommendation: notEligibleCount > 0 
          ? "አንዳንድ ዕቃዎች ብቁ አይደሉም - ዝርዝር ግምገማ ያስፈልጋል (Some items are not eligible - detailed review required)"
          : clarificationCount > 0
          ? "አንዳንድ ዕቃዎች ተጨማሪ ማብራሪያ ይፈልጋሉ (Some items require additional clarification)"
          : "ሁሉም ዕቃዎች ለማጽደቅ ዝግጁ ይመስላሉ (All items appear ready for approval)",
      },
      documentsReviewed,
      policyBasis: Array.from(policyBasisMap.values()),
      complianceItems,
      analyticalNotes,
      issuesAndClarifications: officerActions,
      licenseSnapshot,
      conclusion: {
        canProceed,
        requiresClarification,
        cannotApprove,
        officerAuthorityReminder: 
          "ይህ ትንተና የምክር ባህሪ ያለው ሲሆን የመጨረሻ ውሳኔዎች በባለስልጣኑ ስልጣን ላይ ናቸው። " +
          "ባለስልጣኑ ሁሉንም ማስረጃዎች በነጻነት መገምገም እና ተገቢ ውሳኔ መስጠት ይችላል።\n" +
          "(This analysis is advisory. Final decisions rest with the officer's authority. " +
          "The officer may independently evaluate all evidence and make appropriate decisions.)",
      },
    };
  }, [analysisData]);

  if (!analysisData.complianceItems || analysisData.complianceItems.length === 0) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto mb-8">
      <Card className="shadow-medium border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg gradient-hero flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">
                መደበኛ የውሳኔ ሪፖርት (Formal Decision Report)
              </CardTitle>
              <CardDescription>
                ለህትመት/ፒዲኤፍ/ዶክስ ማውጣት ዝግጁ (Ready for Print/PDF/DOCX Export)
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ReportExportActions
              onPrint={handlePrint}
              onExportPDF={handleExportPDF}
              onExportDOCX={handleExportDOCX}
            />
            
            <Button
              variant={showReport ? "secondary" : "default"}
              size="sm"
              onClick={() => setShowReport(!showReport)}
              className="gap-2"
            >
              {showReport ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  <span>ደብቅ (Hide)</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span>አሳይ (Preview)</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        
        {showReport && (
          <CardContent className="pt-0">
            <div className="border rounded-lg overflow-hidden bg-background">
              <DecisionReport ref={reportRef} data={reportData} />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
