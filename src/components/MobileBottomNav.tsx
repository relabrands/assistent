import { Home, LayoutGrid, FolderKanban, Plus, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewTask: () => void;
  onOpenProfile: () => void;
}

export function MobileBottomNav({
  activeTab,
  onTabChange,
  onNewTask,
  onOpenProfile,
}: MobileBottomNavProps) {
  const navItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'tasks', label: 'Tareas', icon: LayoutGrid },
    { id: 'new', label: 'Nueva', icon: Plus, isAction: true },
    { id: 'projects', label: 'Proyectos', icon: FolderKanban },
    { id: 'focus', label: 'Enfoque', icon: Timer },
  ];

  const handleClick = (item: typeof navItems[0]) => {
    if (item.isAction) {
      onNewTask();
    } else {
      onTabChange(item.id);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id && !item.isAction;
          const Icon = item.icon;
          
          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className="flex flex-col items-center justify-center -mt-4"
                aria-label="Nueva tarea"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
              </button>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[60px] active:bg-muted/50",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
            >
              <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
