
-- 1. Fix award_task_xp: add caller auth, remove _xp_amount, validate submission
CREATE OR REPLACE FUNCTION public.award_task_xp(_task_id uuid, _submitter_id uuid, _xp_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := current_date;
  v_existing record;
  v_new_xp integer;
  v_new_level integer;
  v_new_streak integer;
  v_yesterday date := current_date - 1;
  v_task record;
  v_actual_xp integer;
BEGIN
  -- Authorization: caller must be the task creator
  SELECT * INTO v_task FROM tasks WHERE id = _task_id;
  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF auth.uid() IS DISTINCT FROM v_task.creator_id THEN
    RAISE EXCEPTION 'Not authorized: only the task creator can award XP';
  END IF;

  -- Prevent double award
  IF v_task.xp_awarded THEN
    RAISE EXCEPTION 'XP already awarded for this task';
  END IF;

  -- Validate submitter has a submitted submission for this task
  IF NOT EXISTS (
    SELECT 1 FROM task_submissions
    WHERE task_id = _task_id AND submitter_id = _submitter_id AND status = 'submitted'
  ) THEN
    RAISE EXCEPTION 'No valid submission found for this submitter';
  END IF;

  -- Prevent self-award: submitter cannot be the task creator
  IF _submitter_id = v_task.creator_id THEN
    RAISE EXCEPTION 'Cannot award XP to yourself';
  END IF;

  -- Use task's xp_reward, ignore the _xp_amount parameter
  v_actual_xp := v_task.xp_reward;

  -- Mark task as xp_awarded
  UPDATE tasks SET xp_awarded = true, status = 'accepted' WHERE id = _task_id;

  -- Upsert gamification
  SELECT * INTO v_existing FROM user_gamification WHERE user_id = _submitter_id;

  IF v_existing IS NULL THEN
    INSERT INTO user_gamification (user_id, total_xp, level, current_streak, longest_streak, last_activity_date)
    VALUES (_submitter_id, v_actual_xp, GREATEST(1, v_actual_xp / 100 + 1), 1, 1, v_today);
  ELSE
    v_new_xp := v_existing.total_xp + v_actual_xp;
    v_new_level := GREATEST(1, v_new_xp / 100 + 1);
    
    IF v_existing.last_activity_date = v_yesterday THEN
      v_new_streak := v_existing.current_streak + 1;
    ELSIF v_existing.last_activity_date = v_today THEN
      v_new_streak := v_existing.current_streak;
    ELSE
      v_new_streak := 1;
    END IF;

    UPDATE user_gamification SET
      total_xp = v_new_xp,
      level = v_new_level,
      current_streak = v_new_streak,
      longest_streak = GREATEST(v_new_streak, v_existing.longest_streak),
      last_activity_date = v_today
    WHERE user_id = _submitter_id;
  END IF;

  -- Notification
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    _submitter_id, 'task_approved',
    'Your solution was accepted! +' || v_actual_xp || ' XP',
    'Your solution for a mission was approved.', NULL
  );

  -- Badge checks
  DECLARE
    v_tasks_completed bigint;
    v_commits bigint;
    v_prs bigint;
    v_streak integer;
  BEGIN
    SELECT count(*) INTO v_tasks_completed FROM task_submissions WHERE submitter_id = _submitter_id AND status = 'accepted';
    SELECT count(*) INTO v_commits FROM commits WHERE author_id = _submitter_id;
    SELECT count(*) INTO v_prs FROM pull_requests WHERE author_id = _submitter_id;
    SELECT COALESCE((SELECT current_streak FROM user_gamification WHERE user_id = _submitter_id), 0) INTO v_streak;

    IF v_tasks_completed >= 1 AND NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = _submitter_id AND badge_type = 'first_task') THEN
      INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description) VALUES (_submitter_id, 'first_task', 'First Task', 'Completed your first task');
    END IF;
    IF v_tasks_completed >= 5 AND NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = _submitter_id AND badge_type = 'five_tasks') THEN
      INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description) VALUES (_submitter_id, 'five_tasks', 'Task Master', 'Completed 5 tasks');
    END IF;
    IF v_tasks_completed >= 10 AND NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = _submitter_id AND badge_type = 'ten_tasks') THEN
      INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description) VALUES (_submitter_id, 'ten_tasks', 'Productivity Pro', 'Completed 10 tasks');
    END IF;
    IF v_streak >= 7 AND NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = _submitter_id AND badge_type = 'streak_7') THEN
      INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description) VALUES (_submitter_id, 'streak_7', 'Week Warrior', '7-day activity streak');
    END IF;
    IF v_streak >= 30 AND NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = _submitter_id AND badge_type = 'streak_30') THEN
      INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description) VALUES (_submitter_id, 'streak_30', 'Monthly Machine', '30-day activity streak');
    END IF;
  END;
END;
$function$;

-- 2. Fix user_inventory SELECT - restrict to own items only
DROP POLICY IF EXISTS "Inventory viewable by authenticated" ON public.user_inventory;
DROP POLICY IF EXISTS "Inventory viewable by all" ON public.user_inventory;

CREATE POLICY "Users can view own inventory"
ON public.user_inventory FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Fix storage DELETE policy - use storage.objects.name instead of r.name
DROP POLICY IF EXISTS "Repo owners can delete storage files" ON storage.objects;

CREATE POLICY "Repo owners can delete storage files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'repo-files' AND (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.owner_id = auth.uid()
      AND storage.objects.name LIKE r.id::text || '/%'
    )
  )
);

-- 4. Add RLS policies on realtime.messages to restrict channel subscriptions
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can insert realtime messages" ON realtime.messages;
