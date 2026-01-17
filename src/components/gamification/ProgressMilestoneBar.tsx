import { BookOpen, FolderOpen, Brain, FileOutput, CheckCircle2, Loader2, Lock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type MilestoneStatus = "complete" | "active" | "blocked" | "locked";

export interface Milestone {
  id: string;
  labelAmharic: string;
  labelEnglish: string;
  status: MilestoneStatus;
  blockedReason?: string;
}

interface ProgressMilestoneBarProps {
  milestones: Milestone[];
  className?: string;
}

const milestoneIcons: Record<string, React.ElementType> = {
  policy: BookOpen,
  case: FolderOpen,
  analysis: Brain,
  report: FileOutput,
};

const statusConfig: Record<MilestoneStatus, { 
  bgColor: string; 
  borderColor: string; 
  textColor: string;
  iconColor: string;
  connectorColor: string;
}> = {
  complete: {
    bgColor: "bg-success/20",
    borderColor: "border-success",
    textColor: "text-success",
    iconColor: "text-success",
    connectorColor: "bg-success",
  },
  active: {
    bgColor: "bg-primary/20",
    borderColor: "border-primary",
    textColor: "text-primary",
    iconColor: "text-primary",
    connectorColor: "bg-primary/30",
  },
  blocked: {
    bgColor: "bg-destructive/20",
    borderColor: "border-destructive",
    textColor: "text-destructive",
    iconColor: "text-destructive",
    connectorColor: "bg-destructive/30",
  },
  locked: {
    bgColor: "bg-muted",
    borderColor: "border-muted-foreground/20",
    textColor: "text-muted-foreground",
    iconColor: "text-muted-foreground/50",
    connectorColor: "bg-muted-foreground/20",
  },
};

const ProgressMilestoneBar = ({ milestones, className }: ProgressMilestoneBarProps) => {
  return (
    <TooltipProvider>
      <div className={cn("w-full py-4", className)}>
        <div className="flex items-center justify-between max-w-4xl mx-auto px-4">
          {milestones.map((milestone, index) => {
            const Icon = milestoneIcons[milestone.id] || BookOpen;
            const config = statusConfig[milestone.status];
            const isLast = index === milestones.length - 1;

            return (
              <div key={milestone.id} className="flex items-center flex-1 last:flex-none">
                {/* Milestone Node */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2 cursor-help">
                      {/* Icon Circle */}
                      <div
                        className={cn(
                          "relative h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                          config.bgColor,
                          config.borderColor,
                          milestone.status === "active" && "animate-pulse"
                        )}
                      >
                        {milestone.status === "complete" && (
                          <CheckCircle2 className={cn("h-6 w-6", config.iconColor)} />
                        )}
                        {milestone.status === "active" && (
                          <Loader2 className={cn("h-6 w-6 animate-spin", config.iconColor)} />
                        )}
                        {milestone.status === "blocked" && (
                          <XCircle className={cn("h-6 w-6", config.iconColor)} />
                        )}
                        {milestone.status === "locked" && (
                          <Lock className={cn("h-5 w-5", config.iconColor)} />
                        )}

                        {/* Small icon badge */}
                        <div
                          className={cn(
                            "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center",
                            config.bgColor
                          )}
                        >
                          <Icon className={cn("h-3 w-3", config.iconColor)} />
                        </div>
                      </div>

                      {/* Label */}
                      <div className="text-center">
                        <p className={cn("text-xs font-semibold", config.textColor)}>
                          {milestone.labelAmharic}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {milestone.labelEnglish}
                        </p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium">{milestone.labelAmharic}</p>
                    <p className="text-xs text-muted-foreground">{milestone.labelEnglish}</p>
                    {milestone.blockedReason && (
                      <p className="text-xs text-destructive mt-1">{milestone.blockedReason}</p>
                    )}
                  </TooltipContent>
                </Tooltip>

                {/* Connector Line */}
                {!isLast && (
                  <div className="flex-1 h-0.5 mx-2 relative">
                    <div className="absolute inset-0 bg-muted-foreground/20 rounded-full" />
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                        milestone.status === "complete" ? "w-full bg-success" : "w-0"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ProgressMilestoneBar;
