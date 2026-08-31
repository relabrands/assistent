-- Add recurrence fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly')) DEFAULT NULL,
ADD COLUMN recurrence_parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL DEFAULT NULL;

-- Create index for recurring tasks
CREATE INDEX idx_tasks_recurrence_parent ON public.tasks(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;

COMMENT ON COLUMN public.tasks.recurrence_type IS 'Type of recurrence: daily, weekly, or monthly';
COMMENT ON COLUMN public.tasks.recurrence_parent_id IS 'Reference to the parent task for recurring instances';