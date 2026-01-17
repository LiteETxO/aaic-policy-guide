import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface AnalysisSession {
  id: string;
  officer_id: string | null;
  license_data: Json | null;
  invoice_files: Json | null;
  license_file_url: string | null;
  analysis_result: Json | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SaveSessionParams {
  licenseData?: Json;
  invoiceFiles?: Json;
  licenseFileUrl?: string;
  analysisResult: Json;
  status?: string;
}

export function useAnalysisSessions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Fetch all sessions for the current user
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["analysis-sessions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("analysis_sessions")
        .select("*")
        .eq("officer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AnalysisSession[];
    },
    enabled: !!user?.id,
  });

  // Save a new session
  const saveSessionMutation = useMutation({
    mutationFn: async (params: SaveSessionParams) => {
      const { data, error } = await supabase
        .from("analysis_sessions")
        .insert({
          officer_id: user?.id || null,
          license_data: params.licenseData || null,
          invoice_files: params.invoiceFiles || null,
          license_file_url: params.licenseFileUrl || null,
          analysis_result: params.analysisResult,
          status: params.status || "complete",
        })
        .select()
        .single();

      if (error) throw error;
      return data as AnalysisSession;
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.id);
      queryClient.invalidateQueries({ queryKey: ["analysis-sessions"] });
      toast.success("ትንታኔ ተቀምጧል (Analysis saved)");
    },
    onError: (error) => {
      console.error("Failed to save session:", error);
      toast.error("ትንታኔን ማስቀመጥ አልተሳካም (Failed to save analysis)");
    },
  });

  // Update an existing session
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, ...params }: SaveSessionParams & { id: string }) => {
      const { data, error } = await supabase
        .from("analysis_sessions")
        .update({
          license_data: params.licenseData,
          invoice_files: params.invoiceFiles,
          license_file_url: params.licenseFileUrl,
          analysis_result: params.analysisResult,
          status: params.status,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as AnalysisSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-sessions"] });
    },
    onError: (error) => {
      console.error("Failed to update session:", error);
      toast.error("ትንታኔን ማዘመን አልተሳካም (Failed to update analysis)");
    },
  });

  // Delete a session
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("analysis_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      if (currentSessionId === deletedId) {
        setCurrentSessionId(null);
      }
      queryClient.invalidateQueries({ queryKey: ["analysis-sessions"] });
      toast.success("ትንታኔ ተሰርዟል (Analysis deleted)");
    },
    onError: (error) => {
      console.error("Failed to delete session:", error);
      toast.error("ትንታኔን መሰረዝ አልተሳካም (Failed to delete analysis)");
    },
  });

  return {
    sessions,
    isLoading,
    currentSessionId,
    setCurrentSessionId,
    saveSession: saveSessionMutation.mutateAsync,
    updateSession: updateSessionMutation.mutateAsync,
    deleteSession: deleteSessionMutation.mutateAsync,
    isSaving: saveSessionMutation.isPending,
    isDeleting: deleteSessionMutation.isPending,
  };
}
