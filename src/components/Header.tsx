import { Shield, FileText, BarChart3, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-soft">
      <div className="container flex h-14 items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-hero shadow-sm">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-foreground">AAIC</span>
            <span className="text-[10px] text-muted-foreground font-medium">Policy Decision Support</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground h-8 px-3">
            <FileText className="h-3.5 w-3.5" />
            Documents
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground h-8 px-3">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </Button>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Bell className="h-4 w-4" />
          </Button>
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-foreground">Officer Portal</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
              Investment Commission
            </Badge>
          </div>
          <div className="h-8 w-8 rounded-full gradient-gold flex items-center justify-center ring-2 ring-offset-1 ring-amber-200 shadow-sm">
            <span className="text-xs font-bold text-white">AA</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
