
-- We need foreign keys for the join queries to work
ALTER TABLE public.commits
  ADD CONSTRAINT commits_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id),
  ADD CONSTRAINT commits_repo_id_fkey FOREIGN KEY (repo_id) REFERENCES public.repositories(id) ON DELETE CASCADE;

ALTER TABLE public.branches
  ADD CONSTRAINT branches_repo_id_fkey FOREIGN KEY (repo_id) REFERENCES public.repositories(id) ON DELETE CASCADE,
  ADD CONSTRAINT branches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
