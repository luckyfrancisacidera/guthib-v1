
-- 1. FIX XP MANIPULATION: Replace permissive UPDATE on user_gamification
DROP POLICY IF EXISTS "Users can update own gamification" ON public.user_gamification;

CREATE POLICY "Users can toggle leaderboard visibility"
ON public.user_gamification FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger to prevent direct XP/level/streak manipulation by users
CREATE OR REPLACE FUNCTION public.protect_gamification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role') = 'authenticated' THEN
    NEW.total_xp := OLD.total_xp;
    NEW.level := OLD.level;
    NEW.current_streak := OLD.current_streak;
    NEW.longest_streak := OLD.longest_streak;
    NEW.last_activity_date := OLD.last_activity_date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_gamification_trigger ON public.user_gamification;
CREATE TRIGGER protect_gamification_trigger
  BEFORE UPDATE ON public.user_gamification
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_gamification_fields();

-- 2. FIX STORAGE: Make repo-files bucket private and add ownership checks
UPDATE storage.buckets SET public = false WHERE id = 'repo-files';

DROP POLICY IF EXISTS "Repo files are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload repo files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own repo files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own repo files" ON storage.objects;

CREATE POLICY "Repo files readable by authorized users"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'repo-files' AND (
    EXISTS (
      SELECT 1 FROM public.repo_files rf
      JOIN public.repositories r ON r.id = rf.repo_id
      WHERE rf.storage_path = name
      AND (r.is_public = true OR r.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.repo_files rf
      JOIN public.repo_collaborators rc ON rc.repo_id = rf.repo_id
      WHERE rf.storage_path = name
      AND rc.user_id = auth.uid()
    )
  )
);

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

-- 3. FIX TASK_BOARD_COLUMNS: Add public/org visibility to SELECT policy
DROP POLICY IF EXISTS "Columns visible to board viewers" ON public.task_board_columns;

CREATE POLICY "Columns visible to board viewers"
ON public.task_board_columns FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM task_boards b
    WHERE b.id = task_board_columns.board_id
    AND (
      b.owner_id = auth.uid()
      OR is_board_member(auth.uid(), b.id)
      OR b.visibility = 'public'
      OR (b.visibility = 'organization' AND b.org_id IS NOT NULL AND is_org_member(auth.uid(), b.org_id))
    )
  )
);

-- 4. FIX REALTIME: Add RLS on realtime.messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read realtime messages"
ON realtime.messages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert realtime messages"
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (true);
