import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus, Profile, TaskPriority, LifeArea, Workspace, RecurrenceType } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { addDays, addWeeks, addMonths } from 'date-fns';
export function useTasksDB(profile: Profile | null, currentWorkspace: Workspace | null = null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('display_name');
    
    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }
    setProfiles(data as Profile[]);
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!profile) return;
    
    setLoading(true);
    
    let query = supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    // If we have a workspace, filter by workspace_id
    if (currentWorkspace) {
      query = query.eq('workspace_id', currentWorkspace.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las tareas',
        variant: 'destructive',
      });
    } else {
      setTasks(data as Task[]);
    }
    setLoading(false);
  }, [profile, currentWorkspace, toast]);

  useEffect(() => {
    if (!profile) return;

    fetchTasks();
    fetchProfiles();

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchTasks, fetchProfiles]);

  const addTask = useCallback(async (taskData: {
    title: string;
    priority: TaskPriority;
    life_area: LifeArea | null;
    assigned_to: string | null;
    due_date: Date | null;
    project_id: string | null;
    workspace_id?: string | null;
    recurrence_type?: RecurrenceType | null;
    client?: string | null;
    recurrence_parent_id?: string | null;
    status?: TaskStatus;
  }) => {
    if (!profile) return;

    const { error, data } = await supabase.from('tasks').insert({
      title: taskData.title,
      priority: taskData.priority,
      life_area: taskData.life_area || null,
      assigned_to: taskData.assigned_to,
      due_date: taskData.due_date?.toISOString() || null,
      project_id: taskData.project_id,
      workspace_id: taskData.workspace_id || currentWorkspace?.id || null,
      recurrence_type: taskData.recurrence_type || null,
      recurrence_parent_id: taskData.recurrence_parent_id || null,
      client: taskData.client || null,
      created_by: profile.id,
      status: taskData.status || 'inbox',
      position: 0,
    }).select().single();

    if (error) {
      console.error('Error adding task:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la tarea',
        variant: 'destructive',
      });
    }

    return data;
  }, [profile, currentWorkspace, toast]);

  const updateTask = useCallback(async (id: string, taskData: {
    title?: string;
    priority?: TaskPriority;
    life_area?: LifeArea;
    assigned_to?: string | null;
    due_date?: Date | null;
    project_id?: string | null;
    status?: TaskStatus;
    workspace_id?: string | null;
    client?: string | null;
  }) => {
    const updates: Partial<Task> = {};
    
    if (taskData.title !== undefined) updates.title = taskData.title;
    if (taskData.priority !== undefined) updates.priority = taskData.priority;
    if (taskData.life_area !== undefined) updates.life_area = taskData.life_area;
    if (taskData.assigned_to !== undefined) updates.assigned_to = taskData.assigned_to;
    if (taskData.project_id !== undefined) updates.project_id = taskData.project_id;
    if (taskData.workspace_id !== undefined) updates.workspace_id = taskData.workspace_id;
    if (taskData.client !== undefined) updates.client = taskData.client;
    if (taskData.due_date !== undefined) {
      updates.due_date = taskData.due_date?.toISOString() || null;
    }
    if (taskData.status !== undefined) {
      updates.status = taskData.status;
      if (taskData.status === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = null;
      }
    }

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la tarea',
        variant: 'destructive',
      });
      return false;
    }
    
    toast({
      title: 'Tarea actualizada',
      description: 'Los cambios se guardaron correctamente',
    });
    return true;
  }, [toast]);

  // Helper function to calculate the next due date based on recurrence type
  const calculateNextDueDate = useCallback((currentDueDate: string | null, recurrenceType: RecurrenceType): Date => {
    const baseDate = currentDueDate ? new Date(currentDueDate) : new Date();
    
    switch (recurrenceType) {
      case 'daily':
        return addDays(baseDate, 1);
      case 'weekly':
        return addWeeks(baseDate, 1);
      case 'biweekly':
        return addWeeks(baseDate, 2);
      case 'monthly':
        return addMonths(baseDate, 1);
      default:
        return addDays(baseDate, 1);
    }
  }, []);

  // Create the next instance of a recurring task
  const createNextRecurringTask = useCallback(async (completedTask: Task) => {
    if (!completedTask.recurrence_type || !profile) return;

    const nextDueDate = calculateNextDueDate(
      completedTask.due_date,
      completedTask.recurrence_type as RecurrenceType
    );

    const { error } = await supabase.from('tasks').insert({
      title: completedTask.title,
      priority: completedTask.priority,
      life_area: completedTask.life_area,
      assigned_to: completedTask.assigned_to,
      due_date: nextDueDate.toISOString(),
      project_id: completedTask.project_id,
      workspace_id: completedTask.workspace_id,
      recurrence_type: completedTask.recurrence_type,
      recurrence_parent_id: completedTask.recurrence_parent_id || completedTask.id,
      client: completedTask.client,
      created_by: profile.id,
      status: 'inbox',
      position: 0,
    });

    if (error) {
      console.error('Error creating next recurring task:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la próxima tarea recurrente',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Tarea recurrente',
        description: 'Se creó automáticamente la próxima instancia',
      });
    }
  }, [profile, calculateNextDueDate, toast]);

  // Send email notification when task is assigned
  const sendAssignmentEmail = useCallback(async (
    assigneeId: string,
    taskTitle: string,
    taskPriority: string,
    taskDueDate: Date | null,
    projectName: string | null,
    clientName: string | null
  ) => {
    if (!profile) return;

    const assignee = profiles.find(p => p.id === assigneeId);
    if (!assignee?.email) {
      console.log('No email found for assignee');
      return;
    }

    try {
      const response = await supabase.functions.invoke('send-task-assignment-email', {
        body: {
          assignee_email: assignee.email,
          assignee_name: assignee.display_name,
          assigner_name: profile.display_name,
          task_title: taskTitle,
          task_priority: taskPriority,
          task_due_date: taskDueDate?.toISOString() || null,
          project_name: projectName,
          client_name: clientName,
        },
      });

      if (response.error) {
        console.error('Error sending assignment email:', response.error);
      } else {
        console.log('Assignment email sent successfully');
      }
    } catch (error) {
      console.error('Error invoking send-task-assignment-email:', error);
    }
  }, [profile, profiles]);

  const updateTaskStatus = useCallback(async (id: string, status: TaskStatus) => {
    const task = tasks.find(t => t.id === id);
    const updates: Partial<Task> = { status };
    
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la tarea',
        variant: 'destructive',
      });
      return;
    }

    // If task is being completed and has recurrence, create next instance
    if (status === 'completed' && task?.recurrence_type) {
      await createNextRecurringTask(task);
    }
  }, [tasks, toast, createNextRecurringTask]);

  const toggleTaskComplete = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus: TaskStatus = task.status === 'completed' ? 'inbox' : 'completed';
    await updateTaskStatus(id, newStatus);
  }, [tasks, updateTaskStatus]);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la tarea',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const myProfileId = profile?.id;
  
  const inboxTasks = tasks.filter(t => 
    t.status === 'inbox' && t.created_by === myProfileId && !t.assigned_to
  );
  
  const weekTasks = tasks.filter(t => 
    t.status === 'week' && (t.created_by === myProfileId || t.assigned_to === myProfileId) && t.assigned_to !== myProfileId
  );
  
  const riskTasks = tasks.filter(t => t.status === 'risk');
  
  const delegatedTasks = tasks.filter(t => 
    t.assigned_to && t.assigned_to !== myProfileId && t.status !== 'completed'
  );

  const myAssignedTasks = tasks.filter(t =>
    t.assigned_to === myProfileId && t.status !== 'completed'
  );

  const completedTasks = tasks.filter(t => t.status === 'completed');

  return {
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
    refetch: fetchTasks,
  };
}
