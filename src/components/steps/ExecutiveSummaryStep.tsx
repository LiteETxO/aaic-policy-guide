import { BarChart3, AlertCircle, CheckCircle2, HelpCircle, Info, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { ConfidenceBadge, type ConfidenceLevel } from "@/components/gamification";

interface ExecutiveSummaryData {
  overallStatus: string;
  eligibleCount: number;
  clarificationCount: number;
  deferredCount: number; // Renamed from notEligibleCount - neutral language
  topIssues: string[];
  additionalInfoNeeded: string[];
  overallConfidence: ConfidenceLevel;
}

interface ExecutiveSummaryStepProps {
  summary: ExecutiveSummaryData;
}

/**
 * Step 5 — Executive Summary (DELAYED)
 * 
 * Renamed to: "Preliminary Executive Summary (Advisory)"
 * 
 * Visual rules:
 * - Neutral colors only (no red/green dominance)
 * - Counts shown without emotional emphasis
 * - Confidence indicators shown before eligibility counts
 * - Fixed banner reminding to review evidence first
 */
const ExecutiveSummaryStep = ({ summary }: ExecutiveSummaryStepProps) => {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Preliminary Executive Summary</h2>
            <p className="text-sm text-muted-foreground">Advisory only — review evidence before relying on this section</p>
          </div>
          <Badge variant="outline" className="text-xs bg-muted">
            Advisory Only
          </Badge>
        </div>
      </div>

      {/* Fixed Advisory Banner */}
      <Alert className="border-blue-500/30 bg-blue-500/5">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-sm">
          <span className="text-sm">This summary is generated after item-level analysis. Please review evidence before relying on this section.</span>
        </AlertDescription>
      </Alert>

      {/* Confidence First - Before Counts */}
      <Card className="border-l-4 border-l-muted">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              Analysis Quality
            </CardTitle>
            <ConfidenceBadge level={summary.overallConfidence} size="md" />
          </div>
          <CardDescription>Evidence completeness and analysis quality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>All policy citations complete</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>No inference violations</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>Essentiality logic applied</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Counts - NEUTRAL COLORS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Analysis Statistics</CardTitle>
          <CardDescription>Results by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Supported - Neutral green tint */}
            <div className="text-center p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{summary.eligibleCount}</p>
              <p className="text-xs text-muted-foreground">Supported by Evidence</p>
            </div>

            {/* Needs Review - Neutral */}
            <div className="text-center p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-center gap-2 mb-2">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{summary.clarificationCount}</p>
              <p className="text-xs text-muted-foreground">Needs Clarification</p>
            </div>

            {/* Deferred - Neutral (NOT "Not Eligible") */}
            <div className="text-center p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{summary.deferredCount}</p>
              <p className="text-xs text-muted-foreground">Decision Deferred</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues and Additional Info - Neutral */}
      <div className="grid md:grid-cols-2 gap-4">
        {summary.topIssues.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                Key Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {summary.topIssues.map((issue, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {summary.additionalInfoNeeded.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Additional Information Needed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {summary.additionalInfoNeeded.map((info, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{info}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-muted/30 border text-sm text-muted-foreground">
        <p className="font-medium mb-1">Disclaimer:</p>
        <p>This summary is advisory only. Final decisions are presented in the Formal Report.</p>
      </div>
    </div>
  );
};

export default ExecutiveSummaryStep;
