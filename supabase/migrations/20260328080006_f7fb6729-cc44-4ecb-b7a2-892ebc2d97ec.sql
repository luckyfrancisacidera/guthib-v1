
-- Branches table
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id uuid NOT NULL,
  name text NOT NULL,
  created_by uuid NOT NULL,
  parent_branch_id uuid REFERENCES public.branches(id),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(repo_id, name)
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branches in public repos are viewable"
  ON public.branches FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM repositories r WHERE r.id = branches.repo_id AND (r.is_public = true OR r.owner_id = auth.uid())));

CREATE POLICY "Repo owners can create branches"
  ON public.branches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM repositories r WHERE r.id = branches.repo_id AND r.owner_id = auth.uid()));

CREATE POLICY "Repo owners can delete branches"
  ON public.branches FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM repositories r WHERE r.id = branches.repo_id AND r.owner_id = auth.uid()));

-- Commits table
CREATE TABLE public.commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id uuid NOT NULL,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Commits in public repos are viewable"
  ON public.commits FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM repositories r WHERE r.id = commits.repo_id AND (r.is_public = true OR r.owner_id = auth.uid())));

CREATE POLICY "Authenticated users can create commits"
  ON public.commits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM repositories r WHERE r.id = commits.repo_id AND r.owner_id = auth.uid()));

-- Commit files (what changed in each commit)
CREATE TABLE public.commit_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commit_id uuid NOT NULL REFERENCES public.commits(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  content text,
  storage_path text,
  file_size bigint DEFAULT 0,
  action text NOT NULL DEFAULT 'added'
);

ALTER TABLE public.commit_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Commit files viewable with commits"
  ON public.commit_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM commits c JOIN repositories r ON r.id = c.repo_id WHERE c.id = commit_files.commit_id AND (r.is_public = true OR r.owner_id = auth.uid())));

CREATE POLICY "Commit file authors can insert"
  ON public.commit_files FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM commits c WHERE c.id = commit_files.commit_id AND c.author_id = auth.uid()));

-- Add branch_id to repo_files (nullable for backward compat)
ALTER TABLE public.repo_files ADD COLUMN branch_id uuid REFERENCES public.branches(id);

-- Function to initialize default branch for a repo
CREATE OR REPLACE FUNCTION public.init_repo_default_branch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  INSERT INTO public.branches (repo_id, name, created_by, is_default)
  VALUES (NEW.id, NEW.default_branch, NEW.owner_id, true)
  RETURNING id INTO v_branch_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_init_repo_branch
  AFTER INSERT ON public.repositories
  FOR EACH ROW EXECUTE FUNCTION public.init_repo_default_branch();

-- Initialize branches for existing repos that don't have one
INSERT INTO public.branches (repo_id, name, created_by, is_default)
SELECT r.id, r.default_branch, r.owner_id, true
FROM public.repositories r
WHERE NOT EXISTS (SELECT 1 FROM public.branches b WHERE b.repo_id = r.id);

-- Assign existing files to their repo's default branch
UPDATE public.repo_files rf
SET branch_id = (SELECT b.id FROM public.branches b WHERE b.repo_id = rf.repo_id AND b.is_default = true LIMIT 1)
WHERE rf.branch_id IS NULL;
