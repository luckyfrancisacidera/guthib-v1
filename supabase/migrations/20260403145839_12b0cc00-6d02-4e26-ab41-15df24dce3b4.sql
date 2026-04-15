
-- Organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Organization members table
CREATE TABLE public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Add visibility and org_id to task_boards
ALTER TABLE public.task_boards
  ADD COLUMN visibility text NOT NULL DEFAULT 'private',
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check org membership (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

-- Organizations RLS
CREATE POLICY "Orgs viewable by members" ON public.organizations
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_org_member(auth.uid(), id));

CREATE POLICY "Users can create orgs" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Org owners can update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Org owners can delete" ON public.organizations
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Org members RLS
CREATE POLICY "Org members visible to org members" ON public.org_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = org_members.org_id AND o.owner_id = auth.uid()
  ) OR is_org_member(auth.uid(), org_id));

CREATE POLICY "Org owners can add members" ON public.org_members
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = org_members.org_id AND o.owner_id = auth.uid()
  ));

CREATE POLICY "Org owners can remove members" ON public.org_members
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = org_members.org_id AND o.owner_id = auth.uid()
  ) OR user_id = auth.uid());

-- Update task_boards SELECT policy to handle visibility
DROP POLICY IF EXISTS "Board owners and members can view" ON public.task_boards;
CREATE POLICY "Board visibility access" ON public.task_boards
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR is_board_member(auth.uid(), id)
    OR visibility = 'public'
    OR (visibility = 'organization' AND org_id IS NOT NULL AND is_org_member(auth.uid(), org_id))
  );
