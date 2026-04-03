import { Building2, CheckCircle2, AlertTriangle, HelpCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AlignmentStatus = "Aligned" | "Conditional" | "Needs Clarification" | "Not Aligned";

interface LicenseAlignmentCardProps {
  status: AlignmentStatus;
  licenseName: string;
  licenseNameAmharic?: string;
  functionalRequirement: string;
  functionalRequirementAmharic?: string;
  itemName: string;
  className?: string;
}

const statusConfig: Record<AlignmentStatus, {
  icon: typeof CheckCircle2;
  color: string;
  bgColor: string;
  label: string;
  labelAmharic: string;
}> = {
  Aligned: {
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10 border-success/30",
    label: "Aligned with Licensed Activity",
    labelAmharic: "ከፈቃድ እንቅስቃሴ ጋር ተስማምቷል",
  },
  Conditional: {
    icon: AlertTriangle,
    color: "text-warning",
    bgColor: "bg-warning/10 border-warning/30",
    label: "Conditionally Aligned",
    labelAmharic: "በሁኔታ ተስማምቷል",
  },
  "Needs Clarification": {
    icon: HelpCircle,
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/30",
    label: "Alignment Needs Clarification",
    labelAmharic: "ማብራሪያ ያስፈልጋል",
  },
  "Not Aligned": {
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10 border-destructive/30",
    label: "Not Aligned",
    labelAmharic: "አልተስማማም",
  },
};

const LicenseAlignmentCard = ({
  status,
  licenseName,
  licenseNameAmharic,
  functionalRequirement,
  functionalRequirementAmharic,
  itemName,
  className,
}: LicenseAlignmentCardProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      config.bgColor,
      className
    )}>
      <div className="flex items-start gap-2 mb-2">
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
        <div>
          <p className={cn("text-sm font-semibold", config.color)}>
            {config.label}
          </p>
        </div>
      </div>

      <div className="space-y-2 mt-3">
        {/* License Name */}
        <div className="flex items-start gap-2">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">License:</p>
            <p className="text-sm font-medium">{licenseName}</p>
          </div>
        </div>

        {/* Functional Requirement */}
        <div className="p-2 rounded bg-background/50 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">
            Functional Requirement:
          </p>
          <p className="text-sm text-foreground">
            <span className="font-medium">{itemName}</span>{" "}
            {functionalRequirement}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LicenseAlignmentCard;
