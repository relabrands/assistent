import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { Project, SectorType, Profile, Workspace } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useProjects(profile: Profile | null, currentWorkspace: Workspace | null = null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!profile) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const projectsQuery = query(collection(db, 'projects'));
    const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      
      // Filter by workspace if present, or by owner
      let filtered = items;
      if (currentWorkspace?.id) {
        filtered = items.filter(p => (p as any).workspace_id === currentWorkspace.id || p.owner_id === profile.id);
      } else {
        filtered = items.filter(p => p.owner_id === profile.id);
      }
      
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      setProjects(filtered);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching projects from Firestore:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, currentWorkspace]);

  const addProject = useCallback(async (projectData: {
    name: string;
    description: string | null;
    sector: SectorType;
    color: string;
  }) => {
    if (!profile) return;

    try {
      const newProj = {
        ...projectData,
        owner_id: profile.id,
        workspace_id: currentWorkspace?.id || null,
        uses_clients: false,
        uses_content_calendar: false,
        allows_client_access: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await addDoc(collection(db, 'projects'), newProj);
      toast({ title: 'Proyecto creado' });
    } catch (error) {
      console.error('Error creating project in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el proyecto',
        variant: 'destructive',
      });
    }
  }, [profile, currentWorkspace, toast]);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    try {
      await updateDoc(doc(db, 'projects', id), {
        ...updates,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating project in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el proyecto',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', id));
      toast({ title: 'Proyecto eliminado' });
    } catch (error) {
      console.error('Error deleting project in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el proyecto',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    projects,
    loading,
    addProject,
    updateProject,
    deleteProject,
    refetch: () => {},
  };
}
