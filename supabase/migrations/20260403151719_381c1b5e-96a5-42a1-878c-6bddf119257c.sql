
-- Add xp_reward and xp_awarded to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS xp_reward integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS xp_awarded boolean NOT NULL DEFAULT false;
