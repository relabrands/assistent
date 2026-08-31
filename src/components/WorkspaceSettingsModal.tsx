import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DeleteWorkspaceDialog } from './DeleteWorkspaceDialog';
import { 
  Workspace, 
  UserRole, 
  WorkspaceProject, 
  Project, 
  AppRole, 
  ROLE_LABELS,
  WorkspaceInvitation,
  WorkspaceRequest,
  MemberProjectAssignment,
} from '@/types/database';
import { Users, FolderKanban, Plus, Trash2, Building2, Loader2, Mail, UserPlus, Check, X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface WorkspaceSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  workspaceMembers: UserRole[];
  workspaceProjects: WorkspaceProject[];
  memberProjectAssignments: MemberProjectAssignment[];
  invitations: WorkspaceInvitation[];
  pendingRequests: WorkspaceRequest[];
  allProjects: Project[];
  isAdmin: boolean;
  workspaceHasData: boolean;
  onCreateWorkspace: (name: string) => Promise<Workspace | null>;
  onDeleteWorkspace: (workspaceId: string, transferToWorkspaceId: string | null) => Promise<boolean>;
  onAddMember: (email: string, role: AppRole) => Promise<boolean>;
  onRemoveMember: (userId: string) => Promise<boolean>;
  onAssignProject: (projectId: string) => Promise<boolean>;
  onRemoveProject: (projectId: string) => Promise<boolean>;
  onAssignProjectToMember: (userId: string, projectId: string) => Promise<boolean>;
  onRemoveProjectFromMember: (userId: string, projectId: string) => Promise<boolean>;
  onSelectWorkspace: (workspace: Workspace) => void;
  onSendInvitation: (email: string, role: AppRole) => Promise<boolean>;
  onCancelInvitation: (invitationId: string) => Promise<boolean>;
  onApproveRequest: (requestId: string, workspaceId: string, userId: string) => Promise<boolean>;
  onRejectRequest: (requestId: string) => Promise<boolean>;
}

