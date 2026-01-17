-- Create analysis cache table for storing analysis results
CREATE TABLE public.analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_hash TEXT UNIQUE NOT NULL,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

-- Create indexes for efficient lookups and cleanup
CREATE INDEX idx_analysis_cache_hash ON public.analysis_cache(document_hash);
CREATE INDEX idx_analysis_cache_expires ON public.analysis_cache(expires_at);

-- Enable RLS
ALTER TABLE public.analysis_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read cached results
CREATE POLICY "Authenticated users can read cache"
ON public.analysis_cache
FOR SELECT
TO authenticated
USING (true);

-- Allow service role to insert/update/delete (edge function uses service role)
CREATE POLICY "Service role can manage cache"
ON public.analysis_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.analysis_cache IS 'Caches AI analysis results keyed by document hash for deterministic results';