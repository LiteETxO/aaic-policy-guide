import { CheckCircle2, Loader2, Lock, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ConfidenceBadge, { ConfidenceLevel } from "./ConfidenceBadge";
import EvidenceChip, { EvidenceData } from "./EvidenceChip";

export type StepStatus = "complete" | "active" | "locked" | "error";

export interface DecisionStep {
  id: string;
  labelAmharic: string;
  labelEnglish: string;
  status: StepStatus;
  result?: string;
}

export interface DecisionCardData {
  itemNumber: number;
  totalItems: number;
  itemName: string;
  invoiceDescription: string;
  steps: DecisionStep[];
  confidenceLevel?: ConfidenceLevel;
  finalDecision?: string;
  finalDecisionAmharic?: string;
  citations?: EvidenceData[];
}

interface DecisionStepCardProps {
  data: DecisionCardData;
  className?: string;
}

const stepStatusConfig: Record<StepStatus, {
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
}> = {
  complete: { icon: CheckCircle2, bgColor: "bg-success/10", iconColor: "text-success" },
  active: { icon: Loader2, bgColor: "bg-primary/10", iconColor: "text-primary" },
  locked: { icon: Lock, bgColor: "bg-muted", iconColor: "text-muted-foreground" },
  error: { icon: XCircle, bgColor: "bg-destructive/10", iconColor: "text-destructive" },
};

const DecisionStepCard = ({ data, className }: DecisionStepCardProps) => {
  const completedSteps = data.steps.filter(s => s.status === "complete").length;
  const allComplete = completedSteps === data.steps.length;

  return (
    <Card className={cn("transition-all duration-300", allComplete && "border-success/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="shrink-0">
                {data.itemNumber} / {data.totalItems}
              </Badge>
              {data.confidenceLevel && (
                <ConfidenceBadge level={data.confidenceLevel} size="sm" />
              )}
            </div>
            <CardTitle className="text-lg truncate">{data.itemName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {data.invoiceDescription}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Decision Steps */}
        <div className="space-y-2">
          {data.steps.map((step, index) => {
            const config = stepStatusConfig[step.status];
            const Icon = config.icon;
            const isLast = index === data.steps.length - 1;

            return (
              <div key={step.id} className="flex items-start gap-3">
                {/* Step indicator with connecting line */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                    config.bgColor
                  )}>
                    <Icon className={cn(
                      "h-3.5 w-3.5",
                      config.iconColor,
                      step.status === "active" && "animate-spin"
                    )} />
                  </div>
                  {!isLast && (
                    <div className={cn(
                      "w-0.5 h-4 mt-1",
                      step.status === "complete" ? "bg-success" : "bg-muted"
                    )} />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 pb-2">
                  <p className={cn(
                    "text-sm font-medium",
                    step.status === "complete" && "text-success",
                    step.status === "active" && "text-primary",
                    step.status === "locked" && "text-muted-foreground",
                    step.status === "error" && "text-destructive"
                  )}>
                    {step.labelEnglish}
                  </p>
                  {step.result && step.status === "complete" && (
                    <p className="text-xs text-success mt-0.5">{step.result}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Final Decision */}
        {allComplete && data.finalDecision && (
          <div className={cn(
            "p-3 rounded-lg border",
            data.finalDecision.includes("Eligible") 
              ? "bg-success/5 border-success/20"
              : data.finalDecision.includes("Clarification")
                ? "bg-warning/5 border-warning/20"
                : "bg-destructive/5 border-destructive/20"
          )}>
            <div className="flex items-start gap-2">
              {data.finalDecision.includes("Eligible") ? (
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              ) : data.finalDecision.includes("Clarification") ? (
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-semibold">{data.finalDecision}</p>
              </div>
            </div>
          </div>
        )}

        {/* Evidence Chips */}
        {data.citations && data.citations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Evidence
            </p>
            <div className="flex flex-wrap gap-2">
              {data.citations.slice(0, 3).map((citation, idx) => (
                <EvidenceChip key={idx} evidence={citation} variant="compact" />
              ))}
              {data.citations.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{data.citations.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DecisionStepCard;
