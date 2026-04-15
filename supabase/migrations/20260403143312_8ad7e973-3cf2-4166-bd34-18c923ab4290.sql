
-- Create repo_collaborators table
CREATE TABLE public.repo_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'collaborator',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(repo_id, user_id)
);

ALTER TABLE public.repo_collaborators ENABLE ROW LEVEL SECURITY;

-- Everyone can see collaborators of public repos
CREATE POLICY "Collaborators viewable on public repos" ON public.repo_collaborators
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM repositories r
    WHERE r.id = repo_collaborators.repo_id
    AND (r.is_public = true OR r.owner_id = auth.uid())
  )
);

-- Repo owners can add collaborators
CREATE POLICY "Repo owners can add collaborators" ON public.repo_collaborators
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM repositories r
    WHERE r.id = repo_collaborators.repo_id AND r.owner_id = auth.uid()
  )
);

-- Repo owners can remove collaborators
CREATE POLICY "Repo owners can remove collaborators" ON public.repo_collaborators
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM repositories r
    WHERE r.id = repo_collaborators.repo_id AND r.owner_id = auth.uid()
  )
);

-- Update repo_files policies to allow collaborators to upload
CREATE POLICY "Collaborators can upload files" ON public.repo_files
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM repo_collaborators rc
    WHERE rc.repo_id = repo_files.repo_id AND rc.user_id = auth.uid()
  )
);

CREATE POLICY "Collaborators can update files" ON public.repo_files
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM repo_collaborators rc
    WHERE rc.repo_id = repo_files.repo_id AND rc.user_id = auth.uid()
  )
);

-- Allow collaborators to create commits
CREATE POLICY "Collaborators can create commits" ON public.commits
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = author_id AND EXISTS (
    SELECT 1 FROM repo_collaborators rc
    WHERE rc.repo_id = commits.repo_id AND rc.user_id = auth.uid()
  )
);

-- Allow collaborators to insert commit files
CREATE POLICY "Collaborators can insert commit files" ON public.commit_files
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM commits c
    JOIN repo_collaborators rc ON rc.repo_id = c.repo_id
    WHERE c.id = commit_files.commit_id AND rc.user_id = auth.uid()
  )
);

-- Allow collaborators to create branches
CREATE POLICY "Collaborators can create branches" ON public.branches
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM repo_collaborators rc
    WHERE rc.repo_id = branches.repo_id AND rc.user_id = auth.uid()
  )
);

-- Add repo_id column to tasks table to link tasks to repositories
ALTER TABLE public.tasks ADD COLUMN repo_id uuid REFERENCES public.repositories(id) ON DELETE SET NULL;
