-- Create shared_programs table for program sharing functionality
CREATE TABLE public.shared_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code TEXT NOT NULL UNIQUE,
  cart_items JSONB NOT NULL,
  number_of_people INTEGER NOT NULL DEFAULT 20,
  selected_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

-- Create index on share_code for fast lookups
CREATE INDEX idx_shared_programs_share_code ON public.shared_programs (share_code);

-- Create index for cleanup of expired programs
CREATE INDEX idx_shared_programs_expires_at ON public.shared_programs (expires_at);

-- Enable RLS
ALTER TABLE public.shared_programs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read shared programs (public sharing)
CREATE POLICY "Shared programs are publicly readable"
ON public.shared_programs
FOR SELECT
USING (expires_at > now());

-- Allow anyone to create shared programs (no auth required for sharing)
CREATE POLICY "Anyone can create shared programs"
ON public.shared_programs
FOR INSERT
WITH CHECK (true);