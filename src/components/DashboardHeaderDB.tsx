import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, LogOut, Settings, Building2, User, Sparkles } from 'lucide-react';
import { Profile, Workspace } from '@/types/database';

interface DashboardHeaderDBProps {
  profile: Profile;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onNewTask: () => void;
  onOpenAI: () => void;
  onSignOut: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onSelectWorkspace: (workspace: Workspace) => void;
}

export function DashboardHeaderDB({ 
  profile, 
  workspaces,
  currentWorkspace,
  onNewTask, 
  onOpenAI,
  onSignOut, 
  onOpenSettings,
  onOpenProfile,
  onSelectWorkspace,
}: DashboardHeaderDBProps) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      onSelectWorkspace(workspace);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="flex flex-col gap-3 pb-4 sm:pb-6 border-b border-border pt-safe">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">
              Hola, {profile.display_name}
            </h1>
            
            {/* Workspace Selector */}
            {workspaces.length > 0 && (
              <Select 
                value={currentWorkspace?.id || ''} 
                onValueChange={handleWorkspaceChange}
              >
                <SelectTrigger className="w-auto min-w-[140px] max-w-[200px] h-8 text-sm bg-muted/50">
                  <Building2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Workspace..." />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">
            {formattedDate}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            onClick={onOpenAI} 
            size="icon" 
            variant="outline"
            className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-300 dark:border-violet-700 hover:from-violet-500/20 hover:to-purple-500/20"
            title="Asistente AI"
          >
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </Button>
          <Button onClick={onNewTask} size="default" className="gap-2 shadow-sm flex-1 sm:flex-none">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="sm:inline">Nueva tarea</span>
          </Button>
          
          {onOpenSettings && (
            <Button variant="outline" size="icon" onClick={onOpenSettings} title="Configuración del workspace">
              <Settings className="w-4 h-4" />
            </Button>
          )}

          {/* Profile Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full p-0 overflow-hidden">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(profile.display_name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{profile.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
              </div>
              <DropdownMenuSeparator />
              {onOpenProfile && (
                <DropdownMenuItem onClick={onOpenProfile}>
                  <User className="w-4 h-4 mr-2" />
                  Mi perfil
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
