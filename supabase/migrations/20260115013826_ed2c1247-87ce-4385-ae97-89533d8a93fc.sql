-- Create sectors enum
CREATE TYPE public.sector_type AS ENUM (
  'fintech', 'healthtech', 'edtech', 'marketing', 
  'ecommerce', 'saas', 'proptech', 'foodtech', 'other'
);

-- Create projects table (replaces the task_area enum)
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sector public.sector_type DEFAULT 'other',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task notes table
CREATE TABLE public.task_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add project_id to tasks (nullable initially for migration)
ALTER TABLE public.tasks ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view all projects"
  ON public.projects FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their projects"
  ON public.projects FOR DELETE TO authenticated
  USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Task notes policies
CREATE POLICY "Users can view notes on their tasks"
  ON public.task_notes FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT id FROM public.tasks 
      WHERE created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create notes"
  ON public.task_notes FOR INSERT TO authenticated
  WITH CHECK (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own notes"
  ON public.task_notes FOR DELETE TO authenticated
  USING (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for task_notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;