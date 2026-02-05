import type { BuildingBlock } from "./buildingBlock";

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  duration_days: number;
  target_group: string | null;
  image_url: string | null;
  indicative_price_pp: number | null;
  is_published: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  items?: ProgramTemplateItem[];
}

export interface ProgramTemplateItem {
  id: string;
  template_id: string;
  block_id: string;
  day_index: number;
  preferred_time: string | null;
  notes: string | null;
  sort_order: number;
  created_at?: string;
  // Joined data from building_blocks
  block?: BuildingBlock;
}
