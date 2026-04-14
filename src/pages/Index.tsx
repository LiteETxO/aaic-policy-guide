import { useState, useCallback } from "react";
import Header from "@/components/Header";
import DocumentUpload from "@/components/DocumentUpload";
import { AnalysisReport } from "@/components/AnalysisReport";
import StaticPolicyLibrary from "@/components/StaticPolicyLibrary";
import { useAnalysisSessions, type AnalysisSession } from "@/hooks/useAnalysisSessions";
import { useWorkflowStatus } from "@/hooks/useWorkflowStatus";
import { FileText, Trash2, Loader2, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Index = () => {
  const [view, setView] = useState<"upload" | "report" | "policies">("upload");
  const [analysisData, setAnalysisData] = useState<any>(null);

  const { reset } = useWorkflowStatus();
  const {
    sessions,
    isLoading: sessionsLoading,
    currentSessionId,
    setCurrentSessionId,
    saveSession,
    deleteSession,
    isDeleting,
  } = useAnalysisSessions();

  const handleAnalyze = useCallback(
    async (result: any) => {
      setAnalysisData(result);
      setView("report");
      try {
        await saveSession({ analysisResult: result, status: "complete" });
      } catch (err) {
        console.error("Failed to save session:", err);
      }
    },
    [saveSession]
  );

  const handleLoadSession = useCallback(
    (session: AnalysisSession) => {
      setAnalysisData(session.analysis_result);
      setCurrentSessionId(session.id);
      setView("report");
    },
    [setCurrentSessionId]
  );

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await deleteSession(id);
      if (id === currentSessionId) {
        setAnalysisData(null);
        setCurrentSessionId(null);
        setView("upload");
        reset();
      }
    },
    [deleteSession, currentSessionId, setCurrentSessionId, reset]
  );

  const handleNewAnalysis = useCallback(() => {
    setView("upload");
    setAnalysisData(null);
    setCurrentSessionId(null);
    reset();
  }, [reset, setCurrentSessionId]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* ── Left panel: Previous Analyses ── */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Previous Analyses
            </h3>
            {view === "report" && (
              <button
                onClick={handleNewAnalysis}
                className="text-slate-400 hover:text-slate-700 transition-colors"
                title="New Analysis"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {sessionsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-xs text-slate-400 text-center leading-relaxed">
              No previous analyses.
              <br />
              Run an analysis to see it here.
            </div>
          ) : (
            <ul className="py-2 flex-1">
              {sessions.map((session) => {
                const result = session.analysis_result as any;
                const name =
                  result?.metadata?.investorName ||
                  result?.metadata?.licenseNumber ||
                  "Analysis";
                const date = new Date(session.created_at).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "2-digit",
                } as Intl.DateTimeFormatOptions);
                const isActive = session.id === currentSessionId;
                const itemCount = result?.complianceItems?.length ?? 0;

                return (
                  <li
                    key={session.id}
                    className={cn(
                      "group flex items-start gap-2 mx-2 mb-0.5 rounded-lg px-2.5 py-2 cursor-pointer transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                    onClick={() => handleLoadSession(session)}
                  >
                    <FileText
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 mt-0.5",
                        isActive ? "text-blue-500" : "text-slate-400"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{name}</p>
                      <p className="text-[10px] text-slate-400">
                        {date}
                        {itemCount > 0 && ` · ${itemCount} items`}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 mt-0.5 p-0.5 text-slate-400 hover:text-red-500 transition-all"
                      disabled={isDeleting}
                      title="Delete session"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {view === "report" && (
            <div className="p-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={handleNewAnalysis}
              >
                <Plus className="h-3 w-3" />
                New Analysis
              </Button>
            </div>
          )}
          
          <div className="p-3 border-t border-slate-100 mt-auto">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full text-xs gap-1.5 justify-start",
                view === "policies" && "bg-blue-50 text-blue-700"
              )}
              onClick={() => setView("policies")}
            >
              <BookOpen className="h-3 w-3" />
              Policy Library
            </Button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-auto">
          {view === "upload" ? (
            <div className="max-w-3xl mx-auto px-6 py-10">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">
                  Generate Analysis Report
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Upload the investment license and commercial invoice to run a
                  compliance analysis under Directive 1064/2025.
                </p>
              </div>
              <DocumentUpload onAnalyze={handleAnalyze} />
            </div>
          ) : view === "report" ? (
            <AnalysisReport analysisData={analysisData} onBack={handleNewAnalysis} />
          ) : (
            <StaticPolicyLibrary />
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
