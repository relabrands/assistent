import { useState } from 'react';
import { Project, Task, Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Plus, FolderKanban, LayoutGrid, List } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { ProjectModal } from './ProjectModal';

interface ActiveProjectsSectionProps {
  projects: Project[];
  tasks: Task[];
  profiles: Profile[];
  onAdd: (data: { name: string; description: string | null; sector: string; color: string; uses_clients?: boolean }) => void;
  onUpdate: (id: string, updates: Partial<Project>) => void;
  onDelete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onOpenClients?: (project: Project) => void;
  isAdmin?: boolean;
}

export function ActiveProjectsSection({ 
  projects, 
  tasks, 
  profiles, 
  onAdd, 
  onUpdate, 
  onDelete,
  onTaskClick,
  onOpenClients,
  isAdmin = false,
}: ActiveProjectsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // All projects (not filtered by tasks)
  const activeProjects = projects;

  const handleSave = (data: { name: string; description: string | null; sector: string; color: string }) => {
    if (editingProject) {
      onUpdate(editingProject.id, data as Partial<Project>);
    } else {
      onAdd(data as any);
    }
    setEditingProject(null);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Proyectos Activos</h2>
          <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {activeProjects.length}
          </span>
        </div>
        <Button onClick={handleOpenNew} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Proyecto</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      {activeProjects.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border border-dashed p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Aún no tienes proyectos</h3>
          <p className="text-sm text-muted-foreground mb-4">Crea tu primer proyecto para empezar a organizar tus tareas.</p>
          <Button onClick={handleOpenNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Crear primer proyecto
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {activeProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={tasks}
              profiles={profiles}
              onEdit={handleEdit}
              onDelete={onDelete}
              onTaskClick={onTaskClick}
              onOpenClients={onOpenClients}
            />
          ))}
        </div>
      )}

      <ProjectModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        project={editingProject}
        onSave={handleSave}
        onDelete={editingProject ? onDelete : undefined}
        isAdmin={isAdmin}
      />
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Plus, FolderKanban } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { ProjectModal } from './ProjectModal';

interface ActiveProjectsSectionProps {
  projects: Project[];
