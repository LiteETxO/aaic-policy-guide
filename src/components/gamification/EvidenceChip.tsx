import { BookOpen, FileText, Hash, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface EvidenceData {
  documentName: string;
  articleSection: string;
  pageNumber: number;
  quote: string;
  relevance?: string;
  itemName?: string;
}

interface EvidenceChipProps {
  evidence: EvidenceData;
  variant?: "default" | "compact";
  className?: string;
}

const EvidenceChip = ({ evidence, variant = "default", className }: EvidenceChipProps) => {
  const isCompact = variant === "compact";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className={cn(
            "group inline-flex items-center gap-2 rounded-lg border transition-all duration-200",
            "hover:border-primary hover:bg-primary/5 hover:shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            isCompact ? "px-2 py-1" : "px-3 py-2",
            "bg-background text-left cursor-pointer",
            className
          )}
        >
          <BookOpen className={cn("shrink-0 text-primary", isCompact ? "h-3 w-3" : "h-4 w-4")} />
          
          <div className="flex items-center gap-2 min-w-0">
            <Badge 
              variant="outline" 
              className={cn(
                "shrink-0 bg-primary/5 border-primary/20 text-primary",
                isCompact && "text-[10px] px-1.5 py-0"
              )}
            >
              {evidence.articleSection}
            </Badge>
            
            {!isCompact && (
              <>
                <span className="text-sm font-medium truncate max-w-[150px]">
                  {evidence.documentName}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  p.{evidence.pageNumber}
                </span>
              </>
            )}
          </div>

          <ChevronRight className={cn(
            "shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5",
            isCompact ? "h-3 w-3" : "h-4 w-4"
          )} />
        </button>
      </SheetTrigger>

      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>የፖሊሲ ማጣቀሻ (Policy Citation)</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Document Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{evidence.documentName}</p>
                <p className="text-sm text-muted-foreground">Source Document</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1.5 bg-muted">
                <Hash className="h-3 w-3" />
                {evidence.articleSection}
              </Badge>
              <Badge variant="outline" className="bg-muted">
                Page {evidence.pageNumber}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Quote Section */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              ጥቅስ (Quote)
            </p>
            <blockquote className="border-l-4 border-primary pl-4 py-2 bg-muted/50 rounded-r-lg">
              <p className="text-sm italic leading-relaxed">"{evidence.quote}"</p>
            </blockquote>
          </div>

          {/* Relevance */}
          {evidence.relevance && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                ለምን አስፈላጊ ነው (Why It Matters)
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {evidence.relevance}
              </p>
            </div>
          )}

          {/* Applied To */}
          {evidence.itemName && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                ለ (Applied To)
              </p>
              <Badge variant="secondary" className="text-sm">
                {evidence.itemName}
              </Badge>
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              ይህን ጥቅስ በመጀመሪያው ሰነድ ውስጥ ማረጋገጥ ይችላሉ። ገጽ {evidence.pageNumber} ይመልከቱ።
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              (You can verify this citation in the original document. See page {evidence.pageNumber}.)
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EvidenceChip;
