import { useState } from 'react';
import { Project, Task, Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Plus, FolderKanban } from 'lucide-react';
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

  // Filter active projects (those with non-completed tasks)
  const activeProjects = projects.filter(project => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const hasActiveTasks = projectTasks.some(t => t.status !== 'completed');
    return hasActiveTasks || projectTasks.length === 0; // Include projects with no tasks or active tasks
  });

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
          <span className="text-sm text-muted-foreground">({activeProjects.length})</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenNew} className="gap-1.5">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Proyecto</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      {activeProjects.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Aún no tienes proyectos activos
          </p>
          <Button variant="outline" size="sm" onClick={handleOpenNew} className="mt-4">
            Crear primer proyecto
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {activeProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={tasks}
              profiles={profiles}
              onEdit={handleEdit}
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
