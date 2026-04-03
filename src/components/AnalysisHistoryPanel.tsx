import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { History, Upload, Trash2, FileText, Clock } from "lucide-react";
import { format } from "date-fns";
import type { AnalysisSession } from "@/hooks/useAnalysisSessions";

interface AnalysisHistoryPanelProps {
  sessions: AnalysisSession[];
  isLoading: boolean;
  currentSessionId: string | null;
  onLoadSession: (session: AnalysisSession) => void;
  onDeleteSession: (id: string) => void;
  isDeleting?: boolean;
}

export function AnalysisHistoryPanel({
  sessions,
  isLoading,
  currentSessionId,
  onLoadSession,
  onDeleteSession,
  isDeleting,
}: AnalysisHistoryPanelProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getItemCount = (session: AnalysisSession): number => {
    if (!session.analysis_result) return 0;
    const result = session.analysis_result as any;
    return result?.items?.length || result?.analysis_items?.length || 0;
  };

  const getLicenseIdentifier = (session: AnalysisSession): string => {
    if (!session.license_data) return "N/A";
    const license = session.license_data as any;
    return license?.license_number || license?.licenseNumber || "N/A";
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Previous Analyses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Previous Analyses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No previous analyses found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Previous Analyses
          <Badge variant="secondary" className="ml-auto">
            {sessions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sessions.slice(0, 5).map((session) => {
          const isCurrentSession = session.id === currentSessionId;
          const itemCount = getItemCount(session);
          const licenseId = getLicenseIdentifier(session);

          return (
            <div
              key={session.id}
              className={`p-3 rounded-lg border transition-colors ${
                isCurrentSession
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/50 hover:border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">
                      License: {licenseId}
                    </span>
                    {isCurrentSession && (
                      <Badge variant="outline" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(session.created_at), "MMM d, yyyy HH:mm")}
                    </span>
                    <span>{itemCount} items</span>
                    <Badge
                      variant={session.status === "complete" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {session.status === "complete" ? "Complete" : "In Progress"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLoadSession(session)}
                    disabled={isCurrentSession}
                    className="h-8 px-2"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Load</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Analysis?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. The analysis and all its
                          results will be permanently deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteSession(session.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={isDeleting}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          );
        })}
        {sessions.length > 5 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            +{sessions.length - 5} more analyses
          </p>
        )}
      </CardContent>
    </Card>
  );
}
