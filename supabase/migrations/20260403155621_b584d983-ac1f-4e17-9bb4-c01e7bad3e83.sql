
-- Make equipped cosmetics visible to everyone (including unauthenticated visitors)
DROP POLICY IF EXISTS "Equipped cosmetics viewable by all" ON public.user_equipped_cosmetics;
CREATE POLICY "Equipped cosmetics viewable by all" ON public.user_equipped_cosmetics
FOR SELECT TO public USING (true);

-- Make shop items visible to everyone
DROP POLICY IF EXISTS "Shop items viewable by all" ON public.shop_items;
CREATE POLICY "Shop items viewable by all" ON public.shop_items
FOR SELECT TO public USING (true);

-- Make user_inventory readable by public (so we can check ownership for any profile)
DROP POLICY IF EXISTS "Users can view own inventory" ON public.user_inventory;
CREATE POLICY "Inventory viewable by all" ON public.user_inventory
FOR SELECT TO public USING (true);
