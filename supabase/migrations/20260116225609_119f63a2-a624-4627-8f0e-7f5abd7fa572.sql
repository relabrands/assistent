-- Drop and recreate the policies using the security definer function properly
DROP POLICY IF EXISTS "Clients can view their content" ON public.content_items;
DROP POLICY IF EXISTS "Clients can update content status for approval" ON public.content_items;

-- Recreate the policies using the security definer function
CREATE POLICY "Clients can view their content" 
ON public.content_items 
FOR SELECT 
USING (public.has_client_access(get_current_profile_id(), client_id));

CREATE POLICY "Clients can update content status for approval" 
ON public.content_items 
FOR UPDATE 
USING (public.has_client_access(get_current_profile_id(), client_id));

-- Also fix the clients table policy that has the same issue
DROP POLICY IF EXISTS "Clients can view their own client record" ON public.clients;

CREATE POLICY "Clients can view their own client record" 
ON public.clients 
FOR SELECT 
USING (public.has_client_access(get_current_profile_id(), id));