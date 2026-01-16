import { useCallback, useRef } from "react";
import type { DecisionReportData } from "@/components/report/ReportTypes";

export const useReportExport = () => {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleExportPDF = useCallback(async () => {
    // Use browser print to PDF functionality
    // This triggers the print dialog where user can save as PDF
    const printWindow = window.open("", "_blank");
    if (!printWindow || !reportRef.current) return;

    const reportContent = reportRef.current.innerHTML;
    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
        } catch {
          return "";
        }
      })
      .join("\n");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>AAIC Decision Analysis Report</title>
          <style>
            ${styles}
            @media print {
              body { margin: 0; padding: 20px; }
              .print\\:hidden { display: none !important; }
              .page-break-after { page-break-after: always; }
              .page-break-before { page-break-before: always; }
              .page-break-inside-avoid { page-break-inside: avoid; }
            }
            body {
              font-family: 'Inter', 'Noto Sans Ethiopic', system-ui, sans-serif;
              line-height: 1.6;
              color: #1a1a1a;
              background: white;
            }
          </style>
        </head>
        <body>
          ${reportContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }, []);

  const handleExportDOCX = useCallback(async () => {
    if (!reportRef.current) return;

    // Create a simplified HTML version for DOCX conversion
    const reportContent = reportRef.current.innerHTML;
    
    // Create a blob with HTML content that Word can read
    const htmlContent = `
      <!DOCTYPE html>
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word">
        <head>
          <meta charset="utf-8">
          <title>AAIC Decision Analysis Report</title>
          <style>
            body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.6; }
            table { border-collapse: collapse; width: 100%; margin: 10px 0; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            h1, h2, h3, h4 { color: #1a1a1a; }
            .page-break-after { page-break-after: always; }
            .page-break-before { page-break-before: always; }
          </style>
        </head>
        <body>
          ${reportContent}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { 
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AAIC_Decision_Report_${new Date().toISOString().split("T")[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return {
    reportRef,
    handlePrint,
    handleExportPDF,
    handleExportDOCX,
  };
};
