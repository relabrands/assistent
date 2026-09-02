import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { DashboardHeaderDB } from './DashboardHeaderDB';
import { DroppableSection } from './DroppableSection';
import { DraggableTaskCard } from './DraggableTaskCard';
import { NewTaskModalDB } from './NewTaskModalDB';
import { EditTaskModal } from './EditTaskModal';
import { ActiveProjectsSection } from './ActiveProjectsSection';
import { CompletedHistory } from './CompletedHistory';
import { TaskDetailModal } from './TaskDetailModal';
import { CalendarView } from './CalendarView';
import { WorkspaceSettingsModal } from './WorkspaceSettingsModal';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import { MobileBottomNav } from './MobileBottomNav';
import { TaskFilters, TaskFiltersState, filterTasks } from './TaskFilters';
import { MyInvitationsSection } from './MyInvitationsSection';
import { AIAssistantChat } from './AIAssistantChat';
import { ClientsView } from './clients/ClientsView';
import { AdminDashboard } from './dashboard/AdminDashboard';
import { CollaboratorDashboard } from './dashboard/CollaboratorDashboard';
import { AppSidebar, SidebarView } from './AppSidebar';
import { StoreView } from './store/StoreView';
import { PomodoroView } from './pomodoro/PomodoroView';
import { useTasksDB } from '@/hooks/useTasksDB';
import { useProjects } from '@/hooks/useProjects';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useContentItems } from '@/hooks/useContentItems';
import { TaskStatus, Task, Profile, TaskPriority, Project } from '@/types/database';
import { Loader2, CalendarDays, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export function Dashboard() {
  const { profile, signOut } = useAuth();
  
  const {
    workspaces,
    currentWorkspace,
    workspaceMembers,
    workspaceProjects,
    memberProjectAssignments,
    invitations,
    pendingRequests,
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
    selectWorkspace,
    sendInvitation,
    cancelInvitation,
    approveRequest,
    rejectRequest,
  } = useWorkspaces(profile);

  const {
    tasks,
    profiles,
    loading,
    inboxTasks,
    weekTasks,
    riskTasks,
    delegatedTasks,
    myAssignedTasks,
    completedTasks,
    addTask,
    updateTask,
    updateTaskStatus,
    toggleTaskComplete,
    deleteTask,
    sendAssignmentEmail,
  } = useTasksDB(profile, currentWorkspace);

  const { projects, addProject, updateProject, deleteProject } = useProjects(profile, currentWorkspace);
  const { contentItems } = useContentItems(profile, null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(profile);

  // Sync detailTask with tasks array so subtasks updates reflect instantly
  useEffect(() => {
    if (detailTask) {
      const updatedTask = tasks.find(t => t.id === detailTask.id);
      if (updatedTask && JSON.stringify(updatedTask) !== JSON.stringify(detailTask)) {
        setDetailTask(updatedTask);
      }
    }
  }, [tasks, detailTask]);

  const navigate = useNavigate();
  const location = useLocation();

  const [taskFilters, setTaskFilters] = useState<TaskFiltersState>({
    search: '',
    projectId: null,
    lifeArea: null,
    priority: null,
  });

  // Derive active view and clients from URL
  const getViewFromPath = (pathname: string): SidebarView => {
    if (pathname.startsWith('/tasks')) return 'tasks';
    if (pathname.startsWith('/calendar')) return 'calendar';
    if (pathname.startsWith('/projects')) return 'projects';
    if (pathname.startsWith('/focus')) return 'focus';
    if (pathname.startsWith('/store')) return 'store';
    if (pathname.startsWith('/clients')) return 'clients';
    return 'dashboard';
  };

  const getMobileTabFromPath = (pathname: string): string => {
    if (pathname.startsWith('/tasks')) return 'tasks';
    if (pathname.startsWith('/projects')) return 'projects';
    if (pathname.startsWith('/focus')) return 'focus';
    if (pathname.startsWith('/clients')) return 'clients';
    return 'home';
  };

  const desktopView = getViewFromPath(location.pathname);
  const mobileTab = getMobileTabFromPath(location.pathname);

  // Derive the active clients project from the URL path /clients/:projectId
  const clientsProjectId = location.pathname.startsWith('/clients/')
    ? location.pathname.split('/clients/')[1]
    : null;
  const clientsProject = clientsProjectId
    ? projects.find(p => p.id === clientsProjectId) || null
    : null;

  const setDesktopView = (view: SidebarView) => {
    const pathMap: Record<SidebarView, string> = {
      dashboard: '/',
      tasks: '/tasks',
      calendar: '/calendar',
      projects: '/projects',
      focus: '/focus',
      store: '/store',
      clients: '/projects',
    };
    navigate(pathMap[view]);
  };

  const setMobileTab = (tab: string) => {
    const pathMap: Record<string, string> = {
      home: '/',
      tasks: '/tasks',
      projects: '/projects',
      focus: '/focus',
      store: '/store',
    };
    navigate(pathMap[tab] || '/');
  };

  const setClientsProject = (project: Project | null) => {
    if (project) {
      navigate(`/clients/${project.id}`);
    } else {
      navigate('/projects');
    }
  };

  // Apply filters to tasks
  const filteredInboxTasks = filterTasks(inboxTasks, taskFilters);
  const filteredWeekTasks = filterTasks(weekTasks, taskFilters);
  const filteredRiskTasks = filterTasks(riskTasks, taskFilters);
  const filteredDelegatedTasks = filterTasks(delegatedTasks, taskFilters);
  const filteredMyAssignedTasks = filterTasks(myAssignedTasks, taskFilters);

  // Initialize push notifications
  usePushNotifications(currentProfile, tasks);

  // Mobile-friendly sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find(t => t.id === String(event.active.id));
    setActiveTask(task || null);
  }, [tasks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const targetSection = over.id as string;

    const statusMap: Record<string, TaskStatus> = {
      inbox: 'inbox',
      week: 'week',
      risk: 'risk',
      completed: 'completed',
    };

    const newStatus = statusMap[targetSection];
    if (newStatus) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        if (newStatus === 'week' && weekTasks.length >= 5) {
          return;
        }
        updateTaskStatus(taskId, newStatus);
      }
    }
  }, [tasks, weekTasks.length, updateTaskStatus]);

  // Wrapper for updateTask that sends email notification when assigning
  const handleUpdateTask = useCallback(async (
    id: string,
    data: Parameters<typeof updateTask>[1]
  ) => {
    const currentTask = tasks.find(t => t.id === id);
    const success = await updateTask(id, data);
    
    // If task was successfully updated and assigned_to changed to someone new
    if (success && data.assigned_to && data.assigned_to !== currentTask?.assigned_to) {
      const project = projects.find(p => p.id === (data.project_id ?? currentTask?.project_id));
      await sendAssignmentEmail(
        data.assigned_to,
        data.title ?? currentTask?.title ?? '',
        data.priority ?? currentTask?.priority ?? 'medium',
        data.due_date ?? (currentTask?.due_date ? new Date(currentTask.due_date) : null),
        project?.name ?? null,
        data.client ?? currentTask?.client ?? null
      );
    }
    
    return success;
  }, [tasks, projects, updateTask, sendAssignmentEmail]);

  const handleSignOut = async () => {
    await signOut();
  };

  // Bulk add tasks from AI
  const handleAIAddTasks = useCallback(async (tasksToAdd: Array<{
    title: string;
    project_id: string | null;
    priority: TaskPriority;
    due_date: Date | null;
    assigned_to: string | null;
    client: string | null;
    status: TaskStatus;
  }>) => {
    for (const task of tasksToAdd) {
      await addTask({
        title: task.title,
        project_id: task.project_id,
        priority: task.priority,
        due_date: task.due_date,
        assigned_to: task.assigned_to,
        client: task.client,
        status: task.status,
        life_area: null,
        recurrence_type: null,
      });
    }
  }, [addTask]);


  const handleOpenDetail = (task: Task) => {
    setDetailTask(task);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) return null;




  // Desktop content based on sidebar view
  const renderDesktopContent = () => {
    switch (desktopView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {isAdmin ? (
              <AdminDashboard
                profile={profile}
                tasks={tasks}
                projects={projects}
                profiles={profiles}
                contentItems={contentItems}
              />
            ) : (
              <CollaboratorDashboard
                profile={profile}
                tasks={tasks}
                projects={projects}
                profiles={profiles}
                contentItems={contentItems}
                onTaskClick={handleOpenDetail}
              />
            )}
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-6">
            <TaskFilters 
              filters={taskFilters} 
              onFiltersChange={setTaskFilters} 
              projects={projects} 
            />
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid lg:grid-cols-2 gap-6">
                <DroppableSection
                  id="inbox"
                  title="Inbox"
                  icon="inbox"
                  tasks={filteredInboxTasks}
                  profiles={profiles}
                  projects={projects}
                  onStatusChange={updateTaskStatus}
                  onToggleComplete={toggleTaskComplete}
                  onDelete={deleteTask}
                  onOpenDetail={handleOpenDetail}
                  emptyMessage="¡Inbox vacío! Captura nuevas tareas aquí"
                />
                
                <DroppableSection
                  id="week"
                  title="Esta semana"
                  icon="week"
                  tasks={filteredWeekTasks}
                  profiles={profiles}
                  projects={projects}
                  maxTasks={5}
                  onStatusChange={updateTaskStatus}
                  onToggleComplete={toggleTaskComplete}
                  onDelete={deleteTask}
                  onOpenDetail={handleOpenDetail}
                  emptyMessage="Arrastra tareas desde Inbox"
                />
              </div>
              
              <div className="grid lg:grid-cols-2 gap-6">
                <DroppableSection
                  id="risk"
                  title="En riesgo"
                  icon="risk"
                  tasks={filteredRiskTasks}
                  profiles={profiles}
                  projects={projects}
                  onStatusChange={updateTaskStatus}
                  onToggleComplete={toggleTaskComplete}
                  onDelete={deleteTask}
                  onOpenDetail={handleOpenDetail}
                  emptyMessage="Nada en riesgo 👍"
                  variant="warning"
                />
                
                <DroppableSection
                  id="delegated"
                  title="Delegadas"
                  icon="delegated"
                  tasks={filteredDelegatedTasks}
                  profiles={profiles}
                  projects={projects}
                  onStatusChange={updateTaskStatus}
                  onToggleComplete={toggleTaskComplete}
                  onDelete={deleteTask}
                  onOpenDetail={handleOpenDetail}
                  emptyMessage="Sin tareas delegadas"
                />
              </div>

              {filteredMyAssignedTasks.length > 0 && (
                <DroppableSection
                  id="assigned"
                  title="Asignadas a mí"
                  icon="assigned"
                  tasks={filteredMyAssignedTasks}
                  profiles={profiles}
                  projects={projects}
                  onStatusChange={updateTaskStatus}
                  onToggleComplete={toggleTaskComplete}
                  onDelete={deleteTask}
                  onOpenDetail={handleOpenDetail}
                  emptyMessage="Sin tareas asignadas"
                />
              )}

              <DragOverlay>
                {activeTask && (
                  <DraggableTaskCard
                    task={activeTask}
                    profiles={profiles}
                    projects={projects}
                    onStatusChange={updateTaskStatus}
                    onToggleComplete={toggleTaskComplete}
                    onDelete={deleteTask}
                    onOpenDetail={handleOpenDetail}
                    isDragging
                  />
                )}
              </DragOverlay>
            </DndContext>
            
            <CompletedHistory
              tasks={completedTasks}
              profiles={profiles}
              projects={projects}
            />
          </div>
        );

      case 'calendar':
        return (
          <div className="p-6 rounded-xl border bg-card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Calendario
            </h2>
            <CalendarView
              tasks={tasks}
              profiles={profiles}
              projects={projects}
              onTaskClick={handleOpenDetail}
            />
          </div>
        );

      case 'projects':
        return (
          <div className="space-y-6">
            <ActiveProjectsSection
              isAdmin={isAdmin}
              projects={projects}
              tasks={tasks}
              profiles={profiles}
              onAdd={addProject}
              onUpdate={updateProject}
              onDelete={deleteProject}
              onTaskClick={handleOpenDetail}
              onOpenClients={setClientsProject}
            />
          </div>
        );

      case 'focus':
        return <PomodoroView tasks={tasks} onTaskComplete={toggleTaskComplete} />;

      case 'store':
        return <StoreView profile={profile} />;

      case 'clients':
        if (clientsProject) {
          return (
            <ClientsView 
              project={clientsProject}
              profiles={profiles}
              onBack={() => setClientsProject(null)}
            />
          );
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="container max-w-5xl px-3 sm:px-4 py-3 sm:py-4 pb-24">
          <DashboardHeaderDB 
            profile={currentProfile || profile} 
            workspaces={workspaces}
            currentWorkspace={currentWorkspace}
            onNewTask={() => setIsModalOpen(true)} 
            onOpenAI={() => setIsAIOpen(true)}
            onSignOut={handleSignOut}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            onSelectWorkspace={selectWorkspace}
          />
          
          <div className="mt-4">
            <MyInvitationsSection profile={currentProfile || profile} />
          </div>
          
          <div className="mt-4 sm:mt-6">
            {mobileTab === 'home' && (
              <div className="space-y-4">
                {isAdmin ? (
                  <AdminDashboard
                    profile={profile}
                    tasks={tasks}
                    projects={projects}
                    profiles={profiles}
                    contentItems={contentItems}
                  />
                ) : (
                  <CollaboratorDashboard
                    profile={profile}
                    tasks={tasks}
                    projects={projects}
                    profiles={profiles}
                    contentItems={contentItems}
                    onTaskClick={handleOpenDetail}
                  />
                )}
              </div>
            )}
            
            {mobileTab === 'tasks' && (
              <div className="space-y-3 sm:space-y-4">
                <TaskFilters 
                  filters={taskFilters} 
                  onFiltersChange={setTaskFilters} 
                  projects={projects} 
                />
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <DroppableSection
                    id="inbox"
                    title="Inbox"
                    icon="inbox"
                    tasks={filteredInboxTasks}
                    profiles={profiles}
                    projects={projects}
                    onStatusChange={updateTaskStatus}
                    onToggleComplete={toggleTaskComplete}
                    onDelete={deleteTask}
                    onOpenDetail={handleOpenDetail}
                    emptyMessage="¡Inbox vacío! Captura nuevas tareas aquí"
                  />
                  
                  <DroppableSection
                    id="week"
                    title="Esta semana"
                    icon="week"
                    tasks={filteredWeekTasks}
                    profiles={profiles}
                    projects={projects}
                    maxTasks={5}
                    onStatusChange={updateTaskStatus}
                    onToggleComplete={toggleTaskComplete}
                    onDelete={deleteTask}
                    onOpenDetail={handleOpenDetail}
                    emptyMessage="Arrastra tareas desde Inbox"
                  />
                  
                  <div className="grid grid-cols-1 gap-3">
                    <DroppableSection
                      id="risk"
                      title="En riesgo"
                      icon="risk"
                      tasks={filteredRiskTasks}
                      profiles={profiles}
                      projects={projects}
                      onStatusChange={updateTaskStatus}
                      onToggleComplete={toggleTaskComplete}
                      onDelete={deleteTask}
                      onOpenDetail={handleOpenDetail}
                      emptyMessage="Nada en riesgo 👍"
                      variant="warning"
                    />
                    
                    <DroppableSection
                      id="delegated"
                      title="Delegadas"
                      icon="delegated"
                      tasks={filteredDelegatedTasks}
                      profiles={profiles}
                      projects={projects}
                      onStatusChange={updateTaskStatus}
                      onToggleComplete={toggleTaskComplete}
                      onDelete={deleteTask}
                      onOpenDetail={handleOpenDetail}
                      emptyMessage="Sin tareas delegadas"
                    />
                  </div>

                  {filteredMyAssignedTasks.length > 0 && (
                    <DroppableSection
                      id="assigned"
                      title="Asignadas a mí"
                      icon="assigned"
                      tasks={filteredMyAssignedTasks}
                      profiles={profiles}
                      projects={projects}
                      onStatusChange={updateTaskStatus}
                      onToggleComplete={toggleTaskComplete}
                      onDelete={deleteTask}
                      onOpenDetail={handleOpenDetail}
                      emptyMessage="Sin tareas asignadas"
                    />
                  )}

                  <DragOverlay>
                    {activeTask && (
                      <DraggableTaskCard
                        task={activeTask}
                        profiles={profiles}
                        projects={projects}
                        onStatusChange={updateTaskStatus}
                        onToggleComplete={toggleTaskComplete}
                        onDelete={deleteTask}
                        onOpenDetail={handleOpenDetail}
                        isDragging
                      />
                    )}
                  </DragOverlay>
                </DndContext>
                
                <CompletedHistory
                  tasks={completedTasks}
                  profiles={profiles}
                  projects={projects}
                />
              </div>
            )}
            
            {mobileTab === 'calendar' && (
              <div className="space-y-4">
                <CalendarView
                  tasks={tasks}
                  profiles={profiles}
                  projects={projects}
                  onTaskClick={handleOpenDetail}
                />
              </div>
            )}
            
            {mobileTab === 'projects' && (
              <div className="space-y-4">
                <ActiveProjectsSection
                  projects={projects}
                  tasks={tasks}
                  profiles={profiles}
                  onAdd={addProject}
                  onUpdate={updateProject}
                  onDelete={deleteProject}
                  onTaskClick={handleOpenDetail}
                  onOpenClients={setClientsProject}
                  isAdmin={isAdmin}
                />
              </div>
            )}

            {mobileTab === 'focus' && (
              <div className="space-y-4">
                <PomodoroView tasks={tasks} onTaskComplete={toggleTaskComplete} />
              </div>
            )}

            {mobileTab === 'clients' && clientsProject && (
              <ClientsView
                project={clientsProject}
                profiles={profiles}
                onBack={() => setClientsProject(null)}
              />
            )}

            {mobileTab === 'store' && (
              <StoreView profile={profile} />
            )}
          </div>
        </div>
        
        <MobileBottomNav
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          onNewTask={() => setIsModalOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
        
        {/* Mobile FAB for AI */}
        <div className="fixed bottom-24 right-4 z-50">
          <Button 
            size="icon" 
            className="w-14 h-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-background/20 animate-in slide-in-from-bottom-4 fade-in duration-300"
            onClick={() => setIsAIOpen(true)}
          >
            <Sparkles className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Desktop Layout with Sidebar */}
      <div className="hidden lg:block">
        <SidebarProvider defaultOpen={true}>
          <div className="min-h-screen flex w-full">
            <AppSidebar
              profile={currentProfile || profile}
              projects={projects}
              activeView={desktopView}
              onViewChange={setDesktopView}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenAI={() => setIsAIOpen(true)}
              onSignOut={handleSignOut}
              onOpenClients={setClientsProject}
              isAdmin={isAdmin}
            />
            <SidebarInset className="flex-1">
              <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
                <div className="flex-1">
                  <h1 className="text-lg font-semibold capitalize">
                    {desktopView === 'dashboard' && 'Dashboard'}
                    {desktopView === 'tasks' && 'Tareas'}
                    {desktopView === 'calendar' && 'Calendario'}
                    {desktopView === 'projects' && 'Proyectos'}
                    {desktopView === 'focus' && 'Enfoque'}
                    {desktopView === 'clients' && clientsProject && `Clientes — ${clientsProject.name}`}
                  </h1>
                </div>
                <Button onClick={() => setIsModalOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva tarea
                </Button>
              </header>
              
              <main className="p-6">
                <MyInvitationsSection profile={currentProfile || profile} />
                <div className="mt-4">
                  {renderDesktopContent()}
                </div>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>

      {/* Modals - shared between mobile and desktop */}
      <NewTaskModalDB
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onAddTask={addTask}
        profiles={profiles}
        projects={projects}
        currentProfileId={profile.id}
      />

      <EditTaskModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        task={editingTask}
        onUpdateTask={handleUpdateTask}
        profiles={profiles}
        projects={projects}
        currentProfileId={profile.id}
      />

      <TaskDetailModal
        open={!!detailTask}
        onOpenChange={(open) => !open && setDetailTask(null)}
        task={detailTask}
        profiles={profiles}
        projects={projects}
        currentProfile={profile}
        onEditTask={handleEditTask}
        onUpdateTask={updateTask}
      />

      <WorkspaceSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        workspaceMembers={workspaceMembers}
        workspaceProjects={workspaceProjects}
        memberProjectAssignments={memberProjectAssignments}
        invitations={invitations}
        pendingRequests={pendingRequests}
        allProjects={projects}
        isAdmin={isAdmin}
        workspaceHasData={workspaceHasData}
        onCreateWorkspace={createWorkspace}
        onDeleteWorkspace={deleteWorkspace}
        onAddMember={addMember}
        onRemoveMember={removeMember}
        onAssignProject={assignProjectToWorkspace}
        onRemoveProject={removeProjectFromWorkspace}
        onAssignProjectToMember={assignProjectToMember}
        onRemoveProjectFromMember={removeProjectFromMember}
        onSelectWorkspace={selectWorkspace}
        onSendInvitation={sendInvitation}
        onCancelInvitation={cancelInvitation}
        onApproveRequest={approveRequest}
        onRejectRequest={rejectRequest}
      />

      <ProfileSettingsModal
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        profile={currentProfile || profile}
        tasks={tasks}
        onProfileUpdate={setCurrentProfile}
      />

      <AIAssistantChat
        open={isAIOpen}
        onOpenChange={setIsAIOpen}
        projects={projects}
        profiles={profiles}
        currentWorkspace={currentWorkspace}
        tasks={tasks}
        onAddTasks={handleAIAddTasks}
        onUpdateTask={updateTask}
        onCompleteTask={toggleTaskComplete}
      />
    </div>
  );
}