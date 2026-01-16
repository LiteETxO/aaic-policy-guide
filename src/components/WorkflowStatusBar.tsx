import { useWorkflowStatus, WorkflowPhase, WorkflowState } from "@/hooks/useWorkflowStatus";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, AlertTriangle, XCircle, Loader2, 
  FileText, BookOpen, Search, AlertOctagon, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

// Amharic-first phase labels
const phaseConfig: Record<WorkflowPhase, { label: string; icon: React.ElementType; color: string }> = {
  IDLE: { label: "ዝግጁ (Ready)", icon: CheckCircle2, color: "text-muted-foreground" },
  POLICY_IMPORT: { label: "የፖሊሲ መግቢያ (Policy Import)", icon: BookOpen, color: "text-primary" },
  CASE_IMPORT: { label: "የጉዳይ መግቢያ (Case Import)", icon: FileText, color: "text-blue-500" },
  ANALYSIS: { label: "ትንተና (Analysis)", icon: Search, color: "text-purple-500" },
};

// Amharic-first state labels
const stateConfig: Record<WorkflowState, { label: string; icon: React.ElementType; bgColor: string; textColor: string }> = {
  IDLE: { label: "ዝግጁ (Ready)", icon: CheckCircle2, bgColor: "bg-muted", textColor: "text-muted-foreground" },
  RUNNING: { label: "በሂደት ላይ (Processing)", icon: Loader2, bgColor: "bg-primary/10", textColor: "text-primary" },
  BLOCKED: { label: "ታግዷል (Blocked)", icon: AlertOctagon, bgColor: "bg-warning/10", textColor: "text-warning" },
  COMPLETE: { label: "ተጠናቀቀ (Complete)", icon: CheckCircle2, bgColor: "bg-success/10", textColor: "text-success" },
  ERROR: { label: "ስህተት (Error)", icon: XCircle, bgColor: "bg-destructive/10", textColor: "text-destructive" },
};

interface WorkflowStatusBarProps {
  className?: string;
}

const WorkflowStatusBar = ({ className }: WorkflowStatusBarProps) => {
  const { status } = useWorkflowStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { phase, stageLabel, progress, state, blockingReason, nextAction, documentStatuses } = status;
  
  // Don't render if idle and no activity
  if (phase === "IDLE" && state === "IDLE") {
    return null;
  }
  
  const phaseInfo = phaseConfig[phase];
  const stateInfo = stateConfig[state];
  const PhaseIcon = phaseInfo.icon;
  const StateIcon = stateInfo.icon;
  
  const hasDocuments = documentStatuses.length > 0;

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4",
      className
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className={cn(
          "rounded-xl border shadow-elevated overflow-hidden backdrop-blur-sm",
          stateInfo.bgColor,
          "bg-background/95"
        )}>
          {/* Main Status Bar */}
          <CollapsibleTrigger className="w-full">
            <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    stateInfo.bgColor
                  )}>
                    <PhaseIcon className={cn("h-4 w-4", phaseInfo.color)} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{phaseInfo.label}</span>
                      <Badge 
                        variant="outline" 
                        className={cn("gap-1 text-xs", stateInfo.bgColor, stateInfo.textColor)}
                      >
                        <StateIcon className={cn(
                          "h-3 w-3",
                          state === "RUNNING" && "animate-spin"
                        )} />
                        {stateInfo.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{stageLabel}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={cn("text-lg font-bold tabular-nums", stateInfo.textColor)}>
                    {progress}%
                  </span>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180"
                  )} />
                </div>
              </div>
              
              <Progress 
                value={progress} 
                className={cn(
                  "h-2",
                  state === "BLOCKED" && "[&>div]:bg-warning",
                  state === "ERROR" && "[&>div]:bg-destructive",
                  state === "COMPLETE" && "[&>div]:bg-success"
                )}
              />
            </div>
          </CollapsibleTrigger>
          
          {/* Expanded Details */}
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border/50">
              {/* Blocking Reason */}
              {(state === "BLOCKED" || state === "ERROR") && blockingReason && (
                <div className={cn(
                  "p-3 rounded-lg mt-3",
                  state === "BLOCKED" ? "bg-warning/10 border border-warning/20" : "bg-destructive/10 border border-destructive/20"
                )}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={cn(
                      "h-4 w-4 shrink-0 mt-0.5",
                      state === "BLOCKED" ? "text-warning" : "text-destructive"
                    )} />
                    <div>
                      <p className="text-sm font-medium">{blockingReason}</p>
                      {nextAction && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">ቀጣይ እርምጃ (Next Action):</span> {nextAction}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Document Statuses */}
              {hasDocuments && (
                <div className="space-y-2 mt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    ሰነዶች (Documents)
                  </p>
                  <div className="space-y-1.5">
                    {documentStatuses.map((doc, index) => (
                      <div 
                        key={`${doc.name}-${index}`}
                        className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {doc.status === "complete" && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          )}
                          {doc.status === "processing" && (
                            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                          )}
                          {doc.status === "error" && (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          )}
                          {doc.status === "pending" && (
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
                          )}
                          <span className="truncate max-w-[200px]">{doc.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {doc.type}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {doc.progress}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Phase Progress Indicators */}
              <div className="flex items-center gap-2 pt-2">
                <PhaseIndicator 
                  label="ፖሊሲ (Policy)" 
                  isActive={phase === "POLICY_IMPORT"}
                  isComplete={status.policyLibraryReady}
                />
                <div className="h-px flex-1 bg-border" />
                <PhaseIndicator 
                  label="ጉዳይ (Case)" 
                  isActive={phase === "CASE_IMPORT"}
                  isComplete={status.caseFilesReady}
                />
                <div className="h-px flex-1 bg-border" />
                <PhaseIndicator 
                  label="ትንተና (Analysis)" 
                  isActive={phase === "ANALYSIS"}
                  isComplete={phase === "ANALYSIS" && state === "COMPLETE"}
                />
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

interface PhaseIndicatorProps {
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

const PhaseIndicator = ({ label, isActive, isComplete }: PhaseIndicatorProps) => (
  <div className={cn(
    "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
    isComplete && "bg-success/10 text-success",
    isActive && !isComplete && "bg-primary/10 text-primary",
    !isActive && !isComplete && "bg-muted text-muted-foreground"
  )}>
    {isComplete ? (
      <CheckCircle2 className="h-3 w-3" />
    ) : isActive ? (
      <Loader2 className="h-3 w-3 animate-spin" />
    ) : (
      <div className="h-3 w-3 rounded-full border border-current" />
    )}
    {label}
  </div>
);

export default WorkflowStatusBar;
