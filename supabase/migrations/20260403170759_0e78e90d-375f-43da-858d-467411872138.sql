
-- 1. Remove UPDATE policy on user_gamification to prevent XP manipulation
-- The toggle_leaderboard_visibility RPC handles the only legitimate update
DROP POLICY IF EXISTS "Users can toggle leaderboard visibility only" ON public.user_gamification;

-- 2. Fix storage upload/update policies - fix r.name -> storage.objects.name
DROP POLICY IF EXISTS "Repo owners and collaborators can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Repo owners and collaborators can update files" ON storage.objects;

CREATE POLICY "Repo owners and collaborators can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'repo-files' AND (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.owner_id = auth.uid()
      AND storage.objects.name LIKE r.id::text || '/%'
    )
    OR EXISTS (
      SELECT 1 FROM public.repo_collaborators rc
      JOIN public.repositories r ON r.id = rc.repo_id
      WHERE rc.user_id = auth.uid()
      AND storage.objects.name LIKE r.id::text || '/%'
    )
  )
);

CREATE POLICY "Repo owners and collaborators can update files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'repo-files' AND (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.owner_id = auth.uid()
      AND storage.objects.name LIKE r.id::text || '/%'
    )
    OR EXISTS (
      SELECT 1 FROM public.repo_collaborators rc
      JOIN public.repositories r ON r.id = rc.repo_id
      WHERE rc.user_id = auth.uid()
      AND storage.objects.name LIKE r.id::text || '/%'
    )
  )
);

-- 3. Fix inventory privacy - restrict to authenticated users
DROP POLICY IF EXISTS "Inventory viewable by all" ON public.user_inventory;

CREATE POLICY "Inventory viewable by authenticated"
ON public.user_inventory FOR SELECT
TO authenticated
USING (true);
