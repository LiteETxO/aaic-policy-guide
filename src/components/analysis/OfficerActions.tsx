import { CheckCircle2, HelpCircle, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger,
  TooltipProvider 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PolicyBasis {
  articleSection: string;
  directiveNumber: string;
}

interface OfficerActionsProps {
  itemNumber: number;
  policyBasis?: PolicyBasis;
  canApprove: boolean;
  requiresClarification: boolean;
  hasPolicyGap: boolean;
  onApprove?: (itemNumber: number) => void;
  onRequestClarification?: (itemNumber: number) => void;
  onEscalate?: (itemNumber: number) => void;
  className?: string;
}

const OfficerActions = ({
  itemNumber,
  policyBasis,
  canApprove,
  requiresClarification,
  hasPolicyGap,
  onApprove,
  onRequestClarification,
  onEscalate,
  className,
}: OfficerActionsProps) => {
  const policyReference = policyBasis 
    ? `${policyBasis.articleSection} of ${policyBasis.directiveNumber}`
    : "Policy Document";

  return (
    <TooltipProvider>
      <div className={cn("space-y-2", className)}>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
          የመኮንን እርምጃዎች (Officer Actions)
        </p>
        
        <div className="flex flex-wrap gap-2">
          {/* Approve as Capital Good */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={canApprove ? "success" : "outline"}
                size="sm"
                disabled={!canApprove}
                onClick={() => onApprove?.(itemNumber)}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">እንደ ካፒታል እቃ አጽድቅ</span>
                <span className="sm:hidden">አጽድቅ</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold">Approve as Capital Good</p>
                <p className="text-xs text-muted-foreground">
                  This action is based on {policyReference}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Request Clarification */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRequestClarification?.(itemNumber)}
                className="gap-1.5 border-warning/50 text-warning hover:bg-warning/10"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ከአመልካች ማብራሪያ ጠይቅ</span>
                <span className="sm:hidden">ማብራሪያ</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold">Request Clarification from Applicant</p>
                <p className="text-xs text-muted-foreground">
                  Send a clarification request for additional documentation
                </p>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Escalate Policy Gap */}
          {hasPolicyGap && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEscalate?.(itemNumber)}
                  className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">የፖሊሲ ክፍተት ለአለቃ አሳድግ</span>
                  <span className="sm:hidden">አሳድግ</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-semibold">Escalate Policy Gap to Supervisor</p>
                  <p className="text-xs text-muted-foreground">
                    This item requires supervisor review due to policy coverage gap
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Policy basis citation */}
        {policyBasis && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2 pt-2 border-t">
            <FileText className="h-3 w-3" />
            <span>
              Based on: <span className="font-medium">{policyReference}</span>
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default OfficerActions;
