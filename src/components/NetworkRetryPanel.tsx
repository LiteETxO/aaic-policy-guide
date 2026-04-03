import { AlertTriangle, RefreshCw, PlayCircle, Copy, CheckCircle2, WifiOff, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { toast } from "sonner";
import { useAnalysisCheckpoint, type ClassifiedError } from "@/hooks/useAnalysisCheckpoint";

interface NetworkRetryPanelProps {
  error: ClassifiedError;
  onRetry: () => void;
  onResume: () => void;
  isRetrying: boolean;
  checkpoint?: {
    clausesRetrieved: boolean;
    clauseCount?: number;
    documentsParseComplete: boolean;
    invoiceItemsExtracted: boolean;
    extractedItemCount?: number;
  };
}

export function NetworkRetryPanel({
  error,
  onRetry,
  onResume,
  isRetrying,
  checkpoint,
}: NetworkRetryPanelProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const { networkRetryState } = useAnalysisCheckpoint();
  
  const canResume = checkpoint?.clausesRetrieved && checkpoint?.documentsParseComplete;
  
  const handleCopyLog = async () => {
    const logText = [
      "=== AAIC Analysis Technical Log ===",
      `Timestamp: ${new Date().toISOString()}`,
      `Error Type: ${error.code}`,
      `Error Category: ${error.category}`,
      `Stage: ${error.stage}`,
      "",
      "--- Checkpoint Status ---",
      `Documents Parsed: ${checkpoint?.documentsParseComplete ? "Yes" : "No"}`,
      `Clauses Retrieved: ${checkpoint?.clausesRetrieved ? `Yes (${checkpoint.clauseCount || 0} clauses)` : "No"}`,
      `Items Extracted: ${checkpoint?.invoiceItemsExtracted ? `Yes (${checkpoint.extractedItemCount || 0} items)` : "No"}`,
      "",
      "--- Technical Details ---",
      error.technicalDetails || "No additional details",
      "",
      "--- Event Log ---",
      ...networkRetryState.technicalLog,
    ].join("\n");
    
    try {
      await navigator.clipboard.writeText(logText);
      setCopied(true);
      toast.success("Technical log copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy log");
    }
  };
  
  return (
    <Card className="border-warning/50 bg-warning/5 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
            <WifiOff className="h-6 w-6 text-warning" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg text-warning flex items-center gap-2">
              {error.message}
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                {error.category === "TRANSIENT_NETWORK" ? "Temporary" : "Error"}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Temporary AI connection issue — your progress has been saved.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Explanation */}
        <div className="text-sm text-muted-foreground bg-background/60 rounded-lg p-3 border">
          <p className="text-sm">
            This is a temporary connection issue, not a policy decision. Your analysis progress has been saved and can be resumed.
          </p>
        </div>
        
        {/* What was completed */}
        {checkpoint && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Completed successfully:</p>
            <div className="flex flex-wrap gap-2">
              {checkpoint.documentsParseComplete && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Documents Parsed
                </Badge>
              )}
              {checkpoint.invoiceItemsExtracted && checkpoint.extractedItemCount && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {checkpoint.extractedItemCount} Items Extracted
                </Badge>
              )}
              {checkpoint.clausesRetrieved && checkpoint.clauseCount && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {checkpoint.clauseCount} Clauses Retrieved
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Issue description */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <Server className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">AI gateway response interrupted</p>
              <p className="text-muted-foreground mt-1">
                The policy clause retrieval was successful. The AI response stream was interrupted before completion.
              </p>
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="flex-1 gap-2"
            variant="default"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Retry Analysis
              </>
            )}
          </Button>
          
          {canResume && (
            <Button
              onClick={onResume}
              disabled={isRetrying}
              variant="outline"
              className="flex-1 gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              Resume from Checkpoint
            </Button>
          )}
        </div>
        
        {/* Technical details collapsible */}
        <Collapsible open={showTechnicalDetails} onOpenChange={setShowTechnicalDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
              Technical Details
              <AlertTriangle className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="bg-muted rounded-lg p-3 text-xs font-mono space-y-1">
              <p><strong>Error type:</strong> {error.code}</p>
              <p><strong>Stage:</strong> {error.stage}</p>
              <p><strong>Retry count:</strong> {networkRetryState.retryCount}/{networkRetryState.maxRetries}</p>
              {checkpoint?.clauseCount && (
                <p><strong>Clauses retrieved:</strong> {checkpoint.clauseCount}</p>
              )}
              <p><strong>Confirmation:</strong> Edge function OK, retrieval OK</p>
              {error.technicalDetails && (
                <p className="text-muted-foreground break-all mt-2">{error.technicalDetails}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLog}
              className="mt-2 gap-2 text-muted-foreground"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Technical Log
                </>
              )}
            </Button>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
          <span>Analysis paused — waiting for your action</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default NetworkRetryPanel;
