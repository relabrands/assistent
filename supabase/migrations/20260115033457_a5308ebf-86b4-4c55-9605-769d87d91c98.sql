-- Create table for project-member assignments (which member can see which project)
CREATE TABLE public.member_project_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id, project_id)
);

-- Enable RLS
ALTER TABLE public.member_project_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for member_project_assignments
CREATE POLICY "Workspace owners can manage project assignments"
ON public.member_project_assignments
FOR ALL
USING (is_workspace_owner(workspace_id))
WITH CHECK (is_workspace_owner(workspace_id));

CREATE POLICY "Members can view their own assignments"
ON public.member_project_assignments
FOR SELECT
USING (user_id = get_current_profile_id());

-- Create index for faster lookups
CREATE INDEX idx_member_project_assignments_user ON public.member_project_assignments(user_id);
CREATE INDEX idx_member_project_assignments_project ON public.member_project_assignments(project_id);
CREATE INDEX idx_member_project_assignments_workspace ON public.member_project_assignments(workspace_id);