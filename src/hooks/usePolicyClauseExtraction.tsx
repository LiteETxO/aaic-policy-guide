import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExtractionProgress {
  status: "idle" | "extracting" | "complete" | "error";
  message: string;
  extractedCount?: number;
  summary?: {
    total_articles?: number;
    total_annexes?: number;
    total_items?: number;
    capital_goods_categories?: string[];
  };
}

interface ExtractionResult {
  success: boolean;
  extractedCount: number;
  insertedCount: number;
  summary: {
    documentId: string;
    documentName: string;
    total_articles?: number;
    total_annexes?: number;
    total_items?: number;
    capital_goods_categories?: string[];
    directive_number?: string;
    effective_date?: string;
  };
}

export const usePolicyClauseExtraction = () => {
  const [progress, setProgress] = useState<ExtractionProgress>({
    status: "idle",
    message: "",
  });

  const extractClauses = async (
    documentId: string,
    documentText: string,
    documentName: string,
    directiveNumber?: string
  ): Promise<ExtractionResult | null> => {
    if (!documentText || documentText.length < 100) {
      toast.error("Document text is too short for clause extraction");
      return null;
    }

    setProgress({
      status: "extracting",
      message: "Analyzing document structure...",
    });

    try {
      // Call the extraction edge function
      const { data, error } = await supabase.functions.invoke("extract-policy-clauses", {
        body: {
          documentId,
          documentText,
          documentName,
          directiveNumber,
        },
      });

      if (error) {
        console.error("Extraction function error:", error);
        throw new Error(error.message || "Extraction failed");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Extraction returned no results");
      }

      const result: ExtractionResult = {
        success: true,
        extractedCount: data.extractedCount || 0,
        insertedCount: data.insertedCount || 0,
        summary: data.summary || {},
      };

      setProgress({
        status: "complete",
        message: `Extracted ${result.extractedCount} clauses`,
        extractedCount: result.extractedCount,
        summary: data.summary,
      });

      toast.success(`Extracted ${result.extractedCount} policy clauses`);

      return result;
    } catch (err: any) {
      console.error("Clause extraction error:", err);
      
      setProgress({
        status: "error",
        message: err.message || "Extraction failed",
      });

      toast.error(`Clause extraction failed: ${err.message}`);
      return null;
    }
  };

  const resetProgress = () => {
    setProgress({
      status: "idle",
      message: "",
    });
  };

  return {
    extractClauses,
    progress,
    resetProgress,
    isExtracting: progress.status === "extracting",
  };
};
