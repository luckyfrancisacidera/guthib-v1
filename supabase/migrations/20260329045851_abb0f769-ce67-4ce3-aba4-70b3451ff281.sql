
-- Task boards
CREATE TABLE public.task_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  board_type text NOT NULL DEFAULT 'personal',
  owner_id uuid NOT NULL,
  repo_id uuid REFERENCES public.repositories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Board members
CREATE TABLE public.task_board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.task_boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(board_id, user_id)
);

-- Board columns
CREATE TABLE public.task_board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.task_boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.task_boards(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES public.task_board_columns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  creator_id uuid NOT NULL,
  assignee_id uuid,
  priority text NOT NULL DEFAULT 'medium',
  labels text[] DEFAULT '{}',
  due_date date,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Gamification
CREATE TABLE public.user_gamification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_type text NOT NULL,
  badge_name text NOT NULL,
  badge_description text,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- RLS
ALTER TABLE public.task_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- task_boards policies
CREATE POLICY "Board owners and members can view" ON public.task_boards
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.task_board_members m WHERE m.board_id = task_boards.id AND m.user_id = auth.uid()
  ));
CREATE POLICY "Users can create boards" ON public.task_boards
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Board owners can update" ON public.task_boards
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Board owners can delete" ON public.task_boards
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- task_board_members policies
CREATE POLICY "Members can view board members" ON public.task_board_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.task_boards b WHERE b.id = board_id AND b.owner_id = auth.uid()
  ));
CREATE POLICY "Board owners can manage members" ON public.task_board_members
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.task_boards b WHERE b.id = board_id AND b.owner_id = auth.uid()));
CREATE POLICY "Board owners can remove members" ON public.task_board_members
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.task_boards b WHERE b.id = board_id AND b.owner_id = auth.uid()) OR user_id = auth.uid());

-- task_board_columns policies
CREATE POLICY "Columns visible to board viewers" ON public.task_board_columns
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_boards b WHERE b.id = board_id AND (b.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.task_board_members m WHERE m.board_id = b.id AND m.user_id = auth.uid()
    ))
  ));
CREATE POLICY "Board owners can manage columns" ON public.task_board_columns
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.task_boards b WHERE b.id = board_id AND b.owner_id = auth.uid()));
CREATE POLICY "Board owners can update columns" ON public.task_board_columns
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.task_boards b WHERE b.id = board_id AND b.owner_id = auth.uid()));
CREATE POLICY "Board owners can delete columns" ON public.task_board_columns
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.task_boards b WHERE b.id = board_id AND b.owner_id = auth.uid()));

-- tasks policies
CREATE POLICY "Tasks visible to board viewers" ON public.tasks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_boards b WHERE b.id = board_id AND (b.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.task_board_members m WHERE m.board_id = b.id AND m.user_id = auth.uid()
    ))
  ));
CREATE POLICY "Board members can create tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id AND EXISTS (
    SELECT 1 FROM public.task_boards b WHERE b.id = board_id AND (b.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.task_board_members m WHERE m.board_id = b.id AND m.user_id = auth.uid()
    ))
  ));
CREATE POLICY "Board members can update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_boards b WHERE b.id = board_id AND (b.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.task_board_members m WHERE m.board_id = b.id AND m.user_id = auth.uid()
    ))
  ));
CREATE POLICY "Board members can delete tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_boards b WHERE b.id = board_id AND (b.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.task_board_members m WHERE m.board_id = b.id AND m.user_id = auth.uid()
    ))
  ));

-- gamification policies
CREATE POLICY "Gamification visible to all" ON public.user_gamification
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own gamification" ON public.user_gamification
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gamification" ON public.user_gamification
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Badges visible to all" ON public.user_badges
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can earn badges" ON public.user_badges
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_task_boards_updated_at BEFORE UPDATE ON public.task_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
