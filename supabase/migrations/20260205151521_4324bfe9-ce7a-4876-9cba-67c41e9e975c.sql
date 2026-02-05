-- Create program_templates table
CREATE TABLE public.program_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  duration_days INTEGER NOT NULL,
  target_group TEXT,
  image_url TEXT,
  indicative_price_pp DECIMAL,
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.program_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for program_templates
CREATE POLICY "Published templates readable" ON public.program_templates
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admin full access templates" ON public.program_templates
  FOR ALL USING (public.is_admin(auth.uid()));

-- Create program_template_items table
CREATE TABLE public.program_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL REFERENCES public.program_templates(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL REFERENCES public.building_blocks(id),
  day_index INTEGER NOT NULL DEFAULT 0,
  preferred_time TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.program_template_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for program_template_items
CREATE POLICY "Readable via published template" ON public.program_template_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.program_templates 
      WHERE id = template_id AND is_published = true
    )
  );

CREATE POLICY "Admin full access template items" ON public.program_template_items
  FOR ALL USING (public.is_admin(auth.uid()));

-- Add updated_at trigger for templates
CREATE TRIGGER update_program_templates_updated_at
  BEFORE UPDATE ON public.program_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data: 3 example templates
INSERT INTO public.program_templates (id, name, short_description, description, duration_days, is_published, sort_order) VALUES
('eilanddag-compleet', 'Eilanddag Compleet', 'Actief dagprogramma met lunch, activiteit en borrel', 'Een complete dag Vlieland met overtocht, fietsen, lunch op een spectaculaire locatie, strandactiviteiten en afsluiting met borrel.', 1, true, 1),
('avontuur-ontspanning', 'Avontuur & Ontspanning', 'Twee dagen actie en genieten', 'Spectaculaire RescueBoat overtocht, outdoor activiteiten, zeehondentocht en culinaire verwennerij. Twee dagen vol avontuur en ontspanning op Vlieland.', 2, true, 2),
('complete-eilandervaring', 'Complete Eilandervaring', 'Drie dagen vol avontuur', 'Het ultieme Vlieland programma: alle hoogtepunten in drie dagen. Van spectaculaire overtocht tot outdoor activiteiten, culinaire verwennerij en natuurbeleving.', 3, true, 3);