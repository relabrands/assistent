
-- Add workspace_id to tasks table
ALTER TABLE public.tasks ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Create workspace_invitations table for email invites
CREATE TABLE public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'collaborator',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(workspace_id, email)
);

-- Create workspace_requests table for manual registrations awaiting approval
CREATE TABLE public.workspace_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_requests ENABLE ROW LEVEL SECURITY;

-- Policies for workspace_invitations
CREATE POLICY "Workspace owners can manage invitations"
  ON public.workspace_invitations FOR ALL
  USING (is_workspace_owner(workspace_id))
  WITH CHECK (is_workspace_owner(workspace_id));

CREATE POLICY "Users can view invitations sent to their email"
  ON public.workspace_invitations FOR SELECT
  USING (email = (SELECT email FROM public.profiles WHERE user_id = auth.uid()));

-- Policies for workspace_requests
CREATE POLICY "Admins can view all requests"
  ON public.workspace_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.owner_id = get_current_profile_id()
  ));

CREATE POLICY "Admins can update requests"
  ON public.workspace_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.owner_id = get_current_profile_id()
  ));

CREATE POLICY "Users can create their own request"
  ON public.workspace_requests FOR INSERT
  WITH CHECK (user_id = get_current_profile_id());

CREATE POLICY "Users can view their own request"
  ON public.workspace_requests FOR SELECT
  USING (user_id = get_current_profile_id());

-- Update tasks RLS to include workspace context
DROP POLICY IF EXISTS "Users can view their tasks" ON public.tasks;
CREATE POLICY "Users can view their tasks"
  ON public.tasks FOR SELECT
  USING (
    (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    OR (assigned_to IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    OR (workspace_id IN (
      SELECT workspace_id FROM public.user_roles WHERE user_id = get_current_profile_id()
    ))
  );

-- Add indexes
CREATE INDEX idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX idx_workspace_invitations_email ON public.workspace_invitations(email);
CREATE INDEX idx_workspace_invitations_token ON public.workspace_invitations(token);
CREATE INDEX idx_workspace_requests_status ON public.workspace_requests(status);

-- Add trigger for updated_at on workspace_requests
CREATE TRIGGER update_workspace_requests_updated_at
  BEFORE UPDATE ON public.workspace_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
