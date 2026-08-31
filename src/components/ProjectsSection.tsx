import { useState } from 'react';
import { Project, SECTOR_LABELS, SECTOR_COLORS } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, FolderKanban } from 'lucide-react';
import { ProjectModal } from './ProjectModal';
import { cn } from '@/lib/utils';

interface ProjectsSectionProps {
  projects: Project[];
  onAdd: (data: { name: string; description: string | null; sector: string; color: string }) => void;
  onUpdate: (id: string, updates: Partial<Project>) => void;
  onDelete: (id: string) => void;
}

export function ProjectsSection({ projects, onAdd, onUpdate, onDelete }: ProjectsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

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
    <div className="bg-card rounded-xl border border-border p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-muted-foreground" />
          <h2 className="section-header mb-0">Proyectos</h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenNew} className="gap-1">
          <Plus className="w-3 h-3" />
          Nuevo
        </Button>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aún no tienes proyectos
        </p>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{project.name}</span>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    SECTOR_COLORS[project.sector]
                  )}>
                    {SECTOR_LABELS[project.sector]}
                  </span>
                </div>
                {project.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {project.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleEdit(project)}
                className="p-1.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ProjectModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        project={editingProject}
        onSave={handleSave}
        onDelete={editingProject ? onDelete : undefined}
      />
    </div>
  );
}