export function WorkspaceSettingsModal({
  open,
  onOpenChange,
  workspaces,
  currentWorkspace,
  workspaceMembers,
  workspaceProjects,
  memberProjectAssignments,
  invitations,
  pendingRequests,
  allProjects,
  isAdmin,
  workspaceHasData,
  onCreateWorkspace,
  onDeleteWorkspace,
  onAddMember,
  onRemoveMember,
  onAssignProject,
  onRemoveProject,
  onAssignProjectToMember,
  onRemoveProjectFromMember,
  onSelectWorkspace,
  onSendInvitation,
  onCancelInvitation,
  onApproveRequest,
  onRejectRequest,
}: WorkspaceSettingsModalProps) {
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<AppRole>('collaborator');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('collaborator');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [assigningProject, setAssigningProject] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    setCreatingWorkspace(true);
    const ws = await onCreateWorkspace(newWorkspaceName.trim());
    if (ws) {
      setNewWorkspaceName('');
    }
    setCreatingWorkspace(false);
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;
    setAddingMember(true);
    const success = await onAddMember(newMemberEmail.trim(), newMemberRole);
    if (success) {
      setNewMemberEmail('');
      setNewMemberRole('collaborator');
    }
    setAddingMember(false);
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    const success = await onSendInvitation(inviteEmail.trim(), inviteRole);
    if (success) {
      setInviteEmail('');
      setInviteRole('collaborator');
    }
    setSendingInvite(false);
  };

  const handleAssignProject = async () => {
    if (!selectedProjectId) return;
    setAssigningProject(true);
    const success = await onAssignProject(selectedProjectId);
    if (success) {
      setSelectedProjectId('');
    }
    setAssigningProject(false);
  };

  const handleDeleteWorkspace = async (transferToWorkspaceId: string | null) => {
    if (!currentWorkspace) return false;
    return await onDeleteWorkspace(currentWorkspace.id, transferToWorkspaceId);
  };

  // Get projects not yet assigned to workspace
  const assignedProjectIds = workspaceProjects.map(wp => wp.project_id);
  const availableProjects = allProjects.filter(p => !assignedProjectIds.includes(p.id));

  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  // Get projects assigned to a specific member
  const getMemberProjects = (userId: string) => {
    return memberProjectAssignments.filter(mpa => mpa.user_id === userId);
  };

  // Get projects available to assign to a member (workspace projects not yet assigned to them)
  const getAvailableProjectsForMember = (userId: string) => {
    const memberProjectIds = getMemberProjects(userId).map(mpa => mpa.project_id);
    return workspaceProjects.filter(wp => !memberProjectIds.includes(wp.project_id));
  };

  // Other workspaces for transfer
  const otherWorkspaces = workspaces.filter(w => w.id !== currentWorkspace?.id);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Configuración de Workspaces
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="workspaces" className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-6 grid w-auto grid-cols-4">
              <TabsTrigger value="workspaces" className="gap-1 text-xs sm:text-sm">
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Workspaces</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-1 text-xs sm:text-sm">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Miembros</span>
              </TabsTrigger>
              <TabsTrigger value="projects" className="gap-1 text-xs sm:text-sm">
                <FolderKanban className="w-4 h-4" />
                <span className="hidden sm:inline">Proyectos</span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-1 text-xs sm:text-sm relative">
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Solicitudes</span>
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-6">
              {/* Workspaces Tab */}
              <TabsContent value="workspaces" className="mt-0 space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Crear nuevo workspace</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      placeholder="Nombre del workspace..."
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                    />
                    <Button onClick={handleCreateWorkspace} disabled={creatingWorkspace || !newWorkspaceName.trim()}>
                      {creatingWorkspace ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Tus workspaces</Label>
                  {workspaces.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No tienes workspaces aún. Crea uno para empezar.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {workspaces.map((ws) => (
                        <div
                          key={ws.id}
                          className={cn(
                            'p-3 rounded-lg border cursor-pointer transition-colors',
                            currentWorkspace?.id === ws.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-accent/50'
                          )}
                        >
                          <div className="flex items-center justify-between" onClick={() => onSelectWorkspace(ws)}>
                            <div>
                              <h4 className="font-medium">{ws.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                Creado el {new Date(ws.created_at).toLocaleDateString('es-ES')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {currentWorkspace?.id === ws.id && (
                                <Badge variant="secondary">Activo</Badge>
                              )}
                              {isAdmin && currentWorkspace?.id === ws.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members" className="mt-0 space-y-4">
                {!currentWorkspace ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Selecciona un workspace primero
                  </p>
                ) : (
                  <>
                    {isAdmin && (
                      <>
                        {/* Direct add member */}
                        <div className="space-y-3 pb-4 border-b">
                          <Label className="text-sm font-medium">Agregar miembro existente</Label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              value={newMemberEmail}
                              onChange={(e) => setNewMemberEmail(e.target.value)}
                              placeholder="Email del usuario registrado..."
                              className="flex-1"
                              type="email"
                            />
                            <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as AppRole)}>
                              <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="collaborator">Colaborador</SelectItem>
                                <SelectItem value="designer">Diseñador</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button onClick={handleAddMember} disabled={addingMember || !newMemberEmail.trim()}>
                              {addingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Send invitation */}
                        <div className="space-y-3 pb-4 border-b">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Invitar por email
                          </Label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="Email para invitar..."
                              className="flex-1"
                              type="email"
                            />
                            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                              <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="collaborator">Colaborador</SelectItem>
                                <SelectItem value="designer">Diseñador</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button onClick={handleSendInvitation} disabled={sendingInvite || !inviteEmail.trim()}>
                              {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Se guardará la invitación. Cuando la persona se registre con ese email, aparecerá en el workspace.
                          </p>
                        </div>

                        {/* Pending invitations */}
                        {pendingInvitations.length > 0 && (
                          <div className="space-y-3 pb-4 border-b">
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Invitaciones pendientes
                            </Label>
                            <div className="space-y-2">
                              {pendingInvitations.map((inv) => (
                                <div
                                  key={inv.id}
                                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                                >
                                  <div>
                                    <p className="font-medium text-sm">{inv.email}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {ROLE_LABELS[inv.role]} · Expira {new Date(inv.expires_at).toLocaleDateString('es-ES')}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onCancelInvitation(inv.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Miembros de {currentWorkspace.name}
                      </Label>
                      {workspaceMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No hay miembros en este workspace
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {workspaceMembers.map((member) => {
                            const isExpanded = expandedMemberId === member.id;
                            const memberProjects = getMemberProjects(member.user_id);
                            const availableForMember = getAvailableProjectsForMember(member.user_id);
                            const isCollaborator = member.role === 'collaborator';

                            return (
                              <Collapsible
                                key={member.id}
                                open={isExpanded}
                                onOpenChange={() => setExpandedMemberId(isExpanded ? null : member.id)}
                              >
                                <div className="rounded-lg border overflow-hidden">
                                  <div className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-sm font-medium">
                                          {member.user?.display_name?.[0]?.toUpperCase() || '?'}
                                        </span>
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">{member.user?.display_name}</p>
                                        <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                                        {ROLE_LABELS[member.role]}
                                      </Badge>
                                      {isAdmin && isCollaborator && (
                                        <>
                                          <CollapsibleTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                              {isExpanded ? (
                                                <ChevronUp className="w-4 h-4" />
                                              ) : (
                                                <ChevronDown className="w-4 h-4" />
                                              )}
                                            </Button>
                                          </CollapsibleTrigger>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onRemoveMember(member.user_id)}
                                            className="text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Project assignments for collaborators */}
                                  <CollapsibleContent>
                                    {isCollaborator && isAdmin && (
                                      <div className="p-3 pt-0 space-y-3 border-t bg-muted/20">
                                        <Label className="text-xs font-medium">Proyectos asignados</Label>
                                        
                                        {/* Assigned projects */}
                                        {memberProjects.length > 0 ? (
                                          <div className="flex flex-wrap gap-2">
                                            {memberProjects.map((mpa) => (
                                              <Badge
                                                key={mpa.id}
                                                variant="outline"
                                                className="flex items-center gap-1 pr-1"
                                              >
                                                <div
                                                  className="w-2 h-2 rounded-full"
                                                  style={{ backgroundColor: mpa.project?.color }}
                                                />
                                                {mpa.project?.name}
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-4 w-4 ml-1 hover:bg-destructive/20"
                                                  onClick={() => onRemoveProjectFromMember(member.user_id, mpa.project_id)}
                                                >
                                                  <X className="w-3 h-3" />
                                                </Button>
                                              </Badge>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-muted-foreground">
                                            Sin proyectos asignados
                                          </p>
                                        )}

                                        {/* Add project to member */}
                                        {availableForMember.length > 0 && (
                                          <div className="flex gap-2">
                                            <Select
                                              onValueChange={(projectId) => {
                                                onAssignProjectToMember(member.user_id, projectId);
                                              }}
                                            >
                                              <SelectTrigger className="flex-1 h-8 text-xs">
                                                <SelectValue placeholder="Asignar proyecto..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {availableForMember.map((wp) => (
                                                  <SelectItem key={wp.project_id} value={wp.project_id}>
                                                    <div className="flex items-center gap-2">
                                                      <div
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: wp.project?.color }}
                                                      />
                                                      {wp.project?.name}
                                                    </div>
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Projects Tab */}
              <TabsContent value="projects" className="mt-0 space-y-4">
                {!currentWorkspace ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Selecciona un workspace primero
                  </p>
                ) : (
                  <>
                    {isAdmin && availableProjects.length > 0 && (
                      <div className="space-y-3 pb-4 border-b">
                        <Label className="text-sm font-medium">Asignar proyecto existente</Label>
                        <div className="flex gap-2">
                          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Seleccionar proyecto..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableProjects.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: p.color }}
                                    />
                                    {p.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button onClick={handleAssignProject} disabled={assigningProject || !selectedProjectId}>
                            {assigningProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Proyectos en {currentWorkspace.name}
                      </Label>
                      {workspaceProjects.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No hay proyectos asignados. Los proyectos nuevos se asignan automáticamente.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {workspaceProjects.map((wp) => (
                            <div
                              key={wp.id}
                              className="flex items-center justify-between p-3 rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: wp.project?.color }}
                                />
                                <div>
                                  <p className="font-medium text-sm">{wp.project?.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {wp.project?.description || 'Sin descripción'}
                                  </p>
                                </div>
                              </div>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onRemoveProject(wp.project_id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Requests Tab */}
              <TabsContent value="requests" className="mt-0 space-y-4">
                {!isAdmin ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Solo los administradores pueden ver las solicitudes
                  </p>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Solicitudes de acceso pendientes</Label>
                    {pendingRequests.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        No hay solicitudes pendientes
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {pendingRequests.map((req) => (
                          <div
                            key={req.id}
                            className="p-4 rounded-lg border space-y-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {req.user?.display_name?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{req.user?.display_name}</p>
                                <p className="text-sm text-muted-foreground">{req.user?.email}</p>
                                <p className="text-xs text-muted-foreground">
                                  Solicitado el {new Date(req.created_at).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                            </div>

                            {currentWorkspace && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => onApproveRequest(req.id, currentWorkspace.id, req.user_id)}
                                  className="flex-1"
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onRejectRequest(req.id)}
                                  className="flex-1"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Rechazar
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <DeleteWorkspaceDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        workspace={currentWorkspace}
        otherWorkspaces={otherWorkspaces}
        hasData={workspaceHasData}
        onConfirm={handleDeleteWorkspace}
      />
    </>
  );
}
