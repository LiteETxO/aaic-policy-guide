import { CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DecisionReadiness = 
  | "eligible_ready" 
  | "eligible_confirmation" 
  | "not_eligible"
  | "provisionally_eligible"
  | "pending";

interface DecisionReadinessBadgeProps {
  status: DecisionReadiness;
  className?: string;
  size?: "sm" | "md";
}

const config: Record<DecisionReadiness, {
  icon: typeof CheckCircle2;
  label: string;
  labelAmharic: string;
  color: string;
  bgColor: string;
}> = {
  eligible_ready: {
    icon: CheckCircle2,
    label: "Eligible – Ready for Approval",
    labelAmharic: "ብቁ – ለማጽደቅ ዝግጁ",
    color: "text-success",
    bgColor: "bg-success/10 border-success/40",
  },
  eligible_confirmation: {
    icon: AlertCircle,
    label: "Eligible – Officer Confirmation Needed",
    labelAmharic: "ብቁ – የመኮንን ማረጋገጫ ያስፈልጋል",
    color: "text-warning",
    bgColor: "bg-warning/10 border-warning/40",
  },
  provisionally_eligible: {
    icon: AlertCircle,
    label: "Provisionally Eligible – No Disqualifying Clause",
    labelAmharic: "ጊዜያዊ ብቁ – የሚያስወጣ ድንጋጌ የለም",
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/40",
  },
  not_eligible: {
    icon: XCircle,
    label: "Not Eligible (Policy-based)",
    labelAmharic: "ብቁ አይደለም (በፖሊሲ መሰረት)",
    color: "text-destructive",
    bgColor: "bg-destructive/10 border-destructive/40",
  },
  pending: {
    icon: Clock,
    label: "Analysis In Progress",
    labelAmharic: "ትንተና በሂደት ላይ",
    color: "text-muted-foreground",
    bgColor: "bg-muted border-border",
  },
};

const DecisionReadinessBadge = ({ status, className, size = "md" }: DecisionReadinessBadgeProps) => {
  const { icon: Icon, label, color, bgColor } = config[status];

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1.5 font-medium border",
        bgColor,
        color,
        size === "sm" ? "py-0.5 px-2" : "py-1.5 px-3",
        className
      )}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      <span className={cn(size === "sm" ? "text-[10px]" : "text-xs font-semibold")}>{label}</span>
    </Badge>
  );
};

export default DecisionReadinessBadge;
