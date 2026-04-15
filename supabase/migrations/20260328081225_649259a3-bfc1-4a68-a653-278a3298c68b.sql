
CREATE TABLE public.pinned_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  repo_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, repo_id)
);

ALTER TABLE public.pinned_repositories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pinned repos are viewable by everyone"
  ON public.pinned_repositories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can pin own repos"
  ON public.pinned_repositories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unpin own repos"
  ON public.pinned_repositories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own pins"
  ON public.pinned_repositories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
