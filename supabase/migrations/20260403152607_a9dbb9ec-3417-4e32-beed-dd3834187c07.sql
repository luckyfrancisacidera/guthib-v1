
-- Add visibility to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';

-- Drop old tasks SELECT policy and create new one that respects task visibility
DROP POLICY IF EXISTS "Tasks visible to board viewers" ON public.tasks;
CREATE POLICY "Tasks visible to board viewers or public" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_boards b
      WHERE b.id = tasks.board_id
      AND (b.owner_id = auth.uid() OR is_board_member(auth.uid(), b.id))
    )
    OR visibility = 'public'
  );

-- Add ON DELETE CASCADE from tasks to task_submissions (drop and re-add FK)
ALTER TABLE public.task_submissions DROP CONSTRAINT IF EXISTS task_submissions_task_id_fkey;
ALTER TABLE public.task_submissions ADD CONSTRAINT task_submissions_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Add ON DELETE CASCADE from task_boards to task_board_columns
ALTER TABLE public.task_board_columns DROP CONSTRAINT IF EXISTS task_board_columns_board_id_fkey;
ALTER TABLE public.task_board_columns ADD CONSTRAINT task_board_columns_board_id_fkey
  FOREIGN KEY (board_id) REFERENCES public.task_boards(id) ON DELETE CASCADE;

-- Add ON DELETE CASCADE from tasks (board_id)
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_board_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_board_id_fkey
  FOREIGN KEY (board_id) REFERENCES public.task_boards(id) ON DELETE CASCADE;

-- Add ON DELETE CASCADE from tasks (column_id)
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_column_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_column_id_fkey
  FOREIGN KEY (column_id) REFERENCES public.task_board_columns(id) ON DELETE CASCADE;
