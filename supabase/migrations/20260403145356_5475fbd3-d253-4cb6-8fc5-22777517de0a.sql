
-- Shop items catalog
CREATE TABLE public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL, -- 'border', 'name_effect', 'badge_style', 'profile_accent'
  css_value text NOT NULL, -- the actual CSS class/value to apply
  preview_css text, -- preview styling hint
  price integer NOT NULL DEFAULT 50,
  rarity text NOT NULL DEFAULT 'common', -- common, rare, epic, legendary
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop items viewable by all" ON public.shop_items
  FOR SELECT TO authenticated USING (true);

-- User inventory (owned items)
CREATE TABLE public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory" ON public.user_inventory
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can purchase items" ON public.user_inventory
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- User equipped cosmetics (one per category)
CREATE TABLE public.user_equipped_cosmetics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  item_id uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  equipped_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.user_equipped_cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipped cosmetics viewable by all" ON public.user_equipped_cosmetics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can equip own cosmetics" ON public.user_equipped_cosmetics
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own equipped" ON public.user_equipped_cosmetics
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can unequip own cosmetics" ON public.user_equipped_cosmetics
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Seed shop items
INSERT INTO public.shop_items (name, description, category, css_value, price, rarity) VALUES
-- Borders
('Emerald Ring', 'A vibrant green border around your avatar', 'border', 'ring-2 ring-emerald-400', 30, 'common'),
('Violet Aura', 'A purple glowing border', 'border', 'ring-2 ring-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.5)]', 60, 'rare'),
('Solar Flare', 'A fiery orange-gold border', 'border', 'ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]', 80, 'rare'),
('Neon Pulse', 'A pulsing cyan neon border', 'border', 'ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.6)] animate-pulse', 120, 'epic'),
('Rainbow Crown', 'A legendary rainbow animated border', 'border', 'ring-2 ring-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.6)]', 200, 'legendary'),

-- Name Effects
('Golden Name', 'Your username shines gold', 'name_effect', 'text-amber-400 font-bold', 40, 'common'),
('Neon Green', 'Electric green username', 'name_effect', 'text-emerald-400 font-bold', 40, 'common'),
('Purple Glow', 'Glowing purple username', 'name_effect', 'text-purple-400 font-bold drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]', 75, 'rare'),
('Ice Blue', 'Frosty blue glowing name', 'name_effect', 'text-cyan-300 font-bold drop-shadow-[0_0_6px_rgba(103,232,249,0.8)]', 75, 'rare'),
('Inferno', 'A blazing red-orange name', 'name_effect', 'text-orange-400 font-bold drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]', 100, 'epic'),

-- Badge Styles
('Crystal Badge', 'Badges get a crystal-clear look', 'badge_style', 'bg-white/10 border-white/30 backdrop-blur-sm', 50, 'common'),
('Midnight Badge', 'Dark elegant badge styling', 'badge_style', 'bg-indigo-950/50 border-indigo-500/40 text-indigo-300', 50, 'common'),
('Holographic', 'Shimmering holographic badge style', 'badge_style', 'bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 border-purple-400/40', 100, 'epic'),

-- Profile Accents
('Ocean Breeze', 'A calm blue accent theme', 'profile_accent', 'from-blue-500/20 to-cyan-500/10', 45, 'common'),
('Sunset Glow', 'Warm sunset gradient accent', 'profile_accent', 'from-orange-500/20 to-pink-500/10', 45, 'common'),
('Northern Lights', 'Aurora borealis profile accent', 'profile_accent', 'from-emerald-500/20 via-cyan-500/10 to-purple-500/20', 90, 'rare');
