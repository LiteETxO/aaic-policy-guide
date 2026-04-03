import {
  FileText, ClipboardList, FileSearch, BarChart3, FileOutput,
  Check, Lock, AlertOctagon, ChevronRight, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ProcessStep {
  id: number;
  labelAmharic: string;
  labelEnglish: string;
  icon: typeof BookOpen;
  description: string;
}

export const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 1,
    labelAmharic: "የሰነድ ዝግጅት",
    labelEnglish: "Documents",
    icon: FileText,
    description: "Load policy library, upload investment license and commercial invoice",
  },
  {
    id: 2,
    labelAmharic: "የንጥል ትንተና",
    labelEnglish: "Analysis",
    icon: ClipboardList,
    description: "AI-powered analysis of each line item against policy directives",
  },
  {
    id: 3,
    labelAmharic: "ማስረጃ ግምገማ",
    labelEnglish: "Evidence",
    icon: FileSearch,
    description: "Review policy citations and evidence binding for each item",
  },
  {
    id: 4,
    labelAmharic: "ማጠቃለያ (ምክር)",
    labelEnglish: "Summary",
    icon: BarChart3,
    description: "Preliminary advisory summary — review after evidence is confirmed",
  },
  {
    id: 5,
    labelAmharic: "መደበኛ ሪፖርት",
    labelEnglish: "Report",
    icon: FileOutput,
    description: "Generate official decision report for download, email, or print",
  },
];

interface ProcessNavigatorProps {
  currentStep: number;
  completedSteps: number[];
  blockedSteps?: { step: number; reason: string }[];
  onStepClick?: (step: number) => void;
}

const ProcessNavigator = ({
  currentStep,
  completedSteps,
  blockedSteps = [],
  onStepClick,
}: ProcessNavigatorProps) => {
  const getStepStatus = (stepId: number): "completed" | "current" | "blocked" | "locked" => {
    if (completedSteps.includes(stepId)) return "completed";
    if (blockedSteps.some((b) => b.step === stepId)) return "blocked";
    if (stepId === currentStep) return "current";
    const previousStepsCompleted = PROCESS_STEPS
      .filter((s) => s.id < stepId)
      .every((s) => completedSteps.includes(s.id));
    if (previousStepsCompleted && stepId === currentStep) return "current";
    return "locked";
  };

  const isStepClickable = (stepId: number): boolean => {
    const status = getStepStatus(stepId);
    return status === "completed" || status === "current";
  };

  const handleStepClick = (stepId: number) => {
    if (isStepClickable(stepId) && onStepClick) {
      onStepClick(stepId);
    }
  };

  const getBlockedReason = (stepId: number): string | undefined => {
    return blockedSteps.find((b) => b.step === stepId)?.reason;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="w-full py-5 px-3 space-y-0.5">
        <div className="mb-5 px-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Decision Process
          </p>
        </div>

        {PROCESS_STEPS.map((step, index) => {
          const status = getStepStatus(step.id);
          const isClickable = isStepClickable(step.id);
          const blockedReason = getBlockedReason(step.id);
          const Icon = step.icon;

          const stepContent = (
            <button
              onClick={() => handleStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150",
                "relative group",
                status === "current" && "bg-primary/10 border border-primary/25 shadow-sm",
                status === "completed" && "hover:bg-slate-50 cursor-pointer",
                status === "blocked" && "bg-red-50 border border-red-200/60",
                status === "locked" && "opacity-40 cursor-not-allowed",
                isClickable && status !== "current" && "hover:bg-slate-50"
              )}
            >
              {/* Step indicator */}
              <div
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-lg shrink-0 text-xs font-bold transition-colors",
                  status === "completed" && "bg-emerald-500 text-white",
                  status === "current" && "bg-primary text-white shadow-sm",
                  status === "blocked" && "bg-red-500 text-white",
                  status === "locked" && "bg-slate-200 text-slate-400"
                )}
              >
                {status === "completed" ? (
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                ) : status === "blocked" ? (
                  <AlertOctagon className="h-3.5 w-3.5" />
                ) : status === "locked" ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate leading-none",
                    status === "current" && "text-primary",
                    status === "completed" && "text-foreground",
                    status === "blocked" && "text-red-600",
                    status === "locked" && "text-muted-foreground"
                  )}
                >
                  {step.labelEnglish}
                </p>
                <p className={cn(
                  "text-[11px] mt-0.5 truncate",
                  status === "current" ? "text-primary/60" : "text-muted-foreground/60"
                )}>
                  Step {step.id}
                </p>
              </div>

              {status === "current" && (
                <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
              )}

              {/* Connector line */}
              {index < PROCESS_STEPS.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[22px] top-[44px] w-px h-3",
                    completedSteps.includes(step.id) ? "bg-emerald-300" : "bg-slate-200"
                  )}
                />
              )}
            </button>
          );

          if (status === "blocked" || status === "locked") {
            return (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>{stepContent}</TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm">
                    {status === "blocked" ? (
                      <>
                        <span className="font-semibold text-destructive">Blocked: </span>
                        {blockedReason || "An issue was detected"}
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">Locked: </span>
                        {step.description}
                      </>
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Tooltip key={step.id}>
              <TooltipTrigger asChild>{stepContent}</TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-sm">{step.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
};

export default ProcessNavigator;
