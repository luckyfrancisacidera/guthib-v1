
-- Create a security definer function to check board membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_board_member(_user_id uuid, _board_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_board_members
    WHERE user_id = _user_id AND board_id = _board_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_board_member FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_board_member TO authenticated;

-- Drop all existing task_boards policies
DROP POLICY IF EXISTS "Board owners and members can view" ON public.task_boards;
DROP POLICY IF EXISTS "Board owners can delete" ON public.task_boards;
DROP POLICY IF EXISTS "Board owners can update" ON public.task_boards;
DROP POLICY IF EXISTS "Users can create boards" ON public.task_boards;

-- Recreate policies using the security definer function
CREATE POLICY "Board owners and members can view" ON public.task_boards
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_board_member(auth.uid(), id));

CREATE POLICY "Users can create boards" ON public.task_boards
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Board owners can update" ON public.task_boards
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Board owners can delete" ON public.task_boards
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Also fix task_board_columns SELECT policy which has the same recursion
DROP POLICY IF EXISTS "Columns visible to board viewers" ON public.task_board_columns;
CREATE POLICY "Columns visible to board viewers" ON public.task_board_columns
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_boards b
    WHERE b.id = task_board_columns.board_id
      AND (b.owner_id = auth.uid() OR public.is_board_member(auth.uid(), b.id))
  ));

-- Fix task_board_members SELECT policy to avoid recursion back through task_boards
DROP POLICY IF EXISTS "Members can view board members" ON public.task_board_members;
CREATE POLICY "Members can view board members" ON public.task_board_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.task_boards b
    WHERE b.id = task_board_members.board_id AND b.owner_id = auth.uid()
  ));
