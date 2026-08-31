import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  askGeminiAssistant, 
  generateProactiveGreeting,
  ParsedTask, 
  RescheduledTask,
  CompletedTask,
  TaskContextItem 
} from '@/services/geminiAssistant';
import { Project, Profile, Workspace, TaskPriority, TaskStatus, Task } from '@/types/database';
import { 
  Bot, 
  Send, 
  Mic, 
  Square,
  Loader2, 
  CheckCircle2, 
  Sparkles,
  X,
  Calendar,
  Clock,
  ArrowRight,
  Check,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isAudio?: boolean;
  tasks?: ParsedTask[];
  rescheduledTasks?: RescheduledTask[];
  completedTasks?: CompletedTask[];
  needsConfirmation?: boolean;
}

interface AIAssistantChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  profiles: Profile[];
  currentWorkspace: Workspace | null;
  tasks?: Task[];
  onAddTasks: (tasks: Array<{
    title: string;
    project_id: string | null;
    priority: TaskPriority;
    due_date: Date | null;
    assigned_to: string | null;
    client: string | null;
    status: TaskStatus;
  }>) => Promise<void>;
  onUpdateTask?: (id: string, updates: Partial<Task>) => Promise<void>;
  onCompleteTask?: (id: string) => Promise<void>;
}

