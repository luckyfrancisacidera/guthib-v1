
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'generic',
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for fast queries
CREATE INDEX idx_notifications_user_read ON public.notifications (user_id, is_read, created_at DESC);

-- Trigger: notify repo owner when someone creates an issue on their repo
CREATE OR REPLACE FUNCTION public.notify_on_new_issue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_repo_name text;
  v_username text;
BEGIN
  SELECT r.owner_id, r.name INTO v_owner_id, v_repo_name
  FROM repositories r WHERE r.id = NEW.repo_id;

  IF v_owner_id IS NOT NULL AND v_owner_id <> NEW.author_id THEN
    SELECT p.username INTO v_username FROM profiles p WHERE p.id = NEW.author_id;
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (v_owner_id, 'issue', v_username || ' opened an issue', NEW.title,
      '/' || (SELECT p2.username FROM profiles p2 WHERE p2.id = v_owner_id) || '/' || v_repo_name || '/issues/' || NEW.issue_number);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_issue
  AFTER INSERT ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_issue();

-- Trigger: notify repo owner on new PR
CREATE OR REPLACE FUNCTION public.notify_on_new_pr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_repo_name text;
  v_username text;
BEGIN
  SELECT r.owner_id, r.name INTO v_owner_id, v_repo_name
  FROM repositories r WHERE r.id = NEW.repo_id;

  IF v_owner_id IS NOT NULL AND v_owner_id <> NEW.author_id THEN
    SELECT p.username INTO v_username FROM profiles p WHERE p.id = NEW.author_id;
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (v_owner_id, 'pull_request', v_username || ' opened a pull request', NEW.title,
      '/' || (SELECT p2.username FROM profiles p2 WHERE p2.id = v_owner_id) || '/' || v_repo_name);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_pr
  AFTER INSERT ON public.pull_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_pr();

-- Trigger: notify issue author on new comment
CREATE OR REPLACE FUNCTION public.notify_on_issue_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_issue_author uuid;
  v_username text;
  v_issue_title text;
  v_repo_id uuid;
  v_repo_name text;
  v_owner_username text;
  v_issue_number int;
BEGIN
  SELECT i.author_id, i.title, i.repo_id, i.issue_number
  INTO v_issue_author, v_issue_title, v_repo_id, v_issue_number
  FROM issues i WHERE i.id = NEW.issue_id;

  IF v_issue_author IS NOT NULL AND v_issue_author <> NEW.author_id THEN
    SELECT p.username INTO v_username FROM profiles p WHERE p.id = NEW.author_id;
    SELECT r.name, p2.username INTO v_repo_name, v_owner_username
    FROM repositories r JOIN profiles p2 ON p2.id = r.owner_id WHERE r.id = v_repo_id;

    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (v_issue_author, 'comment', v_username || ' commented on your issue', v_issue_title,
      '/' || v_owner_username || '/' || v_repo_name || '/issues/' || v_issue_number);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_issue_comment
  AFTER INSERT ON public.issue_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_issue_comment();

-- Trigger: notify discussion author on new comment
CREATE OR REPLACE FUNCTION public.notify_on_discussion_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_disc_author uuid;
  v_username text;
  v_disc_title text;
  v_repo_id uuid;
  v_repo_name text;
  v_owner_username text;
  v_disc_id uuid;
BEGIN
  SELECT d.author_id, d.title, d.repo_id, d.id
  INTO v_disc_author, v_disc_title, v_repo_id, v_disc_id
  FROM discussions d WHERE d.id = NEW.discussion_id;

  IF v_disc_author IS NOT NULL AND v_disc_author <> NEW.author_id THEN
    SELECT p.username INTO v_username FROM profiles p WHERE p.id = NEW.author_id;
    SELECT r.name, p2.username INTO v_repo_name, v_owner_username
    FROM repositories r JOIN profiles p2 ON p2.id = r.owner_id WHERE r.id = v_repo_id;

    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (v_disc_author, 'comment', v_username || ' commented on your discussion', v_disc_title,
      '/' || v_owner_username || '/' || v_repo_name || '/discussions/' || v_disc_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_discussion_comment
  AFTER INSERT ON public.discussion_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_discussion_comment();
