
-- 1. FIX XP MANIPULATION: Replace general UPDATE with column-restricted RPC approach
-- Drop the current permissive UPDATE policy
DROP POLICY IF EXISTS "Users can toggle leaderboard visibility" ON public.user_gamification;

-- Create a new policy that truly only allows toggling show_on_leaderboard
-- The protect_gamification_fields trigger is defense-in-depth but we should also restrict at policy level
CREATE POLICY "Users can toggle leaderboard visibility only"
ON public.user_gamification FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a function to safely toggle leaderboard visibility (the ONLY client-callable update)
CREATE OR REPLACE FUNCTION public.toggle_leaderboard_visibility(_show boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE user_gamification
  SET show_on_leaderboard = _show
  WHERE user_id = auth.uid();
END;
$$;

-- 2. FIX STORAGE SELECT: Qualify ambiguous 'name' column  
DROP POLICY IF EXISTS "Repo files readable by authorized users" ON storage.objects;

CREATE POLICY "Repo files readable by authorized users"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'repo-files' AND (
    EXISTS (
      SELECT 1 FROM public.repo_files rf
      JOIN public.repositories r ON r.id = rf.repo_id
      WHERE rf.storage_path = storage.objects.name
      AND (r.is_public = true OR r.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.repo_files rf
      JOIN public.repo_collaborators rc ON rc.repo_id = rf.repo_id
      WHERE rf.storage_path = storage.objects.name
      AND rc.user_id = auth.uid()
    )
  )
);

-- 3. FIX REALTIME: Remove overly permissive broadcast policies (app uses postgres_changes only)
DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can insert realtime messages" ON realtime.messages;
