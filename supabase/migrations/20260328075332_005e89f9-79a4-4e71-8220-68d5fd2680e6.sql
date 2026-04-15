
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Insert notifications for self"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
