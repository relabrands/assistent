-- Create life_area enum type
CREATE TYPE public.life_area AS ENUM ('trabajo', 'personal', 'salud', 'aprendizaje', 'finanzas');

-- Add life_area column to tasks table
ALTER TABLE public.tasks ADD COLUMN life_area public.life_area DEFAULT 'trabajo'::life_area;

-- Create index for filtering by life_area
CREATE INDEX idx_tasks_life_area ON public.tasks(life_area);