import { Shield, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-hero">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight">AAIC</span>
            <span className="text-xs text-muted-foreground">Policy Decision Support</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium">Officer Portal</span>
            <span className="text-xs text-muted-foreground">አዲስ አበባ ኢንቨስትመንት ኮሚሽን</span>
          </div>
          <div className="h-9 w-9 rounded-full gradient-gold flex items-center justify-center">
            <span className="text-sm font-semibold text-accent-foreground">AA</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
