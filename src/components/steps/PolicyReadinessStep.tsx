import { CheckCircle2, AlertTriangle, XCircle, BookOpen, FileCheck, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PolicyDocument {
  id: string;
  name: string;
  nameAmharic?: string;
  directiveNumber?: string;
  status: string;
  documentType: string;
  articlesIndexed?: number;
  annexesDetected?: string[];
  capitalGoodsListPresent?: boolean;
}

interface PolicyReadinessStepProps {
  policyDocuments: PolicyDocument[];
  isLoading?: boolean;
  children?: React.ReactNode;
}

/**
 * Step 1 — Policy Readiness
 * Shows ONLY:
 * - Policy Library cards
 * - Readiness meters
 * - Document Comprehension Gate
 * 
 * Does NOT show:
 * - Executive Summary
 * - Eligibility labels
 * - Verdict colors
 */
const PolicyReadinessStep = ({
  policyDocuments,
  isLoading,
  children,
}: PolicyReadinessStepProps) => {
  const totalDocs = policyDocuments.length;
  const activeDocs = policyDocuments.filter((d) => d.status === "active").length;
  const hasCapitalGoodsList = policyDocuments.some((d) => d.capitalGoodsListPresent);
  
  // Calculate readiness score
  const readinessItems = [
    { label: "Policy Documents Loaded", labelAmharic: "የፖሊሲ ሰነዶች ተጫኑ", done: totalDocs > 0 },
    { label: "Articles Indexed", labelAmharic: "አንቀጾች ተዘረዘሩ", done: policyDocuments.some((d) => (d.articlesIndexed ?? 0) > 0) },
    { label: "Annexes Detected", labelAmharic: "አባሪዎች ተገኙ", done: policyDocuments.some((d) => (d.annexesDetected?.length ?? 0) > 0) },
    { label: "Capital Goods List Found", labelAmharic: "የካፒታል ዕቃዎች ዝርዝር ተገኘ", done: hasCapitalGoodsList },
  ];
  
  const readinessScore = (readinessItems.filter((r) => r.done).length / readinessItems.length) * 100;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">የፖሊሲ ዝግጁነት (Policy Readiness)</h2>
            <p className="text-sm text-muted-foreground">
              ከመቀጠልዎ በፊት የፖሊሲ ቤተ-መጽሐፍት ዝግጁ መሆኑን ያረጋግጡ
            </p>
          </div>
        </div>
      </div>

      {/* Readiness Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              የፖሊሲ ማረጋገጫ (Policy Verification)
            </CardTitle>
            <Badge
              variant="outline"
              className={cn(
                readinessScore === 100
                  ? "bg-success/10 text-success border-success/30"
                  : readinessScore >= 50
                    ? "bg-warning/10 text-warning border-warning/30"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {Math.round(readinessScore)}% ዝግጁ
            </Badge>
          </div>
          <CardDescription>
            Policy documents must be verified before case analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <Progress value={readinessScore} className="h-2" />

          {/* Checklist */}
          <div className="grid gap-2">
            {readinessItems.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  item.done
                    ? "bg-success/5 border-success/20"
                    : "bg-muted/30 border-border"
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <p className={cn("text-sm font-medium", item.done ? "text-success" : "text-muted-foreground")}>
                    {item.labelAmharic}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
                {item.done ? (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                    ✓ ተጠናቋል
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground text-xs">
                    ይጠበቃል
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Warning if missing critical items */}
          {!hasCapitalGoodsList && totalDocs > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">
                  የካፒታል ዕቃዎች ዝርዝር አልተገኘም (Capital Goods List Missing)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Admin must upload policy documents containing the capital goods list before analysis can proceed.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policy Library Content (passed as children) */}
      {children}

      {/* No conclusions notice */}
      <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 border border-border text-sm text-muted-foreground">
        <Lock className="h-4 w-4 shrink-0" />
        <span>
          <span className="font-medium">ማሳሰቢያ:</span> በዚህ ደረጃ ምንም ውሳኔ አይደረግም። (No conclusions are made at this stage.)
        </span>
      </div>
    </div>
  );
};

export default PolicyReadinessStep;
