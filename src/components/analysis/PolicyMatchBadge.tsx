import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PolicyMatchStatus = 
  | "matched" 
  | "partial" 
  | "not_found"
  | "checking";

interface PolicyMatchBadgeProps {
  status: PolicyMatchStatus;
  className?: string;
}

const config: Record<PolicyMatchStatus, {
  icon: typeof CheckCircle2;
  label: string;
  labelAmharic: string;
  color: string;
  bgColor: string;
}> = {
  matched: {
    icon: CheckCircle2,
    label: "Policy Matched",
    labelAmharic: "ፖሊሲ ተገኝቷል",
    color: "text-success",
    bgColor: "bg-success/10 border-success/30",
  },
  partial: {
    icon: AlertTriangle,
    label: "Policy Match – Partial",
    labelAmharic: "ከፊል ግጥጥም",
    color: "text-warning",
    bgColor: "bg-warning/10 border-warning/30",
  },
  not_found: {
    icon: XCircle,
    label: "No Applicable Policy Found",
    labelAmharic: "ፖሊሲ አልተገኘም",
    color: "text-destructive",
    bgColor: "bg-destructive/10 border-destructive/30",
  },
  checking: {
    icon: HelpCircle,
    label: "Checking Policy",
    labelAmharic: "በመፈተሽ ላይ",
    color: "text-muted-foreground",
    bgColor: "bg-muted border-border",
  },
};

const PolicyMatchBadge = ({ status, className }: PolicyMatchBadgeProps) => {
  const { icon: Icon, label, labelAmharic, color, bgColor } = config[status];

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1.5 py-1 px-2.5 font-medium",
        bgColor,
        color,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="flex flex-col leading-tight">
        <span className="text-xs">{labelAmharic}</span>
        <span className="text-[10px] opacity-80">{label}</span>
      </span>
    </Badge>
  );
};

export default PolicyMatchBadge;
