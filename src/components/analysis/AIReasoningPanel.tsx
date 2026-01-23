import { useState } from "react";
import { 
  Brain, ChevronDown, ChevronRight, FileText, BookOpen, 
  AlertTriangle, CheckCircle2, Search, Tag, Scale, Building2
} from "lucide-react";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PolicySource {
  documentName: string;
  documentNameAmharic?: string;
  issuingAuthority?: string;
  relevantArticles?: string[];
}

interface CitedClause {
  clauseId: string;
  articleSection: string;
  pageNumber: number;
  clauseText: string;
  clauseTextAmharic?: string;
}

interface ReasoningStep {
  step: string;
  description: string;
  descriptionAmharic?: string;
  status: "complete" | "partial" | "not_found";
}

export interface AIReasoningData {
  itemInterpretation: {
    classifiedAs: string;
    classifiedAsAmharic?: string;
    capitalGoodsCategory: string;
    capitalGoodsCategoryAmharic?: string;
  };
  policySources: PolicySource[];
  citedClauses: CitedClause[];
  reasoningSteps: ReasoningStep[];
  conclusion: string;
  conclusionAmharic?: string;
  policyGapDetected?: boolean;
  policyGapMessage?: string;
  keywordsExpanded?: string[];
}

interface AIReasoningPanelProps {
  data: AIReasoningData;
  className?: string;
  defaultOpen?: boolean;
}

const AIReasoningPanel = ({ data, className, defaultOpen = false }: AIReasoningPanelProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <button className={cn(
          "w-full flex items-center justify-between gap-3 p-3 rounded-lg transition-colors",
          "bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10",
          "border border-primary/20 text-left"
        )}>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                🧠 ስርዓቱ ይህን ዕቃ እንዴት ገመገመው
              </p>
              <p className="text-xs text-muted-foreground">
                How the system evaluated this item
              </p>
            </div>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3 space-y-4">
        {/* Item Interpretation */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-primary" />
            <h5 className="text-sm font-semibold">የዕቃ ትርጓሜ (Item Interpretation)</h5>
          </div>
          <p className="text-sm text-foreground">
            ይህ ዕቃ እንደ: <span className="font-medium text-primary">{data.itemInterpretation.classifiedAsAmharic || data.itemInterpretation.classifiedAs}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Classified as: {data.itemInterpretation.classifiedAs}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs bg-primary/5">
              {data.itemInterpretation.capitalGoodsCategoryAmharic || data.itemInterpretation.capitalGoodsCategory}
            </Badge>
          </div>
        </div>

        {/* Policy Sources Consulted */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h5 className="text-sm font-semibold">የተመከሩ የፖሊሲ ምንጮች (Policy Sources Consulted)</h5>
          </div>
          <ul className="space-y-2">
            {data.policySources.map((source, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{source.documentName}</p>
                  {source.issuingAuthority && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {source.issuingAuthority}
                    </p>
                  )}
                  {source.relevantArticles && source.relevantArticles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {source.relevantArticles.map((art, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] py-0">
                          {art}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Exact Clauses Cited */}
        {data.citedClauses.length > 0 && (
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="h-4 w-4 text-success" />
              <h5 className="text-sm font-semibold text-success">ትክክለኛ ድንጋጌ ተጠቅሷል (Exact Clause Cited)</h5>
            </div>
            <div className="space-y-3">
              {data.citedClauses.map((clause, idx) => (
                <div key={idx} className="p-2 rounded bg-background border">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
                      {clause.clauseId}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {clause.articleSection} • ገጽ {clause.pageNumber}
                    </span>
                  </div>
                  <p className="text-sm italic text-foreground leading-relaxed">
                    "{clause.clauseTextAmharic || clause.clauseText}"
                  </p>
                  {clause.clauseTextAmharic && (
                    <p className="text-xs text-muted-foreground mt-1">
                      "{clause.clauseText}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keywords Expanded (for policy gap scenarios) */}
        {data.policyGapDetected && data.keywordsExpanded && (
          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-4 w-4 text-warning" />
              <h5 className="text-sm font-semibold text-warning">🔍 የፖሊሲ ትርጓሜ ሁነታ (Policy Interpretation Mode)</h5>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Keywords were expanded to:</p>
            <div className="flex flex-wrap gap-1">
              {data.keywordsExpanded.map((kw, i) => (
                <Badge key={i} variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                  {kw}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Searching annexes and schedules…</p>
          </div>
        )}

        {/* Policy Gap Warning */}
        {data.policyGapDetected && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-warning">
                  ⚠️ የፖሊሲ ክፍተት ተገኝቷል — የአለቃ ግምገማ ይመከራል
                </p>
                <p className="text-xs text-muted-foreground">
                  Policy gap detected — recommend supervisor review
                </p>
                {data.policyGapMessage && (
                  <p className="text-sm text-foreground mt-1">{data.policyGapMessage}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conclusion */}
        <div className={cn(
          "p-3 rounded-lg border",
          data.policyGapDetected 
            ? "bg-warning/5 border-warning/20" 
            : "bg-success/5 border-success/20"
        )}>
          <div className="flex items-start gap-2">
            <CheckCircle2 className={cn(
              "h-4 w-4 mt-0.5 shrink-0",
              data.policyGapDetected ? "text-warning" : "text-success"
            )} />
            <div>
              <h5 className="text-sm font-semibold mb-1">
                {data.policyGapDetected ? "ጊዜያዊ ድምዳሜ" : "ድምዳሜ"} (Conclusion)
              </h5>
              <p className="text-sm text-foreground">
                {data.conclusionAmharic || data.conclusion}
              </p>
              {data.conclusionAmharic && (
                <p className="text-xs text-muted-foreground mt-1">
                  {data.conclusion}
                </p>
              )}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AIReasoningPanel;
