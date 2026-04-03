import { ReactNode } from "react";
import Header from "@/components/Header";
import ProcessNavigator from "@/components/layout/ProcessNavigator";
import { DecisionTracePanel } from "@/components/trace";
import { useDecisionTrace } from "@/hooks/useDecisionTrace";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  currentStep: number;
  completedSteps: number[];
  blockedSteps?: { step: number; reason: string }[];
  onStepClick?: (step: number) => void;
  className?: string;
}

const AppLayout = ({
  children,
  currentStep,
  completedSteps,
  blockedSteps = [],
  onStepClick,
  className,
}: AppLayoutProps) => {
  const { isAnalyzing, events, isPanelOpen } = useDecisionTrace();

  const showTracePanel = isAnalyzing || events.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Header />

      <div className="flex-1 flex">
        {/* Left sidebar */}
        <aside className="hidden lg:flex w-56 shrink-0 border-r border-slate-200 bg-white">
          <ProcessNavigator
            currentStep={currentStep}
            completedSteps={completedSteps}
            blockedSteps={blockedSteps}
            onStepClick={onStepClick}
          />
        </aside>

        {/* Main content */}
        <main className={cn("flex-1 overflow-auto", className)}>
          {children}
        </main>

        {/* Right trace panel */}
        {showTracePanel && (
          <aside className={cn(
            "hidden lg:flex shrink-0 transition-all duration-300 border-l border-slate-200",
            isPanelOpen ? "w-80" : "w-0"
          )}>
            <DecisionTracePanel />
          </aside>
        )}
      </div>

      {showTracePanel && !isPanelOpen && (
        <div className="lg:hidden">
          <DecisionTracePanel />
        </div>
      )}
    </div>
  );
};

export default AppLayout;
