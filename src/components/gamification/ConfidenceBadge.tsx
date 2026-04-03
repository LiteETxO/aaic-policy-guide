import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type ConfidenceLevel = "high" | "medium" | "low";

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const confidenceConfig: Record<ConfidenceLevel, {
  colorDot: string;
  bgColor: string;
  textColor: string;
  label: string;
  tooltip: string;
}> = {
  high: {
    colorDot: "bg-success",
    bgColor: "bg-success/10",
    textColor: "text-success",
    label: "High",
    tooltip: "This conclusion is based on strong available evidence",
  },
  medium: {
    colorDot: "bg-warning",
    bgColor: "bg-warning/10",
    textColor: "text-warning",
    label: "Medium",
    tooltip: "This conclusion may require additional verification",
  },
  low: {
    colorDot: "bg-destructive",
    bgColor: "bg-destructive/10",
    textColor: "text-destructive",
    label: "Low",
    tooltip: "This conclusion lacks sufficient evidence — officer review required",
  },
};

const sizeConfig: Record<"sm" | "md" | "lg", { dot: string; text: string; padding: string }> = {
  sm: { dot: "h-2 w-2", text: "text-[10px]", padding: "px-1.5 py-0.5" },
  md: { dot: "h-2.5 w-2.5", text: "text-xs", padding: "px-2 py-1" },
  lg: { dot: "h-3 w-3", text: "text-sm", padding: "px-3 py-1.5" },
};

const ConfidenceBadge = ({ level, showLabel = true, size = "md", className }: ConfidenceBadgeProps) => {
  const config = confidenceConfig[level];
  const sizes = sizeConfig[size];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full cursor-help",
              config.bgColor,
              sizes.padding,
              className
            )}
          >
            <span className={cn("rounded-full shrink-0 animate-pulse", config.colorDot, sizes.dot)} />
            {showLabel && (
              <span className={cn("font-medium", config.textColor, sizes.text)}>
                {config.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ConfidenceBadge;