export function AIAssistantChat({
  open,
  onOpenChange,
  projects,
  profiles,
  currentWorkspace,
  tasks = [],
  onAddTasks,
  onUpdateTask,
  onCompleteTask,
}: AIAssistantChatProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [pendingTasks, setPendingTasks] = useState<ParsedTask[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Generate proactive greeting on initial open if chat is empty
  useEffect(() => {
    if (open && messages.length === 0) {
      const taskContext: TaskContextItem[] = tasks.map(t => {
        const project = projects.find(p => p.id === t.project_id);
        const assigned = profiles.find(p => p.id === t.assigned_to);
        return {
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          project_name: project?.name,
          project_id: t.project_id,
          assigned_name: assigned?.display_name,
        };
      });

      const proactiveMessage = generateProactiveGreeting(taskContext, 'Robinson');
      setMessages([
        {
          id: 'greeting-' + Date.now(),
          role: 'assistant',
          content: proactiveMessage,
        }
      ]);
    }
  }, [open, tasks, projects, profiles, messages.length]);

  // Build context for Gemini assistant
  const getAssistantContext = useCallback(() => {
    const taskContext: TaskContextItem[] = tasks.map(t => {
      const project = projects.find(p => p.id === t.project_id);
      const assigned = profiles.find(p => p.id === t.assigned_to);
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        project_name: project?.name,
        project_id: t.project_id,
        assigned_name: assigned?.display_name,
      };
    });

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    return {
      projects,
      profiles,
      currentWorkspace,
      existingTasks: taskContext,
      history,
    };
  }, [projects, profiles, currentWorkspace, tasks, messages]);

  // Handle Assistant response actions
  const processAIResponse = async (response: any) => {
    // 1. Create tasks
    if (response.action === 'create_tasks' && response.tasks?.length > 0) {
      if (response.needs_confirmation) {
        setPendingTasks(response.tasks);
      } else {
        await handleCreateTasks(response.tasks);
      }
    }

    // 2. Reschedule tasks
    if (response.rescheduled_tasks?.length > 0 && onUpdateTask) {
      for (const resched of response.rescheduled_tasks) {
        try {
          await onUpdateTask(resched.id, {
            due_date: resched.new_due_date || null,
            status: resched.new_status || 'week',
          });
          toast.success(`Tarea reagendada: ${resched.title}`);
        } catch (err) {
          console.error('Error rescheduling task:', err);
        }
      }
    }

    // 3. Complete tasks
    if (response.completed_tasks?.length > 0) {
      for (const comp of response.completed_tasks) {
        try {
          if (onCompleteTask) {
            await onCompleteTask(comp.id);
          } else if (onUpdateTask) {
            await onUpdateTask(comp.id, {
              status: 'completed',
              completed_at: new Date().toISOString(),
            });
          }
          toast.success(`Tarea completada: ${comp.title}`);
        } catch (err) {
          console.error('Error completing task:', err);
        }
      }
    }
  };

  // Text message send
  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const context = getAssistantContext();
      const response = await askGeminiAssistant(text, context);

      if (response.error) {
        throw new Error(response.error);
      }

      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        tasks: response.tasks,
        rescheduledTasks: response.rescheduled_tasks,
        completedTasks: response.completed_tasks,
        needsConfirmation: response.needs_confirmation,
      };

      setMessages(prev => [...prev, assistantMessage]);
      await processAIResponse(response);
    } catch (error) {
      console.error('AI error:', error);
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Error al comunicarse con el asistente');
    } finally {
      setIsLoading(false);
    }
  };

  // Start Audio Recording via MediaRecorder
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250); // Collect data chunks every 250ms
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  };

  // Stop Recording and send audio directly to Gemini
  const stopRecordingAndSend = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || 'audio/webm',
      });

      // Stop all tracks
      mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);

      if (audioBlob.size === 0) {
        toast.error('No se detectó audio');
        return;
      }

      // Convert audio blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const userAudioMessage: AIMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: `🎙️ Mensaje de voz (${recordingDuration}s)`,
          isAudio: true,
        };

        setMessages(prev => [...prev, userAudioMessage]);
        setIsLoading(true);

        try {
          const context = getAssistantContext();
          const response = await askGeminiAssistant('', {
            ...context,
            audioData: {
              base64: base64Data,
              mimeType: audioBlob.type,
            },
          });

          const assistantMessage: AIMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.message,
            tasks: response.tasks,
            rescheduledTasks: response.rescheduled_tasks,
            completedTasks: response.completed_tasks,
            needsConfirmation: response.needs_confirmation,
          };

          setMessages(prev => [...prev, assistantMessage]);
          await processAIResponse(response);
        } catch (error) {
          console.error('AI Audio error:', error);
          setMessages(prev => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: 'No pude procesar el audio correctamente. Por favor intenta de nuevo.',
            }
          ]);
        } finally {
          setIsLoading(false);
        }
      };
    };

    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setRecordingDuration(0);
      audioChunksRef.current = [];
      toast.info('Grabación cancelada');
    }
  };

  const handleCreateTasks = async (tasksToCreate: ParsedTask[]) => {
    try {
      const formattedTasks = tasksToCreate.map(task => ({
        title: task.title,
        project_id: task.project_id || null,
        priority: task.priority || 'medium',
        due_date: task.due_date ? new Date(task.due_date) : null,
        assigned_to: task.assigned_to || null,
        client: task.client || null,
        status: task.status || 'inbox',
      }));

      await onAddTasks(formattedTasks);
      setPendingTasks([]);
      
      toast.success(`${tasksToCreate.length} tarea${tasksToCreate.length > 1 ? 's' : ''} creada${tasksToCreate.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error creating tasks:', error);
      toast.error('Error al crear las tareas');
    }
  };

  const handleConfirmTasks = () => {
    if (pendingTasks.length > 0) {
      handleCreateTasks(pendingTasks);
    }
  };

  const handleCancelTasks = () => {
    setPendingTasks([]);
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Entendido, he cancelado la creación de esas tareas.',
      }
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw] h-[85vh] max-h-[680px] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden shadow-2xl border bg-background">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base leading-none">Nomi</h3>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                Gemini AI
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">Tu asistente de productividad y seguimiento</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Action Suggestion Chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/30 border-b overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => sendMessage('¿Qué tareas tengo pendientes para hoy?')}
            className="shrink-0 px-2.5 py-1 rounded-full bg-background hover:bg-primary/10 hover:text-primary border transition-colors flex items-center gap-1"
          >
            <Clock className="w-3 h-3 text-primary" /> Tareas de hoy
          </button>
          <button
            onClick={() => sendMessage('Revisemos las tareas que quedaron de la semana pasada para reagendar')}
            className="shrink-0 px-2.5 py-1 rounded-full bg-background hover:bg-primary/10 hover:text-primary border transition-colors flex items-center gap-1"
          >
            <Calendar className="w-3 h-3 text-amber-500" /> Revisar semana pasada
          </button>
          <button
            onClick={() => sendMessage('Quiero agregar una tarea urgente')}
            className="shrink-0 px-2.5 py-1 rounded-full bg-background hover:bg-primary/10 hover:text-primary border transition-colors flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3 text-red-500" /> Tarea urgente
          </button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted/80 backdrop-blur-sm border rounded-bl-none text-foreground'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  
                  {/* Newly created tasks preview */}
                  {msg.tasks && msg.tasks.length > 0 && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-border/50">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Tareas creadas / sugeridas:
                      </p>
                      {msg.tasks.map((task, idx) => (
                        <div
                          key={idx}
                          className="bg-background/80 rounded-xl p-2.5 text-xs space-y-1.5 border shadow-sm"
                        >
                          <p className="font-semibold text-foreground">{task.title}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {task.project_name && (
                              <Badge variant="secondary" className="text-[10px]">
                                📁 {task.project_name}
                              </Badge>
                            )}
                            <Badge className={`text-[10px] ${getPriorityColor(task.priority || 'medium')}`}>
                              {task.priority?.toUpperCase()}
                            </Badge>
                            {task.due_date && (
                              <Badge variant="outline" className="text-[10px] bg-background">
                                📅 {task.due_date}
                              </Badge>
                            )}
                            {task.assigned_name && (
                              <Badge variant="outline" className="text-[10px] bg-background">
                                👤 {task.assigned_name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Rescheduled tasks preview */}
                  {msg.rescheduledTasks && msg.rescheduledTasks.length > 0 && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-amber-500/20">
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Reagendada con éxito:
                      </p>
                      {msg.rescheduledTasks.map((task, idx) => (
                        <div
                          key={idx}
                          className="bg-amber-500/10 rounded-xl p-2.5 text-xs border border-amber-500/20 space-y-1"
                        >
                          <p className="font-semibold text-foreground">{task.title}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                            <span>Nueva fecha:</span>
                            <Badge variant="outline" className="bg-background text-amber-600 dark:text-amber-400 border-amber-400/40">
                              {task.new_due_date || 'Esta semana'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Completed tasks preview */}
                  {msg.completedTasks && msg.completedTasks.length > 0 && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-green-500/20">
                      {msg.completedTasks.map((task, idx) => (
                        <div
                          key={idx}
                          className="bg-green-500/10 rounded-xl p-2 text-xs border border-green-500/20 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="font-medium line-through text-muted-foreground">{task.title}</span>
                          <Badge variant="outline" className="ml-auto text-[10px] bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30">
                            Completada
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted/80 border rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Nomi está pensando...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Pending tasks confirmation */}
        {pendingTasks.length > 0 && (
          <div className="px-4 py-3 border-t bg-muted/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                ¿Crear {pendingTasks.length} tarea{pendingTasks.length > 1 ? 's' : ''}?
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCancelTasks}>
                  <X className="w-3 h-3 mr-1" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleConfirmTasks}>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Audio Recording Banner or Input Box */}
        <div className="p-3 border-t bg-background">
          {isRecording ? (
            <div className="flex items-center justify-between gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl animate-pulse">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span>Grabando audio... ({formatDuration(recordingDuration)})</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelRecording}
                  className="text-muted-foreground hover:text-foreground h-8 px-2 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={stopRecordingAndSend}
                  className="bg-red-600 hover:bg-red-700 text-white h-8 px-3 text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Enviar Audio
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={startRecording}
                disabled={isLoading}
                title="Grabar audio / nota de voz para Nomi"
                className="h-10 w-10 shrink-0 rounded-xl hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all"
              >
                <Mic className="w-4 h-4 text-primary" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe o envía un audio a Nomi..."
                disabled={isLoading}
                className="flex-1 h-10 rounded-xl"
              />
              <Button
                type="button"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
