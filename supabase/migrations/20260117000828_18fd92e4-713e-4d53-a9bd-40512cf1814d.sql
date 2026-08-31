-- Create enum for client access roles
CREATE TYPE public.client_access_role AS ENUM ('viewer', 'approver');

-- Add role column to client_access table
ALTER TABLE public.client_access 
ADD COLUMN role public.client_access_role NOT NULL DEFAULT 'viewer';

-- Add comment for documentation
COMMENT ON COLUMN public.client_access.role IS 'viewer = read-only, approver = can approve/reject content';