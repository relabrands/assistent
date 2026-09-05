import { useState } from 'react';
import {
  Inbox,
  CalendarDays,
  FolderKanban,
  Users,
  CheckCircle2,
  Settings,
  PanelLeftClose,
  PanelLeft,
  LayoutDashboard,
  ListTodo,
  UserCircle,
  LogOut,
  Sparkles,
  ShoppingBag,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Profile, Project } from '@/types/database';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type SidebarView = 'dashboard' | 'tasks' | 'calendar' | 'projects' | 'clients' | 'store' | 'focus';

interface AppSidebarProps {
  profile: Profile;
  projects: Project[];
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenAI: () => void;
  onSignOut: () => void;
  onOpenClients: (project: Project) => void;
  onOpenNotion?: () => void;
  isAdmin: boolean;
}

const mainNavItems = [
  { id: 'dashboard' as SidebarView, title: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks' as SidebarView, title: 'Tareas', icon: ListTodo },
  { id: 'calendar' as SidebarView, title: 'Calendario', icon: CalendarDays },
  { id: 'projects' as SidebarView, title: 'Proyectos', icon: FolderKanban },
  { id: 'focus' as SidebarView, title: 'Enfoque', icon: Timer },
  { id: 'store' as SidebarView, title: 'Tienda', icon: ShoppingBag },
];

export function AppSidebar({
  profile,
  projects,
  activeView,
  onViewChange,
  onOpenSettings,
  onOpenProfile,
  onOpenAI,
  onSignOut,
  onOpenClients,
  onOpenNotion,
  isAdmin,
}: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const clientProjects = projects; // Show all projects in client management as requested

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-card"
    >
      <SidebarHeader className="p-3">
        <div className={cn(
          "flex items-center gap-3",
          isCollapsed && "justify-center"
        )}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sm truncate">Personal Robinson</h1>
              <p className="text-xs text-muted-foreground truncate">Gestión de tareas</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={toggleSidebar}
          >
            {isCollapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Main Navigation */}
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>Navegación</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={activeView === item.id}
                    tooltip={item.title}
                  >
                    <item.icon className="w-4 h-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Client Projects */}
        {clientProjects.length > 0 && (
          <SidebarGroup>
            {!isCollapsed && <SidebarGroupLabel>Gestión de Clientes</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {clientProjects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      onClick={() => onOpenClients(project)}
                      tooltip={project.name}
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{project.name}</span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* AI Assistant */}
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>Herramientas</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenAI} tooltip="Asistente IA">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  {!isCollapsed && <span>Asistente IA</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenNotion} tooltip="Integración Notion">
                  <div className="w-4 h-4 rounded bg-foreground text-background flex items-center justify-center font-bold text-[10px] leading-none shrink-0">
                    N
                  </div>
                  {!isCollapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>Notion CRM</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-2" />
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onOpenSettings} tooltip="Configuración">
                    <Settings className="w-4 h-4" />
                    {!isCollapsed && <span>Configuración</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-auto py-2",
                isCollapsed && "justify-center px-2"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(profile.display_name)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{profile.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onOpenProfile}>
              <UserCircle className="w-4 h-4 mr-2" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}