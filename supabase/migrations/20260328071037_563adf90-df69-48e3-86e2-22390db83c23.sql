-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Repositories table
CREATE TABLE public.repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  language TEXT,
  default_branch TEXT NOT NULL DEFAULT 'main',
  stars_count INT NOT NULL DEFAULT 0,
  forks_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, name)
);
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public repos are viewable by everyone" ON public.repositories FOR SELECT USING (is_public = true OR auth.uid() = owner_id);
CREATE POLICY "Users can create repos" ON public.repositories FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own repos" ON public.repositories FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own repos" ON public.repositories FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER update_repos_updated_at BEFORE UPDATE ON public.repositories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Repo files table
CREATE TABLE public.repo_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content TEXT,
  storage_path TEXT,
  file_size BIGINT DEFAULT 0,
  is_directory BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(repo_id, file_path)
);
ALTER TABLE public.repo_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Files in public repos are viewable" ON public.repo_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repo_id AND (r.is_public = true OR r.owner_id = auth.uid()))
);
CREATE POLICY "Repo owners can manage files" ON public.repo_files FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repo_id AND r.owner_id = auth.uid())
);
CREATE POLICY "Repo owners can update files" ON public.repo_files FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repo_id AND r.owner_id = auth.uid())
);
CREATE POLICY "Repo owners can delete files" ON public.repo_files FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repo_id AND r.owner_id = auth.uid())
);
CREATE TRIGGER update_repo_files_updated_at BEFORE UPDATE ON public.repo_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stars table
CREATE TABLE public.repo_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(repo_id, user_id)
);
ALTER TABLE public.repo_stars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stars are viewable by everyone" ON public.repo_stars FOR SELECT USING (true);
CREATE POLICY "Users can star repos" ON public.repo_stars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unstar repos" ON public.repo_stars FOR DELETE USING (auth.uid() = user_id);

-- Issues table
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  issue_number INT NOT NULL,
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Issues in public repos are viewable" ON public.issues FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repo_id AND (r.is_public = true OR r.owner_id = auth.uid()))
);
CREATE POLICY "Authenticated users can create issues" ON public.issues FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Issue authors and repo owners can update" ON public.issues FOR UPDATE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repo_id AND r.owner_id = auth.uid())
);
CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-increment issue number per repo
CREATE OR REPLACE FUNCTION public.set_issue_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.issue_number := COALESCE((SELECT MAX(issue_number) FROM public.issues WHERE repo_id = NEW.repo_id), 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER set_issue_number_trigger BEFORE INSERT ON public.issues FOR EACH ROW EXECUTE FUNCTION public.set_issue_number();

-- Issue comments
CREATE TABLE public.issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.issue_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are viewable on public repo issues" ON public.issue_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.issues i JOIN public.repositories r ON r.id = i.repo_id WHERE i.id = issue_id AND (r.is_public = true OR r.owner_id = auth.uid()))
);
CREATE POLICY "Authenticated users can comment" ON public.issue_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Comment authors can update" ON public.issue_comments FOR UPDATE USING (auth.uid() = author_id);
CREATE TRIGGER update_issue_comments_updated_at BEFORE UPDATE ON public.issue_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pull requests
CREATE TABLE public.pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'merged', 'closed')),
  pr_number INT NOT NULL,
  source_branch TEXT NOT NULL DEFAULT 'feature',
  target_branch TEXT NOT NULL DEFAULT 'main',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PRs in public repos are viewable" ON public.pull_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repo_id AND (r.is_public = true OR r.owner_id = auth.uid()))
);
CREATE POLICY "Authenticated users can create PRs" ON public.pull_requests FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "PR authors and repo owners can update" ON public.pull_requests FOR UPDATE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repo_id AND r.owner_id = auth.uid())
);
CREATE TRIGGER update_prs_updated_at BEFORE UPDATE ON public.pull_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-increment PR number
CREATE OR REPLACE FUNCTION public.set_pr_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.pr_number := COALESCE((SELECT MAX(pr_number) FROM public.pull_requests WHERE repo_id = NEW.repo_id), 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER set_pr_number_trigger BEFORE INSERT ON public.pull_requests FOR EACH ROW EXECUTE FUNCTION public.set_pr_number();

-- Discussions (forums)
CREATE TABLE public.discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Discussions in public repos are viewable" ON public.discussions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repo_id AND (r.is_public = true OR r.owner_id = auth.uid()))
);
CREATE POLICY "Authenticated users can create discussions" ON public.discussions FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Discussion authors can update" ON public.discussions FOR UPDATE USING (auth.uid() = author_id);
CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON public.discussions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Discussion comments
CREATE TABLE public.discussion_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Discussion comments are viewable" ON public.discussion_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.discussions d JOIN public.repositories r ON r.id = d.repo_id WHERE d.id = discussion_id AND (r.is_public = true OR r.owner_id = auth.uid()))
);
CREATE POLICY "Authenticated users can comment on discussions" ON public.discussion_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Comment authors can update" ON public.discussion_comments FOR UPDATE USING (auth.uid() = author_id);
CREATE TRIGGER update_discussion_comments_updated_at BEFORE UPDATE ON public.discussion_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for repo files
INSERT INTO storage.buckets (id, name, public) VALUES ('repo-files', 'repo-files', true);
CREATE POLICY "Repo files are publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'repo-files');
CREATE POLICY "Authenticated users can upload repo files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'repo-files' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own repo files" ON storage.objects FOR UPDATE USING (bucket_id = 'repo-files' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own repo files" ON storage.objects FOR DELETE USING (bucket_id = 'repo-files' AND auth.role() = 'authenticated');