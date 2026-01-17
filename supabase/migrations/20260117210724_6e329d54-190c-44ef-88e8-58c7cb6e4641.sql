-- Policy Clause Index Table
-- This is the MANDATORY foundation for all analysis - no clause = no citation = no decision

-- Create inclusion type enum
CREATE TYPE public.clause_inclusion_type AS ENUM ('enabling', 'restrictive', 'exclusion', 'procedural');

-- Create section type enum
CREATE TYPE public.clause_section_type AS ENUM ('Article', 'Annex', 'Schedule', 'Item');

-- Create applies_to enum for what the clause covers
CREATE TYPE public.clause_applies_to AS ENUM ('capital_goods', 'customs_duty', 'income_tax', 'essentiality', 'exclusion', 'general_incentive');

-- Main policy clauses table
CREATE TABLE public.policy_clauses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clause_id TEXT NOT NULL UNIQUE,
  
  -- Policy document reference
  policy_document_id UUID REFERENCES public.policy_documents(id) ON DELETE CASCADE,
  policy_document_name TEXT NOT NULL,
  issuing_authority TEXT,
  policy_version TEXT DEFAULT '1.0',
  language TEXT NOT NULL DEFAULT 'Mixed' CHECK (language IN ('Amharic', 'English', 'Mixed')),
  
  -- Section identification
  section_type public.clause_section_type NOT NULL,
  section_number TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  
  -- Clause content
  clause_heading TEXT NOT NULL,
  clause_heading_amharic TEXT,
  clause_text TEXT NOT NULL,
  clause_text_amharic TEXT,
  
  -- Classification
  keywords TEXT[] DEFAULT '{}',
  applies_to public.clause_applies_to[] DEFAULT '{}',
  inclusion_type public.clause_inclusion_type NOT NULL DEFAULT 'enabling',
  
  -- Metadata
  notes TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient lookups
CREATE INDEX idx_policy_clauses_document ON public.policy_clauses(policy_document_id);
CREATE INDEX idx_policy_clauses_section ON public.policy_clauses(section_type, section_number);
CREATE INDEX idx_policy_clauses_page ON public.policy_clauses(page_number);
CREATE INDEX idx_policy_clauses_keywords ON public.policy_clauses USING GIN(keywords);
CREATE INDEX idx_policy_clauses_applies_to ON public.policy_clauses USING GIN(applies_to);
CREATE INDEX idx_policy_clauses_inclusion ON public.policy_clauses(inclusion_type);
CREATE INDEX idx_policy_clauses_clause_id ON public.policy_clauses(clause_id);

-- Enable RLS
ALTER TABLE public.policy_clauses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Policy clauses are readable by all authenticated users
CREATE POLICY "Authenticated users can view policy clauses"
ON public.policy_clauses FOR SELECT
USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete policy clauses
CREATE POLICY "Admins can manage policy clauses"
ON public.policy_clauses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow anonymous read access for public policy viewing
CREATE POLICY "Public read access for policy clauses"
ON public.policy_clauses FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_policy_clauses_updated_at
BEFORE UPDATE ON public.policy_clauses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.policy_clauses IS 'AAIC Policy Clause Index - Mandatory foundation for all analysis. No indexed clause = no citation = no decision.';
COMMENT ON COLUMN public.policy_clauses.clause_id IS 'Unique stable identifier for referencing in citations (e.g., DIR503_ART4_2)';
COMMENT ON COLUMN public.policy_clauses.clause_text IS 'Exact quote (≤25 words) or tight paraphrase of the clause';
COMMENT ON COLUMN public.policy_clauses.applies_to IS 'What this clause covers: capital_goods, customs_duty, income_tax, essentiality, exclusion, general_incentive';
COMMENT ON COLUMN public.policy_clauses.inclusion_type IS 'Whether the clause enables, restricts, excludes, or defines procedure';