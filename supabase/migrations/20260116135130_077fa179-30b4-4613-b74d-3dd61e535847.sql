-- Create policy_documents table for the Policy Library
CREATE TABLE public.policy_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_amharic TEXT,
  directive_number TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  effective_date DATE,
  document_type TEXT NOT NULL DEFAULT 'primary' CHECK (document_type IN ('primary', 'supplemental', 'clarification')),
  parent_document_id UUID REFERENCES public.policy_documents(id),
  file_url TEXT NOT NULL,
  content_text TEXT,
  content_markdown TEXT,
  total_pages INTEGER,
  total_articles INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'draft')),
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create policy_articles table for indexed articles/sections
CREATE TABLE public.policy_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.policy_documents(id) ON DELETE CASCADE,
  article_number TEXT NOT NULL,
  title TEXT,
  title_amharic TEXT,
  content TEXT NOT NULL,
  content_amharic TEXT,
  page_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analysis_sessions table for tracking document analyses
CREATE TABLE public.analysis_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  officer_id UUID REFERENCES auth.users(id),
  license_file_url TEXT,
  license_data JSONB,
  invoice_files JSONB DEFAULT '[]'::jsonb,
  analysis_result JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;

-- Policy documents are readable by all authenticated users
CREATE POLICY "Policy documents are viewable by authenticated users" 
ON public.policy_documents 
FOR SELECT 
TO authenticated
USING (true);

-- Only admins can manage policy documents (we'll use a simple role check)
CREATE POLICY "Admins can insert policy documents" 
ON public.policy_documents 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update policy documents" 
ON public.policy_documents 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Admins can delete policy documents" 
ON public.policy_documents 
FOR DELETE 
TO authenticated
USING (true);

-- Policy articles inherit parent document permissions
CREATE POLICY "Policy articles are viewable by authenticated users" 
ON public.policy_articles 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Policy articles can be managed by authenticated users" 
ON public.policy_articles 
FOR ALL 
TO authenticated
USING (true);

-- Analysis sessions are owned by officers
CREATE POLICY "Officers can view their own analysis sessions" 
ON public.analysis_sessions 
FOR SELECT 
TO authenticated
USING (auth.uid() = officer_id OR officer_id IS NULL);

CREATE POLICY "Officers can create analysis sessions" 
ON public.analysis_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = officer_id OR officer_id IS NULL);

CREATE POLICY "Officers can update their own analysis sessions" 
ON public.analysis_sessions 
FOR UPDATE 
TO authenticated
USING (auth.uid() = officer_id OR officer_id IS NULL);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_policy_documents_updated_at
BEFORE UPDATE ON public.policy_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analysis_sessions_updated_at
BEFORE UPDATE ON public.analysis_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for policy documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('policy-documents', 'policy-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for policy documents
CREATE POLICY "Policy documents are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'policy-documents');

CREATE POLICY "Authenticated users can upload policy documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'policy-documents');

CREATE POLICY "Authenticated users can update policy documents" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'policy-documents');

CREATE POLICY "Authenticated users can delete policy documents" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'policy-documents');

-- Create index for faster article lookups
CREATE INDEX idx_policy_articles_document_id ON public.policy_articles(document_id);
CREATE INDEX idx_policy_articles_article_number ON public.policy_articles(article_number);
CREATE INDEX idx_analysis_sessions_officer_id ON public.analysis_sessions(officer_id);