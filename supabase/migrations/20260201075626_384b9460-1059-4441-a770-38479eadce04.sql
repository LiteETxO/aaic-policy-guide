-- Add public read access policy for policy_documents table
-- This allows unauthenticated users to view policy documents (needed for analysis to work before login)
CREATE POLICY "Public read access for policy documents" 
ON public.policy_documents 
FOR SELECT 
USING (true);