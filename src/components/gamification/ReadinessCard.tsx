import { CheckCircle2, Circle, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type ChecklistItemStatus = "complete" | "incomplete" | "error" | "warning";

export interface ChecklistItem {
  id: string;
  labelAmharic: string;
  labelEnglish: string;
  status: ChecklistItemStatus;
  detail?: string;
}

interface ReadinessCardProps {
  titleAmharic: string;
  titleEnglish: string;
  icon: React.ElementType;
  items: ChecklistItem[];
  className?: string;
}

const statusIcons: Record<ChecklistItemStatus, React.ElementType> = {
  complete: CheckCircle2,
  incomplete: Circle,
  error: XCircle,
  warning: AlertTriangle,
};

const statusColors: Record<ChecklistItemStatus, string> = {
  complete: "text-success",
  incomplete: "text-muted-foreground",
  error: "text-destructive",
  warning: "text-warning",
};

const ReadinessCard = ({ titleAmharic, titleEnglish, icon: HeaderIcon, items, className }: ReadinessCardProps) => {
  const completedCount = items.filter(item => item.status === "complete").length;
  const totalCount = items.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const hasErrors = items.some(item => item.status === "error");
  const hasWarnings = items.some(item => item.status === "warning");

  const progressColor = hasErrors
    ? "[&>div]:bg-destructive"
    : hasWarnings
      ? "[&>div]:bg-warning"
      : percentage === 100
        ? "[&>div]:bg-success"
        : "";

  return (
    <Card className={cn("transition-all duration-300", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              percentage === 100 ? "bg-success/10" : "bg-primary/10"
            )}>
              <HeaderIcon className={cn(
                "h-5 w-5",
                percentage === 100 ? "text-success" : "text-primary"
              )} />
            </div>
            <div>
              <CardTitle className="text-base">{titleAmharic}</CardTitle>
              <p className="text-xs text-muted-foreground">{titleEnglish}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn(
              "text-2xl font-bold tabular-nums",
              percentage === 100 ? "text-success" : hasErrors ? "text-destructive" : "text-foreground"
            )}>
              {percentage}%
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={percentage} className={cn("h-2", progressColor)} />

        <div className="space-y-2">
          {items.map((item) => {
            const StatusIcon = statusIcons[item.status];
            const colorClass = statusColors[item.status];

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-lg transition-colors",
                  item.status === "complete" && "bg-success/5",
                  item.status === "error" && "bg-destructive/5",
                  item.status === "warning" && "bg-warning/5"
                )}
              >
                <StatusIcon className={cn("h-4 w-4 mt-0.5 shrink-0", colorClass)} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    item.status === "complete" && "text-success",
                    item.status === "error" && "text-destructive",
                    item.status === "warning" && "text-warning"
                  )}>
                    {item.labelAmharic}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.labelEnglish}</p>
                  {item.detail && (
                    <p className={cn("text-xs mt-1", colorClass)}>{item.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReadinessCard;
