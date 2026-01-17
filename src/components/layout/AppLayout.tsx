import { ReactNode } from "react";
import Header from "@/components/Header";
import ProcessNavigator from "@/components/layout/ProcessNavigator";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  currentStep: number;
  completedSteps: number[];
  blockedSteps?: { step: number; reason: string }[];
  onStepClick?: (step: number) => void;
  className?: string;
}

/**
 * Three-zone layout for AAIC Policy Decision Support:
 * A. Top Bar (Persistent) - AAIC branding, navigation, officer profile
 * B. Left Vertical Flow Navigator - Process steps with sequential unlocking
 * C. Main Content Area - Step-specific content
 */
const AppLayout = ({
  children,
  currentStep,
  completedSteps,
  blockedSteps = [],
  onStepClick,
  className,
}: AppLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* A. Top Bar (Persistent) */}
      <Header />

      {/* Main Layout: Navigator + Content */}
      <div className="flex-1 flex">
        {/* B. Left Vertical Flow Navigator */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-card">
          <ProcessNavigator
            currentStep={currentStep}
            completedSteps={completedSteps}
            blockedSteps={blockedSteps}
            onStepClick={onStepClick}
          />
        </aside>

        {/* C. Main Content Area */}
        <main className={cn("flex-1 overflow-auto", className)}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
