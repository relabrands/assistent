import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Workspace, 
  UserRole, 
  WorkspaceProject, 
  Profile, 
  AppRole, 
  Project,
  WorkspaceInvitation,
  WorkspaceRequest,
  RequestStatus,
  MemberProjectAssignment
} from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useWorkspaces(profile: Profile | null) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<UserRole[]>([]);
  const [workspaceProjects, setWorkspaceProjects] = useState<WorkspaceProject[]>([]);
  const [memberProjectAssignments, setMemberProjectAssignments] = useState<MemberProjectAssignment[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<WorkspaceRequest[]>([]);
  const [myRequest, setMyRequest] = useState<WorkspaceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [workspaceHasData, setWorkspaceHasData] = useState(false);
  const { toast } = useToast();

  const fetchWorkspaces = useCallback(async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workspaces:', error);
      return;
    }

    const wsData = data as Workspace[];
    setWorkspaces(wsData);
    
    // Auto-select workspace where user is owner
    const ownedWorkspace = wsData.find(w => w.owner_id === profile.id);
    if (ownedWorkspace && !currentWorkspace) {
      setCurrentWorkspace(ownedWorkspace);
      setIsAdmin(true);
    } else if (wsData.length > 0 && !currentWorkspace) {
      setCurrentWorkspace(wsData[0]);
      const isOwner = wsData[0].owner_id === profile.id;
      setIsAdmin(isOwner);
    }
    
    setLoading(false);
  }, [profile, currentWorkspace]);

  const fetchWorkspaceMembers = useCallback(async () => {
    if (!currentWorkspace) return;

    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        *,
        user:profiles!user_roles_user_id_fkey(*)
      `)
      .eq('workspace_id', currentWorkspace.id);

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    setWorkspaceMembers(data as unknown as UserRole[]);
  }, [currentWorkspace]);

  const fetchWorkspaceProjects = useCallback(async () => {
    if (!currentWorkspace) return;

    const { data, error } = await supabase
      .from('workspace_projects')
      .select(`
        *,
        project:projects(*)
      `)
      .eq('workspace_id', currentWorkspace.id);

    if (error) {
      console.error('Error fetching workspace projects:', error);
      return;
    }

    setWorkspaceProjects(data as unknown as WorkspaceProject[]);
  }, [currentWorkspace]);

  const fetchMemberProjectAssignments = useCallback(async () => {
    if (!currentWorkspace) return;

    const { data, error } = await supabase
      .from('member_project_assignments')
      .select(`
        *,
        user:profiles!member_project_assignments_user_id_fkey(*),
        project:projects!member_project_assignments_project_id_fkey(*)
      `)
      .eq('workspace_id', currentWorkspace.id);

    if (error) {
      console.error('Error fetching member project assignments:', error);
      return;
    }

    setMemberProjectAssignments(data as unknown as MemberProjectAssignment[]);
  }, [currentWorkspace]);

  const checkWorkspaceHasData = useCallback(async () => {
    if (!currentWorkspace) return;

    // Check if workspace has tasks or projects
    const [tasksResult, projectsResult] = await Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id),
      supabase.from('workspace_projects').select('id', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id)
    ]);

    const hasTasks = (tasksResult.count || 0) > 0;
    const hasProjects = (projectsResult.count || 0) > 0;
    setWorkspaceHasData(hasTasks || hasProjects);
  }, [currentWorkspace]);

  const fetchInvitations = useCallback(async () => {
    if (!currentWorkspace || !isAdmin) return;

    const { data, error } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return;
    }

    setInvitations(data as WorkspaceInvitation[]);
  }, [currentWorkspace, isAdmin]);

  const fetchPendingRequests = useCallback(async () => {
    if (!isAdmin) return;

    const { data, error } = await supabase
      .from('workspace_requests')
      .select(`
        *,
        user:profiles!workspace_requests_user_id_fkey(*)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending requests:', error);
      return;
    }

    setPendingRequests(data as unknown as WorkspaceRequest[]);
  }, [isAdmin]);

  const fetchMyRequest = useCallback(async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('workspace_requests')
      .select(`
        *,
        workspace:workspaces(*)
      `)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching my request:', error);
      return;
    }

    setMyRequest(data as WorkspaceRequest | null);
  }, [profile]);

  useEffect(() => {
    fetchWorkspaces();
    fetchMyRequest();
  }, [fetchWorkspaces, fetchMyRequest]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchWorkspaceMembers();
      fetchWorkspaceProjects();
      fetchMemberProjectAssignments();
      fetchInvitations();
      fetchPendingRequests();
      checkWorkspaceHasData();
    }
  }, [currentWorkspace, fetchWorkspaceMembers, fetchWorkspaceProjects, fetchMemberProjectAssignments, fetchInvitations, fetchPendingRequests, checkWorkspaceHasData]);

  const createWorkspace = useCallback(async (name: string) => {
    if (!profile) return null;

    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name, owner_id: profile.id })
      .select()
      .single();

    if (error) {
      console.error('Error creating workspace:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el workspace',
        variant: 'destructive',
      });
      return null;
    }

    // Add owner as admin
    await supabase
      .from('user_roles')
      .insert({
        user_id: profile.id,
        workspace_id: data.id,
        role: 'admin' as AppRole,
      });

    toast({
      title: 'Workspace creado',
      description: `Se creó "${name}" correctamente`,
    });

    await fetchWorkspaces();
    return data as Workspace;
  }, [profile, toast, fetchWorkspaces]);

  const deleteWorkspace = useCallback(async (workspaceId: string, transferToWorkspaceId: string | null) => {
    if (!profile) return false;

    try {
      // If transferring data
      if (transferToWorkspaceId && transferToWorkspaceId !== 'delete') {
        // Transfer tasks
        await supabase
          .from('tasks')
          .update({ workspace_id: transferToWorkspaceId })
          .eq('workspace_id', workspaceId);

        // Transfer workspace_projects (get project IDs first)
        const { data: projectAssignments } = await supabase
          .from('workspace_projects')
          .select('project_id')
          .eq('workspace_id', workspaceId);

        if (projectAssignments && projectAssignments.length > 0) {
          for (const pa of projectAssignments) {
            // Check if project already exists in target workspace
            const { data: existing } = await supabase
              .from('workspace_projects')
              .select('id')
              .eq('workspace_id', transferToWorkspaceId)
              .eq('project_id', pa.project_id)
              .maybeSingle();

            if (!existing) {
              await supabase
                .from('workspace_projects')
                .insert({
                  workspace_id: transferToWorkspaceId,
                  project_id: pa.project_id,
                });
            }
          }
        }
      }

      // Delete the workspace (cascade will handle related records)
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

      if (error) {
        console.error('Error deleting workspace:', error);
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el workspace',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Workspace eliminado',
        description: transferToWorkspaceId && transferToWorkspaceId !== 'delete' 
          ? 'Los datos fueron transferidos correctamente'
          : 'El workspace y sus datos fueron eliminados',
      });

      // Reset current workspace
      setCurrentWorkspace(null);
      await fetchWorkspaces();
      return true;
    } catch (err) {
      console.error('Error in deleteWorkspace:', err);
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado',
        variant: 'destructive',
      });
      return false;
    }
  }, [profile, toast, fetchWorkspaces]);

  const addMember = useCallback(async (email: string, role: AppRole = 'collaborator') => {
    if (!currentWorkspace) return false;

    // Find profile by email
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (profileError || !profileData) {
      toast({
        title: 'Usuario no encontrado',
        description: 'No existe un usuario con ese email',
        variant: 'destructive',
      });
      return false;
    }

    // Check if already member
    const existingMember = workspaceMembers.find(m => m.user_id === profileData.id);
    if (existingMember) {
      toast({
        title: 'Ya es miembro',
        description: 'Este usuario ya pertenece al workspace',
        variant: 'destructive',
      });
      return false;
    }

    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: profileData.id,
        workspace_id: currentWorkspace.id,
        role,
      });

    if (error) {
      console.error('Error adding member:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar al miembro',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Miembro agregado',
      description: `Se agregó a ${profileData.display_name} como ${role === 'admin' ? 'administrador' : 'colaborador'}`,
    });

    await fetchWorkspaceMembers();
    return true;
  }, [currentWorkspace, workspaceMembers, toast, fetchWorkspaceMembers]);

  const removeMember = useCallback(async (userId: string) => {
    if (!currentWorkspace) return false;

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('workspace_id', currentWorkspace.id);

    if (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar al miembro',
        variant: 'destructive',
      });
      return false;
    }

    // Also remove their project assignments
    await supabase
      .from('member_project_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('workspace_id', currentWorkspace.id);

    toast({
      title: 'Miembro eliminado',
      description: 'Se eliminó al usuario del workspace',
    });

    await fetchWorkspaceMembers();
    await fetchMemberProjectAssignments();
    return true;
  }, [currentWorkspace, toast, fetchWorkspaceMembers, fetchMemberProjectAssignments]);

  const assignProjectToWorkspace = useCallback(async (projectId: string) => {
    if (!currentWorkspace) return false;

    const { error } = await supabase
      .from('workspace_projects')
      .insert({
        workspace_id: currentWorkspace.id,
        project_id: projectId,
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Ya asignado',
          description: 'Este proyecto ya está asignado al workspace',
          variant: 'destructive',
        });
      } else {
        console.error('Error assigning project:', error);
        toast({
          title: 'Error',
          description: 'No se pudo asignar el proyecto',
          variant: 'destructive',
        });
      }
      return false;
    }

    toast({
      title: 'Proyecto asignado',
      description: 'El proyecto se asignó al workspace',
    });

    await fetchWorkspaceProjects();
    await checkWorkspaceHasData();
    return true;
  }, [currentWorkspace, toast, fetchWorkspaceProjects, checkWorkspaceHasData]);

  const removeProjectFromWorkspace = useCallback(async (projectId: string) => {
    if (!currentWorkspace) return false;

    const { error } = await supabase
      .from('workspace_projects')
      .delete()
      .eq('workspace_id', currentWorkspace.id)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error removing project:', error);
      toast({
        title: 'Error',
        description: 'No se pudo quitar el proyecto',
        variant: 'destructive',
      });
      return false;
    }

    // Also remove member assignments for this project
    await supabase
      .from('member_project_assignments')
      .delete()
      .eq('workspace_id', currentWorkspace.id)
      .eq('project_id', projectId);

    await fetchWorkspaceProjects();
    await fetchMemberProjectAssignments();
    await checkWorkspaceHasData();
    return true;
  }, [currentWorkspace, toast, fetchWorkspaceProjects, fetchMemberProjectAssignments, checkWorkspaceHasData]);

  const assignProjectToMember = useCallback(async (userId: string, projectId: string) => {
    if (!currentWorkspace) return false;

    const { error } = await supabase
      .from('member_project_assignments')
      .insert({
        workspace_id: currentWorkspace.id,
        user_id: userId,
        project_id: projectId,
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Ya asignado',
          description: 'Este proyecto ya está asignado a este miembro',
          variant: 'destructive',
        });
      } else {
        console.error('Error assigning project to member:', error);
        toast({
          title: 'Error',
          description: 'No se pudo asignar el proyecto al miembro',
          variant: 'destructive',
        });
      }
      return false;
    }

    toast({
      title: 'Proyecto asignado',
      description: 'El colaborador ahora puede ver este proyecto',
    });

    await fetchMemberProjectAssignments();
    return true;
  }, [currentWorkspace, toast, fetchMemberProjectAssignments]);

  const removeProjectFromMember = useCallback(async (userId: string, projectId: string) => {
    if (!currentWorkspace) return false;

    const { error } = await supabase
      .from('member_project_assignments')
      .delete()
      .eq('workspace_id', currentWorkspace.id)
      .eq('user_id', userId)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error removing project from member:', error);
      toast({
        title: 'Error',
        description: 'No se pudo quitar el proyecto del miembro',
        variant: 'destructive',
      });
      return false;
    }

    await fetchMemberProjectAssignments();
    return true;
  }, [currentWorkspace, toast, fetchMemberProjectAssignments]);

  // Invitation functions
  const sendInvitation = useCallback(async (email: string, role: AppRole = 'collaborator') => {
    if (!currentWorkspace || !profile) return false;

    // Check if already invited
    const existingInvite = invitations.find(i => i.email === email && i.status === 'pending');
    if (existingInvite) {
      toast({
        title: 'Ya invitado',
        description: 'Ya existe una invitación pendiente para este email',
        variant: 'destructive',
      });
      return false;
    }

    // Create the invitation in database
    const { data: inviteData, error } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: currentWorkspace.id,
        email,
        role,
        invited_by: profile.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar la invitación',
        variant: 'destructive',
      });
      return false;
    }

    // Send email via edge function
    try {
      const appUrl = window.location.origin;
      const response = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email,
          workspaceName: currentWorkspace.name,
          inviterName: profile.display_name,
          role,
          token: inviteData.token,
          appUrl,
        },
      });

      if (response.error) {
        console.error('Error sending email:', response.error);
        toast({
          title: 'Invitación creada',
          description: `Se creó la invitación pero no se pudo enviar el email a ${email}`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Invitación enviada',
          description: `Se envió un email de invitación a ${email}`,
        });
      }
    } catch (emailError) {
      console.error('Error calling email function:', emailError);
      toast({
        title: 'Invitación creada',
        description: `Se creó la invitación pero no se pudo enviar el email`,
        variant: 'default',
      });
    }

    await fetchInvitations();
    return true;
  }, [currentWorkspace, profile, invitations, toast, fetchInvitations]);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    const { error } = await supabase
      .from('workspace_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      console.error('Error canceling invitation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la invitación',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Invitación cancelada',
    });

    await fetchInvitations();
    return true;
  }, [toast, fetchInvitations]);

  // Request functions
  const createAccessRequest = useCallback(async () => {
    if (!profile) return false;

    const { error } = await supabase
      .from('workspace_requests')
      .insert({
        user_id: profile.id,
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Solicitud existente',
          description: 'Ya tienes una solicitud de acceso pendiente',
          variant: 'destructive',
        });
      } else {
        console.error('Error creating request:', error);
        toast({
          title: 'Error',
          description: 'No se pudo crear la solicitud',
          variant: 'destructive',
        });
      }
      return false;
    }

    toast({
      title: 'Solicitud enviada',
      description: 'Un administrador revisará tu solicitud',
    });

    await fetchMyRequest();
    return true;
  }, [profile, toast, fetchMyRequest]);

  const approveRequest = useCallback(async (requestId: string, workspaceId: string, userId: string) => {
    if (!profile) return false;

    // First update the request
    const { error: updateError } = await supabase
      .from('workspace_requests')
      .update({
        status: 'approved' as RequestStatus,
        reviewed_by: profile.id,
        assigned_workspace_id: workspaceId,
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error approving request:', updateError);
      toast({
        title: 'Error',
        description: 'No se pudo aprobar la solicitud',
        variant: 'destructive',
      });
      return false;
    }

    // Add user to workspace as collaborator
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        role: 'collaborator' as AppRole,
      });

    if (roleError) {
      console.error('Error adding user role:', roleError);
    }

    toast({
      title: 'Solicitud aprobada',
      description: 'El usuario ha sido agregado al workspace',
    });

    await fetchPendingRequests();
    await fetchWorkspaceMembers();
    return true;
  }, [profile, toast, fetchPendingRequests, fetchWorkspaceMembers]);

  const rejectRequest = useCallback(async (requestId: string) => {
    if (!profile) return false;

    const { error } = await supabase
      .from('workspace_requests')
      .update({
        status: 'rejected' as RequestStatus,
        reviewed_by: profile.id,
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: 'No se pudo rechazar la solicitud',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Solicitud rechazada',
    });

    await fetchPendingRequests();
    return true;
  }, [profile, toast, fetchPendingRequests]);

  const selectWorkspace = useCallback((workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    if (profile) {
      setIsAdmin(workspace.owner_id === profile.id);
    }
  }, [profile]);

  return {
    workspaces,
    currentWorkspace,
    workspaceMembers,
    workspaceProjects,
    memberProjectAssignments,
    invitations,
    pendingRequests,
    myRequest,
    loading,
    isAdmin,
    workspaceHasData,
    createWorkspace,
    deleteWorkspace,
    addMember,
    removeMember,
    assignProjectToWorkspace,
    removeProjectFromWorkspace,
    assignProjectToMember,
    removeProjectFromMember,
    sendInvitation,
    cancelInvitation,
    createAccessRequest,
    approveRequest,
    rejectRequest,
    selectWorkspace,
    refetchMembers: fetchWorkspaceMembers,
    refetchProjects: fetchWorkspaceProjects,
    refetchInvitations: fetchInvitations,
    refetchRequests: fetchPendingRequests,
  };
}
