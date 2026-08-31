import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Project, SectorType, Profile, Workspace } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useProjects(profile: Profile | null, currentWorkspace: Workspace | null = null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    // If we have a workspace, fetch only projects assigned to this workspace
    if (currentWorkspace) {
      const { data, error } = await supabase
        .from('workspace_projects')
        .select(`
          project:projects(*)
        `)
        .eq('workspace_id', currentWorkspace.id);

      if (error) {
        console.error('Error fetching workspace projects:', error);
        setProjects([]);
      } else {
        // Extract projects from the nested structure
        const projectsData = data
          ?.map(wp => wp.project)
          .filter(Boolean) as Project[];
        setProjects(projectsData || []);
      }
    } else {
      // No workspace selected - show projects owned by user that aren't in any workspace
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', profile.id)
        .order('name');

      if (error) {
        console.error('Error fetching projects:', error);
      } else {
        setProjects(data as Project[]);
      }
    }
    setLoading(false);
  }, [profile, currentWorkspace]);

  useEffect(() => {
    if (!profile) return;

    fetchProjects();

    // Subscribe to both projects and workspace_projects changes
    const projectsChannel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => fetchProjects()
      )
      .subscribe();

    const workspaceProjectsChannel = supabase
      .channel('workspace-projects-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspace_projects' },
        () => fetchProjects()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(workspaceProjectsChannel);
    };
  }, [profile, currentWorkspace, fetchProjects]);

  const addProject = useCallback(async (projectData: {
    name: string;
    description: string | null;
    sector: SectorType;
    color: string;
  }) => {
    if (!profile) return;

    // Create the project
    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        ...projectData,
        owner_id: profile.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el proyecto',
        variant: 'destructive',
      });
      return;
    }

    // If we have a current workspace, auto-assign the project to it
    if (currentWorkspace && newProject) {
      const { error: assignError } = await supabase
        .from('workspace_projects')
        .insert({
          workspace_id: currentWorkspace.id,
          project_id: newProject.id,
        });

      if (assignError) {
        console.error('Error assigning project to workspace:', assignError);
      }
    }

    toast({ title: 'Proyecto creado' });
    await fetchProjects();
  }, [profile, currentWorkspace, toast, fetchProjects]);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el proyecto',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el proyecto',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Proyecto eliminado' });
    }
  }, [toast]);

  return {
    projects,
    loading,
    addProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
}
