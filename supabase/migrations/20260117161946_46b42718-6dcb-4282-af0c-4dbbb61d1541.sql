-- Add DELETE policy for analysis_sessions so officers can delete their own sessions
CREATE POLICY "Officers can delete their own analysis sessions"
ON analysis_sessions FOR DELETE
USING (auth.uid() = officer_id OR officer_id IS NULL);