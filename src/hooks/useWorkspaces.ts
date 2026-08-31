import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { 
  Workspace, 
  UserRole, 
  WorkspaceProject, 
  Profile, 
  AppRole, 
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

  useEffect(() => {
    if (!profile) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    const wsQuery = query(collection(db, 'workspaces'));
    const unsubscribe = onSnapshot(wsQuery, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Workspace));
      setWorkspaces(items);

      const ownedWorkspace = items.find(w => w.owner_id === profile.id);
      if (ownedWorkspace && !currentWorkspace) {
        setCurrentWorkspace(ownedWorkspace);
        setIsAdmin(true);
      } else if (items.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(items[0]);
        setIsAdmin(items[0].owner_id === profile.id);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error listening to workspaces:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (!currentWorkspace) return;

    // Listen to members
    const membersQuery = query(collection(db, 'user_roles'), where('workspace_id', '==', currentWorkspace.id));
    const unsubscribeMembers = onSnapshot(membersQuery, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRole));
      setWorkspaceMembers(items);
    });

    // Listen to workspace projects
    const wsProjectsQuery = query(collection(db, 'workspace_projects'), where('workspace_id', '==', currentWorkspace.id));
    const unsubscribeProjects = onSnapshot(wsProjectsQuery, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkspaceProject));
      setWorkspaceProjects(items);
      setWorkspaceHasData(items.length > 0);
    });

    // Listen to member assignments
    const assignQuery = query(collection(db, 'member_project_assignments'), where('workspace_id', '==', currentWorkspace.id));
    const unsubscribeAssign = onSnapshot(assignQuery, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as MemberProjectAssignment));
      setMemberProjectAssignments(items);
    });

    // Listen to invitations
    const invQuery = query(collection(db, 'workspace_invitations'), where('workspace_id', '==', currentWorkspace.id));
    const unsubscribeInv = onSnapshot(invQuery, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkspaceInvitation));
      setInvitations(items);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeProjects();
      unsubscribeAssign();
      unsubscribeInv();
    };
  }, [currentWorkspace]);

  const createWorkspace = useCallback(async (name: string) => {
    if (!profile) return null;

    try {
      const newWs = {
        name,
        owner_id: profile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'workspaces'), newWs);
      const createdWorkspace = { id: docRef.id, ...newWs } as Workspace;

      // Add owner as admin
      await addDoc(collection(db, 'user_roles'), {
        user_id: profile.id,
        workspace_id: docRef.id,
        role: 'admin' as AppRole,
        created_at: new Date().toISOString(),
      });

      toast({
        title: 'Workspace creado',
        description: `Se creó "${name}" correctamente`,
      });

      setCurrentWorkspace(createdWorkspace);
      setIsAdmin(true);
      return createdWorkspace;
    } catch (error) {
      console.error('Error creating workspace in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el workspace',
        variant: 'destructive',
      });
      return null;
    }
  }, [profile, toast]);

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    if (!profile) return false;

    try {
      await deleteDoc(doc(db, 'workspaces', workspaceId));
      toast({
        title: 'Workspace eliminado',
      });
      setCurrentWorkspace(null);
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
  }, [profile, toast]);

  const addMember = useCallback(async (email: string, role: AppRole = 'collaborator') => {
    if (!currentWorkspace) return false;

    try {
      const profilesQuery = query(collection(db, 'profiles'), where('email', '==', email));
      const snap = await getDocs(profilesQuery);

      if (snap.empty) {
        toast({
          title: 'Usuario no encontrado',
          description: 'No existe un usuario con ese email',
          variant: 'destructive',
        });
        return false;
      }

      const profileData = snap.docs[0].data() as Profile;
      const profileId = snap.docs[0].id;

      await addDoc(collection(db, 'user_roles'), {
        user_id: profileId,
        workspace_id: currentWorkspace.id,
        role,
        created_at: new Date().toISOString(),
      });

      toast({
        title: 'Miembro agregado',
        description: `Se agregó a ${profileData.display_name} correctamente`,
      });
      return true;
    } catch (error) {
      console.error('Error adding member in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar al miembro',
        variant: 'destructive',
      });
      return false;
    }
  }, [currentWorkspace, toast]);

  const removeMember = useCallback(async (userId: string) => {
    if (!currentWorkspace) return false;

    try {
      const rolesQuery = query(
        collection(db, 'user_roles'),
        where('user_id', '==', userId),
        where('workspace_id', '==', currentWorkspace.id)
      );
      const snap = await getDocs(rolesQuery);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }

      toast({
        title: 'Miembro eliminado',
      });
      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      return false;
    }
  }, [currentWorkspace, toast]);

  const assignProjectToWorkspace = useCallback(async (projectId: string) => {
    if (!currentWorkspace) return false;

    try {
      await addDoc(collection(db, 'workspace_projects'), {
        workspace_id: currentWorkspace.id,
        project_id: projectId,
        created_at: new Date().toISOString(),
      });

      toast({
        title: 'Proyecto asignado',
      });
      return true;
    } catch (error) {
      console.error('Error assigning project in Firestore:', error);
      return false;
    }
  }, [currentWorkspace, toast]);

  const removeProjectFromWorkspace = useCallback(async (projectId: string) => {
    if (!currentWorkspace) return false;

    try {
      const q = query(
        collection(db, 'workspace_projects'),
        where('workspace_id', '==', currentWorkspace.id),
        where('project_id', '==', projectId)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }

      toast({
        title: 'Proyecto quitado',
      });
      return true;
    } catch (error) {
      console.error('Error removing project from workspace:', error);
      return false;
    }
  }, [currentWorkspace, toast]);

  const assignProjectToMember = useCallback(async (userId: string, projectId: string) => {
    if (!currentWorkspace) return false;

    try {
      await addDoc(collection(db, 'member_project_assignments'), {
        workspace_id: currentWorkspace.id,
        user_id: userId,
        project_id: projectId,
        created_at: new Date().toISOString(),
      });

      toast({
        title: 'Proyecto asignado',
        description: 'El colaborador ahora puede ver este proyecto',
      });
      return true;
    } catch (error) {
      console.error('Error assigning project to member:', error);
      return false;
    }
  }, [currentWorkspace, toast]);

  const removeProjectFromMember = useCallback(async (userId: string, projectId: string) => {
    if (!currentWorkspace) return false;

    try {
      const q = query(
        collection(db, 'member_project_assignments'),
        where('workspace_id', '==', currentWorkspace.id),
        where('user_id', '==', userId),
        where('project_id', '==', projectId)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
      return true;
    } catch (error) {
      console.error('Error removing project from member:', error);
      return false;
    }
  }, [currentWorkspace]);

  const sendInvitation = useCallback(async (email: string, role: AppRole = 'collaborator') => {
    if (!currentWorkspace || !profile) return false;

    try {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await addDoc(collection(db, 'workspace_invitations'), {
        workspace_id: currentWorkspace.id,
        email,
        role,
        token,
        status: 'pending',
        invited_by: profile.id,
        created_at: new Date().toISOString(),
      });

      toast({
        title: 'Invitación creada',
        description: `Invitación registrada para ${email}`,
      });
      return true;
    } catch (error) {
      console.error('Error sending invitation in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar la invitación',
        variant: 'destructive',
      });
      return false;
    }
  }, [currentWorkspace, profile, toast]);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    try {
      await deleteDoc(doc(db, 'workspace_invitations', invitationId));
      toast({
        title: 'Invitación cancelada',
      });
      return true;
    } catch (error) {
      console.error('Error canceling invitation:', error);
      return false;
    }
  }, [toast]);

  const createAccessRequest = useCallback(async () => {
    if (!profile) return false;

    try {
      await addDoc(collection(db, 'workspace_requests'), {
        user_id: profile.id,
        status: 'pending' as RequestStatus,
        created_at: new Date().toISOString(),
      });

      toast({
        title: 'Solicitud enviada',
      });
      return true;
    } catch (error) {
      console.error('Error creating request:', error);
      return false;
    }
  }, [profile, toast]);

  const approveRequest = useCallback(async (requestId: string, workspaceId: string, userId: string) => {
    if (!profile) return false;

    try {
      await updateDoc(doc(db, 'workspace_requests', requestId), {
        status: 'approved' as RequestStatus,
        reviewed_by: profile.id,
        assigned_workspace_id: workspaceId,
        updated_at: new Date().toISOString(),
      });

      await addDoc(collection(db, 'user_roles'), {
        user_id: userId,
        workspace_id: workspaceId,
        role: 'collaborator' as AppRole,
        created_at: new Date().toISOString(),
      });

      toast({
        title: 'Solicitud aprobada',
      });
      return true;
    } catch (error) {
      console.error('Error approving request in Firestore:', error);
      return false;
    }
  }, [profile, toast]);

  const rejectRequest = useCallback(async (requestId: string) => {
    if (!profile) return false;

    try {
      await updateDoc(doc(db, 'workspace_requests', requestId), {
        status: 'rejected' as RequestStatus,
        reviewed_by: profile.id,
        updated_at: new Date().toISOString(),
      });

      toast({
        title: 'Solicitud rechazada',
      });
      return true;
    } catch (error) {
      console.error('Error rejecting request in Firestore:', error);
      return false;
    }
  }, [profile, toast]);

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
    refetchMembers: () => {},
    refetchProjects: () => {},
    refetchInvitations: () => {},
    refetchRequests: () => {},
  };
}
