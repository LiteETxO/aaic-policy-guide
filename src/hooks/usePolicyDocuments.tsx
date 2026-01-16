import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PolicyDocument {
  id: string;
  name: string;
  name_amharic: string | null;
  directive_number: string | null;
  version: string;
  effective_date: string | null;
  document_type: string;
  parent_document_id: string | null;
  file_url: string;
  content_text: string | null;
  content_markdown: string | null;
  total_pages: number | null;
  total_articles: number | null;
  status: string;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

export const usePolicyDocuments = () => {
  return useQuery({
    queryKey: ["policy-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_documents")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching policy documents:", error);
        throw error;
      }

      return data as PolicyDocument[];
    },
  });
};

export const useUploadPolicyDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      name,
      nameAmharic,
      directiveNumber,
      version,
      effectiveDate,
      documentType,
      parentDocumentId,
      contentMarkdown,
    }: {
      file: File;
      name: string;
      nameAmharic?: string;
      directiveNumber?: string;
      version?: string;
      effectiveDate?: string;
      documentType?: string;
      parentDocumentId?: string;
      contentMarkdown?: string;
    }) => {
      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("policy-documents")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("policy-documents")
        .getPublicUrl(fileName);

      // Insert document record
      const { data, error } = await supabase
        .from("policy_documents")
        .insert({
          name,
          name_amharic: nameAmharic || null,
          directive_number: directiveNumber || null,
          version: version || "1.0",
          effective_date: effectiveDate || null,
          document_type: documentType || "primary",
          parent_document_id: parentDocumentId || null,
          file_url: urlData.publicUrl,
          content_markdown: contentMarkdown || null,
          status: "active",
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting document record:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-documents"] });
      toast.success("Policy document uploaded successfully");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload policy document");
    },
  });
};

export const useUpdatePolicyDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<PolicyDocument>;
    }) => {
      const { data, error } = await supabase
        .from("policy_documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating document:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-documents"] });
      toast.success("Policy document updated");
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Failed to update policy document");
    },
  });
};

export const useDeletePolicyDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("policy_documents")
        .update({ status: "superseded" })
        .eq("id", id);

      if (error) {
        console.error("Error deleting document:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-documents"] });
      toast.success("Policy document removed");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to remove policy document");
    },
  });
};
