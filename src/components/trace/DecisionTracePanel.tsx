import { useState, useEffect, useRef } from "react";
import { 
  ChevronRight, 
  ChevronLeft,
  FileText,
  Search,
  Link2,
  GitBranch,
  Shield,
  Scale,
  CheckCircle2,
  Ban,
  AlertTriangle,
  Info,
  XCircle,
  Clock,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  useDecisionTrace, 
  type TraceEvent, 
  type TraceEventType,
  type TraceConfidence,
  type EngagementSignal 
} from "@/hooks/useDecisionTrace";

const eventTypeConfig: Record<TraceEventType, { 
  icon: typeof FileText; 
  color: string; 
  bgColor: string;
}> = {
  document_ingestion: { icon: FileText, color: "text-primary", bgColor: "bg-primary/10" },
  invoice_preservation: { icon: FileText, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  normalization: { icon: GitBranch, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  clause_retrieval: { icon: Search, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  clause_binding: { icon: Link2, color: "text-teal-500", bgColor: "bg-teal-500/10" },
  decision_path: { icon: GitBranch, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
  license_alignment: { icon: Shield, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  essentiality_check: { icon: Scale, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  decision_output: { icon: CheckCircle2, color: "text-success", bgColor: "bg-success/10" },
  blocked: { icon: Ban, color: "text-destructive", bgColor: "bg-destructive/10" },
  info: { icon: Info, color: "text-muted-foreground", bgColor: "bg-muted" },
  success: { icon: CheckCircle2, color: "text-success", bgColor: "bg-success/10" },
  warning: { icon: AlertTriangle, color: "text-warning", bgColor: "bg-warning/10" },
  error: { icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
};

const confidenceConfig: Record<TraceConfidence, { label: string; color: string }> = {
  high: { label: "ከፍተኛ", color: "text-success" },
  medium: { label: "መካከለኛ", color: "text-warning" },
  low: { label: "ዝቅተኛ", color: "text-orange-500" },
  none: { label: "—", color: "text-muted-foreground" },
};

interface TraceEventCardProps {
  event: TraceEvent;
  isLatest: boolean;
}

const TraceEventCard = ({ event, isLatest }: TraceEventCardProps) => {
  const config = eventTypeConfig[event.type];
  const Icon = config.icon;
  const confidenceInfo = event.confidence ? confidenceConfig[event.confidence] : null;

  return (
    <div 
      className={cn(
        "p-3 rounded-lg border transition-all duration-300",
        event.isBlocked && "border-destructive bg-destructive/5",
        isLatest && !event.isBlocked && "border-primary bg-primary/5 animate-pulse-subtle",
        !event.isBlocked && !isLatest && "border-border bg-card"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <div className={cn("p-1.5 rounded-md shrink-0", config.bgColor)}>
          <Icon className={cn("h-3.5 w-3.5", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">
            {event.isBlocked && "🚫 "}{event.labelAmharic}
          </p>
          <p className="text-xs text-muted-foreground">({event.labelEnglish})</p>
        </div>
        {confidenceInfo && event.confidence !== "none" && (
          <Badge variant="outline" className={cn("text-xs shrink-0", confidenceInfo.color)}>
            {confidenceInfo.label}
          </Badge>
        )}
      </div>

      {/* Action & Result */}
      <div className="space-y-1 text-xs">
        <p className="text-muted-foreground">
          <span className="font-medium">Action:</span> {event.action}
        </p>
        {event.result && (
          <p className={cn(
            "font-medium",
            event.isBlocked ? "text-destructive" : "text-foreground"
          )}>
            <span className="text-muted-foreground font-normal">Result:</span> {event.result}
          </p>
        )}
      </div>

      {/* Evidence */}
      {event.evidence && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Evidence:</p>
          <div className="flex flex-wrap gap-1">
            {event.evidence.clauseIds?.map((id) => (
              <Badge key={id} variant="secondary" className="text-xs font-mono">
                {id}
              </Badge>
            ))}
            {event.evidence.documentName && (
              <Badge variant="outline" className="text-xs">
                {event.evidence.documentName}
                {event.evidence.pageNumber && ` p.${event.evidence.pageNumber}`}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Next Action (for blocked) */}
      {event.nextAction && (
        <div className="mt-2 p-2 rounded bg-warning/10 border border-warning/20">
          <p className="text-xs text-warning font-medium">
            ቀጣይ እርምጃ (Next Action):
          </p>
          <p className="text-xs text-warning/80">{event.nextAction}</p>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {event.timestamp.toLocaleTimeString("en-US", { 
          hour: "2-digit", 
          minute: "2-digit", 
          second: "2-digit" 
        })}
      </div>
    </div>
  );
};

interface EngagementSignalBadgeProps {
  signal: EngagementSignal;
}

const EngagementSignalBadge = ({ signal }: EngagementSignalBadgeProps) => {
  const typeConfig = {
    evidence_collected: { color: "bg-success/10 text-success border-success/20" },
    citations_complete: { color: "bg-success/10 text-success border-success/20" },
    awaiting_clarification: { color: "bg-warning/10 text-warning border-warning/20" },
    ready_for_report: { color: "bg-primary/10 text-primary border-primary/20" },
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("text-xs animate-fade-in", typeConfig[signal.type].color)}
    >
      {signal.message}
    </Badge>
  );
};

interface DecisionTracePanelProps {
  className?: string;
}

const DecisionTracePanel = ({ className }: DecisionTracePanelProps) => {
  const { 
    events, 
    engagementSignals, 
    isAnalyzing, 
    isPanelOpen, 
    togglePanel 
  } = useDecisionTrace();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, autoScroll]);

  // Calculate stats
  const blockedCount = events.filter((e) => e.isBlocked).length;
  const successCount = events.filter((e) => e.type === "success" || e.type === "decision_output").length;
  const clausesBound = events.filter((e) => e.type === "clause_binding").length;

  if (!isPanelOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={togglePanel}
        className={cn(
          "fixed right-4 top-20 z-40 gap-2 shadow-lg",
          isAnalyzing && "animate-pulse border-primary"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Show Trace</span>
        {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
        {blockedCount > 0 && (
          <Badge variant="destructive" className="ml-1">
            {blockedCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className={cn(
      "w-80 shrink-0 flex flex-col border-l shadow-lg",
      className
    )}>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <GitBranch className="h-4 w-4 text-primary" />
            )}
            <span>የውሳኔ ዱካ</span>
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePanel}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">(Decision Trace)</p>

        {/* Stats Row */}
        <div className="flex gap-2 flex-wrap">
          {clausesBound > 0 && (
            <Badge variant="secondary" className="text-xs">
              {clausesBound} clauses bound
            </Badge>
          )}
          {successCount > 0 && (
            <Badge variant="outline" className="text-xs text-success border-success/20">
              {successCount} complete
            </Badge>
          )}
          {blockedCount > 0 && (
            <Badge variant="outline" className="text-xs text-destructive border-destructive/20">
              {blockedCount} blocked
            </Badge>
          )}
        </div>

        {/* Engagement Signals */}
        {engagementSignals.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {engagementSignals.slice(-3).map((signal) => (
              <EngagementSignalBadge key={signal.id} signal={signal} />
            ))}
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-0 overflow-hidden">
        {events.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">ትንተና ሲጀመር የውሳኔ ዱካ እዚህ ይታያል</p>
            <p className="text-xs mt-1">(Decision trace will appear here when analysis starts)</p>
          </div>
        ) : (
          <ScrollArea 
            ref={scrollRef as any}
            className="h-[calc(100vh-280px)]"
          >
            <div className="p-3 space-y-2">
              {events.map((event, index) => (
                <TraceEventCard 
                  key={event.id} 
                  event={event} 
                  isLatest={index === events.length - 1}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Auto-scroll toggle */}
      {events.length > 5 && (
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {autoScroll ? "Disable auto-scroll" : "Enable auto-scroll"}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default DecisionTracePanel;
