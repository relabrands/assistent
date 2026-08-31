import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { askGeminiAssistant } from '@/services/geminiAssistant';
import { Project, Profile, Workspace, TaskPriority, TaskStatus } from '@/types/database';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Loader2, 
  CheckCircle2, 
  Sparkles,
  X
} from 'lucide-react';
import { toast } from 'sonner';

// Type declaration for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSpeechRecognition = (): (new () => SpeechRecognitionInterface) | undefined => {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
};

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tasks?: ParsedTask[];
  needsConfirmation?: boolean;
}

interface ParsedTask {
  title: string;
  project_id: string | null;
  project_name?: string;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  assigned_name?: string;
  client: string | null;
  status: TaskStatus;
}

interface AIResponse {
  action: 'create_tasks' | 'list_tasks' | 'chat';
  tasks: ParsedTask[];
  message: string;
  needs_confirmation: boolean;
  error?: string;
}

interface AIAssistantChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  profiles: Profile[];
  currentWorkspace: Workspace | null;
  onAddTasks: (tasks: Array<{
    title: string;
    project_id: string | null;
    priority: TaskPriority;
    due_date: Date | null;
    assigned_to: string | null;
    client: string | null;
    status: TaskStatus;
  }>) => Promise<void>;
}

export function AIAssistantChat({
  open,
  onOpenChange,
  projects,
  profiles,
  currentWorkspace,
  onAddTasks,
}: AIAssistantChatProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<ParsedTask[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (SpeechRecognitionClass) {
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error('Error en reconocimiento de voz');
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await askGeminiAssistant(userMessage.content, {
        projects,
        profiles,
        currentWorkspace,
        history,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        tasks: response.tasks,
        needsConfirmation: response.needs_confirmation,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If there are tasks and action is create_tasks
      if (response.action === 'create_tasks' && response.tasks?.length > 0) {
        if (response.needs_confirmation) {
          setPendingTasks(response.tasks);
        } else {
          // Auto-create tasks
          await handleCreateTasks(response.tasks);
        }
      }
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

  const handleCreateTasks = async (tasks: ParsedTask[]) => {
    try {
      const formattedTasks = tasks.map(task => ({
        title: task.title,
        project_id: task.project_id,
        priority: task.priority || 'medium',
        due_date: task.due_date ? new Date(task.due_date) : null,
        assigned_to: task.assigned_to,
        client: task.client,
        status: task.status || 'inbox',
      }));

      await onAddTasks(formattedTasks);
      setPendingTasks([]);
      
      toast.success(`${tasks.length} tarea${tasks.length > 1 ? 's' : ''} creada${tasks.length > 1 ? 's' : ''}`);
      
      const confirmMessage: AIMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ ¡Listo! He creado ${tasks.length} tarea${tasks.length > 1 ? 's' : ''} exitosamente.`,
      };
      setMessages(prev => [...prev, confirmMessage]);
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
    const cancelMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Entendido, he cancelado la creación de tareas. ¿En qué más puedo ayudarte?',
    };
    setMessages(prev => [...prev, cancelMessage]);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw] h-[80vh] max-h-[600px] flex flex-col p-0 gap-0 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Asistente AI</h3>
            <p className="text-xs text-muted-foreground">Crea tareas con lenguaje natural</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-4">
              <Bot className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  ¡Hola! Soy tu asistente de productividad.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Puedo ayudarte a crear tareas rápidamente. Prueba diciendo:
                </p>
                <div className="space-y-1 text-xs text-muted-foreground/70">
                  <p>"Agregar tarea: revisar propuesta para RELA urgente para mañana"</p>
                  <p>"Crear 3 tareas para Nomi: diseño, desarrollo y testing"</p>
                  <p>"Agregar tarea para el cliente Acme: reunión de kickoff"</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  
                  {/* Show tasks preview */}
                  {msg.tasks && msg.tasks.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.tasks.map((task, idx) => (
                        <div
                          key={idx}
                          className="bg-background/50 rounded-lg p-2 text-xs space-y-1"
                        >
                          <p className="font-medium text-foreground">{task.title}</p>
                          <div className="flex flex-wrap gap-1">
                            {task.project_name && (
                              <Badge variant="secondary" className="text-[10px]">
                                {task.project_name}
                              </Badge>
                            )}
                            <Badge className={`text-[10px] ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                            {task.due_date && (
                              <Badge variant="outline" className="text-[10px]">
                                {task.due_date}
                              </Badge>
                            )}
                            {task.assigned_name && (
                              <Badge variant="outline" className="text-[10px]">
                                → {task.assigned_name}
                              </Badge>
                            )}
                            {task.client && (
                              <Badge variant="outline" className="text-[10px]">
                                🏢 {task.client}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Pending tasks confirmation */}
        {pendingTasks.length > 0 && (
          <div className="px-4 py-3 border-t bg-muted/50">
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

        {/* Input */}
        <div className="px-4 py-3 border-t">
          <div className="flex gap-2">
            <Button
              variant={isListening ? 'default' : 'outline'}
              size="icon"
              onClick={toggleListening}
              className={isListening ? 'animate-pulse bg-red-500 hover:bg-red-600' : ''}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe o habla para agregar tareas..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
