import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { Task, TaskStatus, Profile, TaskPriority, LifeArea, Workspace, RecurrenceType, Subtask } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { addDays, addWeeks, addMonths } from 'date-fns';

export function useTasksDB(profile: Profile | null, currentWorkspace: Workspace | null = null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Listen to profiles
    const profilesQuery = query(collection(db, 'profiles'), orderBy('display_name', 'asc'));
    const unsubscribeProfiles = onSnapshot(profilesQuery, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Profile));
      setProfiles(items);
    }, (error) => {
      console.warn('Profiles snapshot error:', error);
    });

    return () => unsubscribeProfiles();
  }, []);

  useEffect(() => {
    if (!profile) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let tasksQuery;
    if (currentWorkspace?.id) {
      tasksQuery = query(
        collection(db, 'tasks'),
        where('workspace_id', '==', currentWorkspace.id)
      );
    } else {
      tasksQuery = query(collection(db, 'tasks'));
    }

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      // Sort in memory by position and created_at
      items.sort((a, b) => {
        if ((a.position ?? 0) !== (b.position ?? 0)) {
          return (a.position ?? 0) - (b.position ?? 0);
        }
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      setTasks(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching tasks from Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron sincronizar las tareas',
        variant: 'destructive',
      });
      setLoading(false);
    });

    return () => unsubscribeTasks();
  }, [profile, currentWorkspace, toast]);

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

    try {
      const newTask = {
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
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'tasks'), newTask);
      return { id: docRef.id, ...newTask };
    } catch (error) {
      console.error('Error adding task in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la tarea',
        variant: 'destructive',
      });
    }
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
    subtasks?: Subtask[];
  }) => {
    const updates: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (taskData.title !== undefined) updates.title = taskData.title;
    if (taskData.priority !== undefined) updates.priority = taskData.priority;
    if (taskData.life_area !== undefined) updates.life_area = taskData.life_area;
    if (taskData.assigned_to !== undefined) updates.assigned_to = taskData.assigned_to;
    if (taskData.project_id !== undefined) updates.project_id = taskData.project_id;
    if (taskData.workspace_id !== undefined) updates.workspace_id = taskData.workspace_id;
    if (taskData.client !== undefined) updates.client = taskData.client;
    if (taskData.subtasks !== undefined) updates.subtasks = taskData.subtasks;
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

    try {
      await updateDoc(doc(db, 'tasks', id), updates);
      toast({
        title: 'Tarea actualizada',
        description: 'Los cambios se guardaron correctamente',
      });
      return true;
    } catch (error) {
      console.error('Error updating task in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la tarea',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

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

  const createNextRecurringTask = useCallback(async (completedTask: Task) => {
    if (!completedTask.recurrence_type || !profile) return;

    const nextDueDate = calculateNextDueDate(
      completedTask.due_date,
      completedTask.recurrence_type as RecurrenceType
    );

    try {
      await addDoc(collection(db, 'tasks'), {
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
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      toast({
        title: 'Tarea recurrente',
        description: 'Se creó automáticamente la próxima instancia',
      });
    } catch (error) {
      console.error('Error creating next recurring task:', error);
    }
  }, [profile, calculateNextDueDate, toast]);

  const sendAssignmentEmail = useCallback(async (
    _assigneeId: string,
    taskTitle: string,
    _taskPriority: string,
    _taskDueDate: Date | null,
    _projectName: string | null,
    _clientName: string | null
  ) => {
    console.log(`Task assigned: "${taskTitle}"`);
  }, []);

  const updateTaskStatus = useCallback(async (id: string, status: TaskStatus) => {
    const task = tasks.find(t => t.id === id);
    const updates: any = { 
      status,
      updated_at: new Date().toISOString(),
    };
    
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }

    try {
      await updateDoc(doc(db, 'tasks', id), updates);

      if (status === 'completed' && task?.recurrence_type) {
        await createNextRecurringTask(task);
      }
    } catch (error) {
      console.error('Error updating task status in Firestore:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la tarea',
        variant: 'destructive',
      });
    }
  }, [tasks, toast, createNextRecurringTask]);

  const toggleTaskComplete = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus: TaskStatus = task.status === 'completed' ? 'inbox' : 'completed';
    await updateTaskStatus(id, newStatus);
  }, [tasks, updateTaskStatus]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
      toast({
        title: 'Tarea eliminada',
        description: 'La tarea se ha borrado correctamente',
      });
    } catch (error) {
      console.error('Error deleting task in Firestore:', error);
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
    refetch: () => {},
  };
}
