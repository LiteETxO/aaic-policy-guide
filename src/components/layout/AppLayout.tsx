import { ReactNode } from "react";
import Header from "@/components/Header";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
}

const AppLayout = ({ children, className }: AppLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Header />
      <main className={cn("flex-1 overflow-auto", className)}>{children}</main>
    </div>
  );
};

export default AppLayout;
