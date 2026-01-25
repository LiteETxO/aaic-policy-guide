import { useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OfficerVerificationToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

const OfficerVerificationToggle = ({ 
  isEnabled, 
  onToggle, 
  className 
}: OfficerVerificationToggleProps) => {
  return (
    <div className={cn(
      "flex items-center justify-between gap-4 p-3 rounded-lg border transition-colors",
      isEnabled 
        ? "bg-primary/10 border-primary/30" 
        : "bg-muted/50 border-border",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
          isEnabled ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          {isEnabled ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Label 
              htmlFor="officer-verification-mode" 
              className="text-sm font-semibold cursor-pointer"
            >
              የባለስልጣን ማረጋገጫ ሁነታ
            </Label>
            {isEnabled && (
              <Badge variant="default" className="text-[10px] bg-primary">
                ገባሪ (Active)
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Officer Verification Mode
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right text-xs text-muted-foreground hidden sm:block">
          {isEnabled ? (
            <div className="flex items-center gap-1.5">
              <EyeOff className="h-3 w-3" />
              <span>AI confidence hidden</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Eye className="h-3 w-3" />
              <span>Full view</span>
            </div>
          )}
        </div>
        <Switch
          id="officer-verification-mode"
          checked={isEnabled}
          onCheckedChange={onToggle}
        />
      </div>
    </div>
  );
};

// What Officer Verification Mode hides:
// - AI confidence language
// - AI reasoning summaries
// - Probability scores
// What it highlights:
// - License name/activity
// - Guideline section
// - Goods interpretation logic (clause references)

export default OfficerVerificationToggle;
