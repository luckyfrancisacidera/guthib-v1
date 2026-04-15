
-- Add status column to tasks
ALTER TABLE public.tasks ADD COLUMN status text NOT NULL DEFAULT 'open';

-- Create task_submissions table
CREATE TABLE public.task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  submitter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes text,
  file_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'submitted',
  review_note text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- Submissions viewable by board members (via task -> board)
CREATE POLICY "Submissions viewable by board members" ON public.task_submissions
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN task_boards b ON b.id = t.board_id
    WHERE t.id = task_submissions.task_id
    AND (b.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM task_board_members m WHERE m.board_id = b.id AND m.user_id = auth.uid()
    ))
  )
);

-- Authenticated users can submit (must be submitter)
CREATE POLICY "Users can submit solutions" ON public.task_submissions
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = submitter_id
);

-- Task creator can update submissions (for review)
CREATE POLICY "Task creator can review submissions" ON public.task_submissions
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_submissions.task_id AND t.creator_id = auth.uid()
  )
);

-- Submitter can update own submission
CREATE POLICY "Submitter can update own submission" ON public.task_submissions
FOR UPDATE TO authenticated USING (
  auth.uid() = submitter_id
);

-- Add trigger for updated_at
CREATE TRIGGER update_task_submissions_updated_at
  BEFORE UPDATE ON public.task_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
