-- Add 'client' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Add new feature flags to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS uses_content_calendar boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS allows_client_access boolean NOT NULL DEFAULT false;

-- Create clients table (represents a brand/client within a project)
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand_name text,
  logo_url text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  social_instagram text,
  social_facebook text,
  social_tiktok text,
  social_linkedin text,
  social_youtube text,
  notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create content_status enum
CREATE TYPE public.content_status AS ENUM (
  'draft',
  'pending_review',
  'in_review',
  'approved',
  'requires_changes',
  'scheduled',
  'published'
);

-- Create content_type enum  
CREATE TYPE public.content_type AS ENUM (
  'post',
  'story',
  'reel',
  'video',
  'ad',
  'event',
  'carousel',
  'other'
);

-- Create platform enum
CREATE TYPE public.platform_type AS ENUM (
  'instagram',
  'facebook',
  'tiktok',
  'linkedin',
  'youtube',
  'twitter',
  'pinterest',
  'other'
);

-- Create project_platforms table (which platforms a project uses)
CREATE TABLE public.project_platforms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, platform)
);

-- Create content_items table (the main content/publication database)
CREATE TABLE public.content_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Base fields
  title text NOT NULL,
  content_type content_type NOT NULL DEFAULT 'post',
  platform platform_type NOT NULL DEFAULT 'instagram',
  status content_status NOT NULL DEFAULT 'draft',
  scheduled_date timestamp with time zone,
  published_date timestamp with time zone,
  
  -- Marketing fields
  copy text,
  hashtags text[],
  cta text,
  link text,
  reference_urls text[],
  
  -- Files
  file_urls text[],
  thumbnail_url text,
  
  -- Assignment
  assigned_to uuid REFERENCES public.profiles(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  
  -- Approval tracking
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamp with time zone,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create content_comments table
CREATE TABLE public.content_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  comment text NOT NULL,
  is_approval_request boolean NOT NULL DEFAULT false,
  is_change_request boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create client_access table (for client login access)
CREATE TABLE public.client_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_access ENABLE ROW LEVEL SECURITY;

-- RLS for clients table
CREATE POLICY "Project owners can manage clients"
ON public.clients FOR ALL
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = get_current_profile_id()
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = get_current_profile_id()
  )
);

CREATE POLICY "Workspace members can view clients"
ON public.clients FOR SELECT
USING (
  project_id IN (
    SELECT wp.project_id FROM public.workspace_projects wp
    JOIN public.user_roles ur ON ur.workspace_id = wp.workspace_id
    WHERE ur.user_id = get_current_profile_id()
  )
);

CREATE POLICY "Clients can view their own client record"
ON public.clients FOR SELECT
USING (
  id IN (
    SELECT client_id FROM public.client_access 
    WHERE user_id = get_current_profile_id()
  )
);

-- RLS for project_platforms
CREATE POLICY "Project owners can manage platforms"
ON public.project_platforms FOR ALL
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = get_current_profile_id()
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = get_current_profile_id()
  )
);

CREATE POLICY "Users can view project platforms"
ON public.project_platforms FOR SELECT
USING (true);

-- RLS for content_items
CREATE POLICY "Admins can manage all content in their projects"
ON public.content_items FOR ALL
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = get_current_profile_id()
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = get_current_profile_id()
  )
);

CREATE POLICY "Collaborators can manage assigned content"
ON public.content_items FOR ALL
USING (
  assigned_to = get_current_profile_id() OR created_by = get_current_profile_id()
)
WITH CHECK (
  assigned_to = get_current_profile_id() OR created_by = get_current_profile_id()
);

CREATE POLICY "Clients can view their content"
ON public.content_items FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM public.client_access 
    WHERE user_id = get_current_profile_id()
  )
);

CREATE POLICY "Clients can update content status for approval"
ON public.content_items FOR UPDATE
USING (
  client_id IN (
    SELECT client_id FROM public.client_access 
    WHERE user_id = get_current_profile_id()
  )
);

-- RLS for content_comments
CREATE POLICY "Users can view comments on accessible content"
ON public.content_comments FOR SELECT
USING (
  content_id IN (
    SELECT id FROM public.content_items
  )
);

CREATE POLICY "Users can create comments"
ON public.content_comments FOR INSERT
WITH CHECK (
  author_id = get_current_profile_id()
);

CREATE POLICY "Users can delete their own comments"
ON public.content_comments FOR DELETE
USING (
  author_id = get_current_profile_id()
);

-- RLS for client_access
CREATE POLICY "Admins can manage client access"
ON public.client_access FOR ALL
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.projects p ON p.id = c.project_id
    WHERE p.owner_id = get_current_profile_id()
  )
)
WITH CHECK (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.projects p ON p.id = c.project_id
    WHERE p.owner_id = get_current_profile_id()
  )
);

CREATE POLICY "Users can view their own client access"
ON public.client_access FOR SELECT
USING (
  user_id = get_current_profile_id()
);

-- Create storage bucket for content files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('content-files', 'content-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for content files
CREATE POLICY "Authenticated users can upload content files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'content-files' AND auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view content files"
ON storage.objects FOR SELECT
USING (bucket_id = 'content-files');

CREATE POLICY "Users can delete their own content files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'content-files' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_items_updated_at
BEFORE UPDATE ON public.content_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for content items and comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_comments;