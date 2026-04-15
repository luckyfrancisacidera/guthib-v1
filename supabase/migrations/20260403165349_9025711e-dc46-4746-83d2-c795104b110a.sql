
-- 1. FIX STORAGE: Replace broken owner-check conditions (r.name → name)
DROP POLICY IF EXISTS "Repo owners and collaborators can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Repo owners and collaborators can update files" ON storage.objects;
DROP POLICY IF EXISTS "Repo owners can delete storage files" ON storage.objects;

CREATE POLICY "Repo owners and collaborators can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'repo-files' AND auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.owner_id = auth.uid()
      AND name LIKE r.id::text || '/%'
    )
    OR EXISTS (
      SELECT 1 FROM public.repo_collaborators rc
      WHERE rc.user_id = auth.uid()
      AND name LIKE rc.repo_id::text || '/%'
    )
  )
);

CREATE POLICY "Repo owners and collaborators can update files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'repo-files' AND auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.owner_id = auth.uid()
      AND name LIKE r.id::text || '/%'
    )
    OR EXISTS (
      SELECT 1 FROM public.repo_collaborators rc
      WHERE rc.user_id = auth.uid()
      AND name LIKE rc.repo_id::text || '/%'
    )
  )
);

CREATE POLICY "Repo owners can delete storage files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'repo-files' AND auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.repositories r
    WHERE r.owner_id = auth.uid()
    AND name LIKE r.id::text || '/%'
  )
);

-- 2. FIX PURCHASE BYPASS: Remove direct INSERT on user_inventory, create secure RPC
DROP POLICY IF EXISTS "Users can purchase items" ON public.user_inventory;

CREATE OR REPLACE FUNCTION public.purchase_item(_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_price integer;
  v_user_xp integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  -- Get item price
  SELECT price INTO v_price FROM shop_items WHERE id = _item_id;
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  -- Check not already owned
  IF EXISTS (SELECT 1 FROM user_inventory WHERE user_id = auth.uid() AND item_id = _item_id) THEN
    RAISE EXCEPTION 'Item already owned';
  END IF;

  -- Get user XP with row lock
  SELECT total_xp INTO v_user_xp FROM user_gamification WHERE user_id = auth.uid() FOR UPDATE;
  IF v_user_xp IS NULL THEN
    RAISE EXCEPTION 'No gamification record found';
  END IF;

  IF v_user_xp < v_price THEN
    RAISE EXCEPTION 'Not enough XP. Need % more.', (v_price - v_user_xp);
  END IF;

  -- Deduct XP
  v_new_xp := v_user_xp - v_price;
  v_new_level := GREATEST(1, v_new_xp / 100 + 1);
  UPDATE user_gamification SET total_xp = v_new_xp, level = v_new_level WHERE user_id = auth.uid();

  -- Add to inventory
  INSERT INTO user_inventory (user_id, item_id) VALUES (auth.uid(), _item_id);
END;
$$;
