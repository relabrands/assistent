export type TaskArea = 'Personal' | 'RELA' | 'Nomi' | 'DOKTAP' | 'Venture Social';
export type TaskStatus = 'inbox' | 'week' | 'risk' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';
export type LifeArea = 'trabajo' | 'personal' | 'salud' | 'aprendizaje' | 'finanzas';
export type SectorType = 'fintech' | 'healthtech' | 'edtech' | 'marketing' | 'ecommerce' | 'saas' | 'proptech' | 'foodtech' | 'other';
export type AppRole = 'admin' | 'collaborator' | 'client' | 'designer';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type RecurrenceType = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  sector: SectorType;
  color: string;
  owner_id: string;
  uses_clients: boolean;
  uses_content_calendar: boolean;
  allows_client_access: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  created_at?: string;
}

export interface Task {
  id: string;
  title: string;
  area: TaskArea;
  status: TaskStatus;
  priority: TaskPriority;
  life_area: LifeArea;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  completed_at: string | null;
  position: number;
  project_id: string | null;
  workspace_id: string | null;
  recurrence_type: RecurrenceType | null;
  recurrence_parent_id: string | null;
  client: string | null;
  client_id: string | null;
  notion_page_id?: string | null;
  notion_database_id?: string | null;
  subtasks?: Subtask[];
  created_at: string;
  updated_at: string;
}

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
};

export interface TaskNote {
  id: string;
  task_id: string;
  content: string;
  created_by: string;
  created_at: string;
  creator?: Profile;
}

export interface TaskWithDetails extends Task {
  assignee?: Profile;
  creator?: Profile;
  project?: Project;
  notes?: TaskNote[];
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  owner?: Profile;
}

export interface UserRole {
  id: string;
  user_id: string;
  workspace_id: string;
  role: AppRole;
  created_at: string;
  user?: Profile;
  workspace?: Workspace;
}

export interface WorkspaceProject {
  id: string;
  workspace_id: string;
  project_id: string;
  created_at: string;
  project?: Project;
}

export interface MemberProjectAssignment {
  id: string;
  workspace_id: string;
  user_id: string;
  project_id: string;
  created_at: string;
  user?: Profile;
  project?: Project;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: AppRole;
  status: InvitationStatus;
  invited_by: string;
  token: string;
  created_at: string;
  expires_at: string;
  workspace?: Workspace;
  inviter?: Profile;
}

export interface WorkspaceRequest {
  id: string;
  user_id: string;
  status: RequestStatus;
  reviewed_by: string | null;
  assigned_workspace_id: string | null;
  created_at: string;
  updated_at: string;
  user?: Profile;
  workspace?: Workspace;
}

export const SECTOR_LABELS: Record<SectorType, string> = {
  fintech: 'Fintech',
  healthtech: 'Healthtech',
  edtech: 'Edtech',
  marketing: 'Marketing',
  ecommerce: 'E-commerce',
  saas: 'SaaS',
  proptech: 'Proptech',
  foodtech: 'Foodtech',
  other: 'Otro',
};

export const SECTOR_COLORS: Record<SectorType, string> = {
  fintech: 'bg-emerald-100 text-emerald-700',
  healthtech: 'bg-rose-100 text-rose-700',
  edtech: 'bg-violet-100 text-violet-700',
  marketing: 'bg-orange-100 text-orange-700',
  ecommerce: 'bg-blue-100 text-blue-700',
  saas: 'bg-cyan-100 text-cyan-700',
  proptech: 'bg-amber-100 text-amber-700',
  foodtech: 'bg-lime-100 text-lime-700',
  other: 'bg-gray-100 text-gray-700',
};

export const LIFE_AREA_LABELS: Record<LifeArea, string> = {
  trabajo: 'Trabajo / Startups',
  personal: 'Personal / Familia',
  salud: 'Salud',
  aprendizaje: 'Aprendizaje',
  finanzas: 'Finanzas',
};

export const LIFE_AREA_COLORS: Record<LifeArea, { bg: string; text: string; icon: string }> = {
  trabajo: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '💼' },
  personal: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '👨‍👩‍👧' },
  salud: { bg: 'bg-green-100', text: 'text-green-700', icon: '💪' },
  aprendizaje: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '📚' },
  finanzas: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '💰' },
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  collaborator: 'Colaborador',
  client: 'Cliente',
  designer: 'Diseñador',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  declined: 'Rechazada',
  expired: 'Expirada',
};
