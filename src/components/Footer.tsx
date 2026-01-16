import { Shield } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t bg-card py-10">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-hero">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold">Addis Ababa Investment Commission</p>
              <p className="text-sm text-muted-foreground">አዲስ አበባ ኢንቨስትመንት ኮሚሽን</p>
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="text-sm text-muted-foreground">
              Policy Interpretation & Decision Support System
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              © 2024 AAIC. All rights reserved.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t">
          <p className="text-xs text-center text-muted-foreground">
            <strong>Disclaimer:</strong> This system provides decision support only. 
            Final authority for compliance determinations rests with authorized AAIC officers. 
            All assessments should be verified against current Ministry of Finance guidelines.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
