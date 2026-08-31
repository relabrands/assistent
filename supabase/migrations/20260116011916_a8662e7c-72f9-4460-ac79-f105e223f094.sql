-- Add uses_clients field to projects (only for admin to configure)
ALTER TABLE public.projects ADD COLUMN uses_clients boolean NOT NULL DEFAULT false;

-- Add client field to tasks (required when project uses_clients is true)
ALTER TABLE public.tasks ADD COLUMN client text;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.uses_clients IS 'When enabled, tasks in this project require a client to be specified';
COMMENT ON COLUMN public.tasks.client IS 'Client name for the task (required when project has uses_clients enabled)';