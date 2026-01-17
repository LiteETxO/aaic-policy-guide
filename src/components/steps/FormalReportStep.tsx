import { FileOutput, Download, Mail, Printer, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FormalReportStepProps {
  isReady: boolean;
  onDownloadPDF?: () => void;
  onEmailSupervisor?: () => void;
  onPrint?: () => void;
  children?: React.ReactNode; // For the actual report generator
}

/**
 * Step 6 — Formal Report (FINAL ACTION)
 * 
 * Only in this step may the UI show:
 * - Download PDF
 * - Email to Supervisor
 * - Print
 * 
 * This reinforces: The report — not the dashboard — is the authoritative artifact.
 */
const FormalReportStep = ({
  isReady,
  onDownloadPDF,
  onEmailSupervisor,
  onPrint,
  children,
}: FormalReportStepProps) => {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileOutput className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">መደበኛ ሪፖርት (Formal Report)</h2>
            <p className="text-sm text-muted-foreground">
              የመጨረሻ ውሳኔ ሪፖርት ያውርዱ ወይም ያትሙ
            </p>
          </div>
          {isReady && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              ዝግጁ
            </Badge>
          )}
        </div>
      </div>

      {/* Report Ready Card */}
      <Card className="border-l-4 border-l-success">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <CardTitle className="text-lg">
              📄 የፖሊሲ ትንተና ሪፖርት ተዘጋጅቷል
            </CardTitle>
          </div>
          <CardDescription>
            (Policy Analysis Report Ready)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ሪፖርቱ ሙሉ ትንተና፣ ማስረጃዎች፣ እና የውሳኔ ምክንያቶችን ይዟል። 
            ይህ ሪፖርት ኦፊሴላዊ ሰነድ ሆኖ ያገለግላል።
          </p>
          <p className="text-xs text-muted-foreground">
            (The report contains complete analysis, evidence, and decision rationale. 
            This report serves as the official artifact.)
          </p>

          {/* Action Buttons - Only shown in this final step */}
          <div className="flex flex-wrap gap-3 pt-4">
            <Button 
              variant="hero" 
              className="gap-2"
              onClick={onDownloadPDF}
              disabled={!isReady}
            >
              <Download className="h-4 w-4" />
              📥 Download PDF
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={onEmailSupervisor}
              disabled={!isReady}
            >
              <Mail className="h-4 w-4" />
              📧 Email to Supervisor
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={onPrint}
              disabled={!isReady}
            >
              <Printer className="h-4 w-4" />
              🖨 Print
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Authoritative Artifact Notice */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm">
        <p className="font-medium text-primary mb-1">
          📌 ይህ ሪፖርት ኦፊሴላዊ ውሳኔ ነው (This Report is the Official Decision)
        </p>
        <p className="text-muted-foreground">
          የዳሽቦርዱ ውጤቶች ለአጠቃላይ ግምገማ ብቻ ናቸው። 
          ለሱፐርቫይዘር ወይም ለኦዲት ይህን ሪፖርት ይጠቀሙ።
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          (Dashboard results are for review only. Use this report for supervisor or audit purposes.)
        </p>
      </div>

      {/* Report Content (passed as children) */}
      {children}
    </div>
  );
};

export default FormalReportStep;
