-- Create table for custom content fields per project
CREATE TABLE public.content_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'textarea', 'select', 'multiselect', 'date', 'checkbox', 'number')),
  field_options JSONB DEFAULT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  UNIQUE(project_id, field_name)
);

-- Create table for storing custom field values per content item
CREATE TABLE public.content_custom_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.content_custom_fields(id) ON DELETE CASCADE,
  value JSONB NOT NULL DEFAULT '""',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(content_id, field_id)
);

-- Enable RLS on new tables
ALTER TABLE public.content_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_custom_values ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_custom_fields
CREATE POLICY "Project owners can manage custom fields"
ON public.content_custom_fields FOR ALL
USING (project_id IN (
  SELECT id FROM public.projects WHERE owner_id = get_current_profile_id()
))
WITH CHECK (project_id IN (
  SELECT id FROM public.projects WHERE owner_id = get_current_profile_id()
));

CREATE POLICY "Workspace members can view custom fields"
ON public.content_custom_fields FOR SELECT
USING (project_id IN (
  SELECT wp.project_id 
  FROM workspace_projects wp
  JOIN user_roles ur ON ur.workspace_id = wp.workspace_id
  WHERE ur.user_id = get_current_profile_id()
));

CREATE POLICY "Clients can view custom fields for their content"
ON public.content_custom_fields FOR SELECT
USING (project_id IN (
  SELECT c.project_id 
  FROM clients c
  WHERE has_client_access(get_current_profile_id(), c.id)
));

-- RLS policies for content_custom_values
CREATE POLICY "Content owners can manage custom values"
ON public.content_custom_values FOR ALL
USING (content_id IN (
  SELECT id FROM public.content_items 
  WHERE project_id IN (
    SELECT id FROM public.projects WHERE owner_id = get_current_profile_id()
  )
))
WITH CHECK (content_id IN (
  SELECT id FROM public.content_items 
  WHERE project_id IN (
    SELECT id FROM public.projects WHERE owner_id = get_current_profile_id()
  )
));

CREATE POLICY "Collaborators can manage values on their content"
ON public.content_custom_values FOR ALL
USING (content_id IN (
  SELECT id FROM public.content_items 
  WHERE assigned_to = get_current_profile_id() OR created_by = get_current_profile_id()
))
WITH CHECK (content_id IN (
  SELECT id FROM public.content_items 
  WHERE assigned_to = get_current_profile_id() OR created_by = get_current_profile_id()
));

CREATE POLICY "Designers can update values"
ON public.content_custom_values FOR UPDATE
USING (content_id IN (
  SELECT ci.id FROM public.content_items ci
  JOIN workspace_projects wp ON wp.project_id = ci.project_id
  JOIN user_roles ur ON ur.workspace_id = wp.workspace_id
  WHERE ur.user_id = get_current_profile_id() AND ur.role = 'designer'
));

CREATE POLICY "Designers can view custom values"
ON public.content_custom_values FOR SELECT
USING (content_id IN (
  SELECT ci.id FROM public.content_items ci
  JOIN workspace_projects wp ON wp.project_id = ci.project_id
  JOIN user_roles ur ON ur.workspace_id = wp.workspace_id
  WHERE ur.user_id = get_current_profile_id()
));

CREATE POLICY "Clients can view their custom values"
ON public.content_custom_values FOR SELECT
USING (content_id IN (
  SELECT id FROM public.content_items ci
  WHERE has_client_access(get_current_profile_id(), ci.client_id)
));

-- Add policy for designers to view content_items
CREATE POLICY "Designers can view content in their workspace projects"
ON public.content_items FOR SELECT
USING (project_id IN (
  SELECT wp.project_id 
  FROM workspace_projects wp
  JOIN user_roles ur ON ur.workspace_id = wp.workspace_id
  WHERE ur.user_id = get_current_profile_id() AND ur.role = 'designer'
));

-- Add policy for designers to update file_urls
CREATE POLICY "Designers can update file_urls"
ON public.content_items FOR UPDATE
USING (project_id IN (
  SELECT wp.project_id 
  FROM workspace_projects wp
  JOIN user_roles ur ON ur.workspace_id = wp.workspace_id
  WHERE ur.user_id = get_current_profile_id() AND ur.role = 'designer'
));