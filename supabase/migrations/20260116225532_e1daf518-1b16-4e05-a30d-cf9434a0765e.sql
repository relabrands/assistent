-- Create a security definer function to check client access without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_client_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id 
  FROM public.client_access 
  WHERE user_id = _user_id
$$;

-- Create a function to check if user has access to a specific client
CREATE OR REPLACE FUNCTION public.has_client_access(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.client_access 
    WHERE user_id = _user_id 
    AND client_id = _client_id
  )
$$;

-- Drop existing problematic policies on content_items
DROP POLICY IF EXISTS "Clients can view their content" ON public.content_items;
DROP POLICY IF EXISTS "Clients can update content status for approval" ON public.content_items;

-- Recreate the policies using the security definer function
CREATE POLICY "Clients can view their content" 
ON public.content_items 
FOR SELECT 
USING (client_id IN (SELECT public.get_user_client_ids(get_current_profile_id())));

CREATE POLICY "Clients can update content status for approval" 
ON public.content_items 
FOR UPDATE 
USING (client_id IN (SELECT public.get_user_client_ids(get_current_profile_id())));