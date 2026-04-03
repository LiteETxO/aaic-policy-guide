import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileText, FileDown, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReportExportActionsProps {
  onPrint: () => void;
  onExportPDF: () => Promise<void>;
  onExportDOCX: () => Promise<void>;
  onEmail?: () => void;
}

export const ReportExportActions = ({ 
  onPrint, 
  onExportPDF, 
  onExportDOCX,
  onEmail 
}: ReportExportActionsProps) => {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      await onExportPDF();
      toast.success("PDF exported successfully");
    } catch (error) {
      toast.error("PDF export failed");
    } finally {
      setExporting(null);
    }
  };

  const handleExportDOCX = async () => {
    setExporting("docx");
    try {
      await onExportDOCX();
      toast.success("DOCX exported successfully");
    } catch (error) {
      toast.error("DOCX export failed");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onPrint}
        className="gap-2"
      >
        <Printer className="h-4 w-4" />
        <span>Print</span>
      </Button>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportPDF}
        disabled={exporting !== null}
        className="gap-2"
      >
        {exporting === "pdf" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        <span>PDF</span>
      </Button>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportDOCX}
        disabled={exporting !== null}
        className="gap-2"
      >
        {exporting === "docx" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        <span>DOCX</span>
      </Button>

      {onEmail && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onEmail}
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          <span>Email</span>
        </Button>
      )}
    </div>
  );
};
