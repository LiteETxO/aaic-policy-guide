-- Allow anon inserts (for non-logged-in analysis saves)
DROP POLICY IF EXISTS allow_anon_session_save ON public.analysis_sessions;
CREATE POLICY allow_anon_session_save ON public.analysis_sessions 
  FOR INSERT TO anon 
  WITH CHECK (officer_id IS NULL);

-- Allow anon reads of sessions without officer  
DROP POLICY IF EXISTS anon_read_sessions ON public.analysis_sessions;
CREATE POLICY anon_read_sessions ON public.analysis_sessions 
  FOR SELECT TO anon 
  USING (officer_id IS NULL);
