
-- Add difficulty column to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'medium';

-- Create validation trigger for XP based on difficulty
CREATE OR REPLACE FUNCTION public.validate_task_xp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.difficulty = 'easy' AND (NEW.xp_reward < 1 OR NEW.xp_reward > 10) THEN
    RAISE EXCEPTION 'Easy tasks must have XP between 1 and 10 (got %)', NEW.xp_reward;
  ELSIF NEW.difficulty = 'medium' AND (NEW.xp_reward < 11 OR NEW.xp_reward > 20) THEN
    RAISE EXCEPTION 'Medium tasks must have XP between 11 and 20 (got %)', NEW.xp_reward;
  ELSIF NEW.difficulty = 'hard' AND (NEW.xp_reward < 20 OR NEW.xp_reward > 40) THEN
    RAISE EXCEPTION 'Hard tasks must have XP between 20 and 40 (got %)', NEW.xp_reward;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_task_xp_trigger
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.validate_task_xp();

-- Fix existing tasks: clamp xp_reward to valid range based on difficulty
UPDATE public.tasks SET xp_reward = LEAST(GREATEST(xp_reward, 11), 20) WHERE difficulty = 'medium';
