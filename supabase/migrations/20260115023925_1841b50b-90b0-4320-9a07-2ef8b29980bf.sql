-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'collaborator');

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'collaborator',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

-- Create workspace_projects junction table (assign projects to workspace)
CREATE TABLE public.workspace_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, project_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_projects ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has role in workspace
CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id UUID, _workspace_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND role = _role
  )
$$;

-- Function to check if user is member of workspace (any role)
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
  )
$$;

-- Function to get profile ID from auth.uid()
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Function to check if user is workspace owner
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE id = _workspace_id
      AND owner_id = public.get_current_profile_id()
  )
$$;

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they belong to"
ON public.workspaces FOR SELECT
USING (
  owner_id = public.get_current_profile_id()
  OR public.is_workspace_member(public.get_current_profile_id(), id)
);

CREATE POLICY "Only owner can create workspace"
ON public.workspaces FOR INSERT
WITH CHECK (owner_id = public.get_current_profile_id());

CREATE POLICY "Only owner can update workspace"
ON public.workspaces FOR UPDATE
USING (owner_id = public.get_current_profile_id());

CREATE POLICY "Only owner can delete workspace"
ON public.workspaces FOR DELETE
USING (owner_id = public.get_current_profile_id());

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their workspaces"
ON public.user_roles FOR SELECT
USING (
  public.is_workspace_owner(workspace_id)
  OR user_id = public.get_current_profile_id()
);

CREATE POLICY "Only workspace owner can add roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.is_workspace_owner(workspace_id));

CREATE POLICY "Only workspace owner can update roles"
ON public.user_roles FOR UPDATE
USING (public.is_workspace_owner(workspace_id));

CREATE POLICY "Only workspace owner can delete roles"
ON public.user_roles FOR DELETE
USING (public.is_workspace_owner(workspace_id));

-- RLS Policies for workspace_projects
CREATE POLICY "Users can view projects in their workspaces"
ON public.workspace_projects FOR SELECT
USING (
  public.is_workspace_owner(workspace_id)
  OR public.is_workspace_member(public.get_current_profile_id(), workspace_id)
);

CREATE POLICY "Only workspace owner can assign projects"
ON public.workspace_projects FOR INSERT
WITH CHECK (public.is_workspace_owner(workspace_id));

CREATE POLICY "Only workspace owner can remove project assignments"
ON public.workspace_projects FOR DELETE
USING (public.is_workspace_owner(workspace_id));

-- Add trigger for workspaces updated_at
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_workspace_id ON public.user_roles(workspace_id);
CREATE INDEX idx_workspace_projects_workspace_id ON public.workspace_projects(workspace_id);
CREATE INDEX idx_workspace_projects_project_id ON public.workspace_projects(project_id);