import { 
  BookOpen, FileText, ClipboardList, FileSearch, BarChart3, FileOutput,
  Check, Lock, AlertOctagon, ChevronRight
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
    labelAmharic: "የፖሊሲ ዝግጁነት",
    labelEnglish: "Policy Readiness",
    icon: BookOpen,
    description: "የፖሊሲ ሰነዶች ተነበቡ እና ተዘረዘሩ (Policy documents read and indexed)",
  },
  {
    id: 2,
    labelAmharic: "የጉዳይ ዝግጁነት",
    labelEnglish: "Case Readiness",
    icon: FileText,
    description: "ፍቃድ እና ደረሰኝ ተጫኑ (License and invoice uploaded)",
  },
  {
    id: 3,
    labelAmharic: "የንጥል ትንተና",
    labelEnglish: "Item Analysis",
    icon: ClipboardList,
    description: "እያንዳንዱ ዕቃ ይተነተናል (Each item is being analyzed)",
  },
  {
    id: 4,
    labelAmharic: "ማስረጃ ግምገማ",
    labelEnglish: "Evidence Review",
    icon: FileSearch,
    description: "ማስረጃዎችን እና ጥቅሶችን ያረጋግጡ (Review evidence and citations)",
  },
  {
    id: 5,
    labelAmharic: "ማጠቃለያ (ምክር)",
    labelEnglish: "Executive Summary",
    icon: BarChart3,
    description: "ቅድመ-ማጠቃለያ - ከማስረጃ በኋላ ይመልከቱ (Advisory - review after evidence)",
  },
  {
    id: 6,
    labelAmharic: "መደበኛ ሪፖርት",
    labelEnglish: "Formal Report",
    icon: FileOutput,
    description: "ይውረድ ወይም ያትሙ (Download or print)",
  },
];

interface ProcessNavigatorProps {
  currentStep: number;
  completedSteps: number[];
  blockedSteps?: { step: number; reason: string }[];
  onStepClick?: (step: number) => void;
}

/**
 * Vertical Process Navigator - Enforces thinking order
 * Rules:
 * - Only ONE step may be expanded at a time
 * - Steps unlock sequentially
 * - Completed steps show ✅
 * - Blocked steps show 🚫 with tooltip
 * - Future steps are 🔒 locked
 */
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
    // A step is unlocked if all previous steps are completed
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
      <nav className="w-full py-6 px-4 space-y-1">
        <div className="mb-6 px-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            የውሳኔ ሂደት (Decision Process)
          </h3>
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
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200",
                "group relative",
                status === "current" && "bg-primary/10 border border-primary/20",
                status === "completed" && "hover:bg-muted/50",
                status === "blocked" && "bg-destructive/5 border border-destructive/20",
                status === "locked" && "opacity-50 cursor-not-allowed",
                isClickable && status !== "current" && "hover:bg-muted/50 cursor-pointer"
              )}
            >
              {/* Step number/icon indicator */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 text-sm font-semibold transition-colors",
                  status === "completed" && "bg-success text-success-foreground",
                  status === "current" && "bg-primary text-primary-foreground",
                  status === "blocked" && "bg-destructive text-destructive-foreground",
                  status === "locked" && "bg-muted text-muted-foreground"
                )}
              >
                {status === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : status === "blocked" ? (
                  <AlertOctagon className="h-4 w-4" />
                ) : status === "locked" ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              {/* Step labels */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    status === "current" && "text-primary",
                    status === "completed" && "text-foreground",
                    status === "blocked" && "text-destructive",
                    status === "locked" && "text-muted-foreground"
                  )}
                >
                  {step.labelAmharic}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {step.labelEnglish}
                </p>
              </div>

              {/* Current step indicator */}
              {status === "current" && (
                <ChevronRight className="h-4 w-4 text-primary shrink-0" />
              )}

              {/* Connecting line to next step */}
              {index < PROCESS_STEPS.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[26px] top-[48px] w-0.5 h-4 -mb-4",
                    completedSteps.includes(step.id) ? "bg-success/50" : "bg-border"
                  )}
                />
              )}
            </button>
          );

          // Wrap with tooltip for blocked or locked steps
          if (status === "blocked" || status === "locked") {
            return (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>{stepContent}</TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm">
                    {status === "blocked" ? (
                      <>
                        <span className="font-semibold text-destructive">ታግዷል:</span>{" "}
                        {blockedReason || "ችግር ተገኝቷል"}
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">ተቆልፏል:</span> {step.description}
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
