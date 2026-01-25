import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowStageInfo } from "@/hooks/useDecisionTrace";

interface WorkflowStagesProgressProps {
  stages: WorkflowStageInfo[];
  className?: string;
}

const stageStatusConfig = {
  pending: { 
    icon: Circle, 
    color: "text-muted-foreground", 
    bgColor: "bg-muted",
    connectorColor: "bg-muted-foreground/30"
  },
  in_progress: { 
    icon: Loader2, 
    color: "text-primary", 
    bgColor: "bg-primary/10",
    connectorColor: "bg-primary/50"
  },
  complete: { 
    icon: CheckCircle2, 
    color: "text-success", 
    bgColor: "bg-success/10",
    connectorColor: "bg-success"
  },
  failed: { 
    icon: XCircle, 
    color: "text-destructive", 
    bgColor: "bg-destructive/10",
    connectorColor: "bg-destructive"
  },
};

const WorkflowStagesProgress = ({ stages, className }: WorkflowStagesProgressProps) => {
  return (
    <div className={cn("p-3 rounded-lg bg-card border border-border", className)}>
      <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        Workflow Progress
      </h4>
      <div className="space-y-1">
        {stages.map((stage, index) => {
          const config = stageStatusConfig[stage.status];
          const Icon = config.icon;
          const isLast = index === stages.length - 1;
          
          return (
            <div key={stage.id} className="flex items-start gap-2">
              {/* Icon and connector line */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                  config.bgColor
                )}>
                  <Icon className={cn(
                    "h-3 w-3",
                    config.color,
                    stage.status === "in_progress" && "animate-spin"
                  )} />
                </div>
                {!isLast && (
                  <div className={cn(
                    "w-0.5 h-4 mt-0.5",
                    config.connectorColor
                  )} />
                )}
              </div>
              
              {/* Stage label */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className={cn(
                  "text-xs font-medium leading-tight truncate",
                  stage.status === "complete" ? "text-success" :
                  stage.status === "failed" ? "text-destructive" :
                  stage.status === "in_progress" ? "text-primary" :
                  "text-muted-foreground"
                )}>
                  {stage.labelEnglish}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {stage.labelAmharic}
                </p>
              </div>
              
              {/* Timestamp if complete */}
              {stage.timestamp && stage.status === "complete" && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowStagesProgress;
