export interface ParsedTask {
  title: string;
  project_id?: string | null;
  project_name?: string;
  priority?: 'high' | 'medium' | 'low';
  due_date?: string | null;
  assigned_to?: string | null;
  assigned_name?: string;
  client?: string | null;
  status?: 'inbox' | 'week';
}

export interface RescheduledTask {
  id: string;
  title: string;
  new_due_date?: string | null;
  new_status?: 'inbox' | 'week' | 'risk' | 'completed';
  reason?: string;
}

export interface CompletedTask {
  id: string;
  title: string;
}

export interface AIResponse {
  action: 'create_tasks' | 'reschedule_tasks' | 'complete_tasks' | 'list_tasks' | 'chat';
  tasks?: ParsedTask[];
  rescheduled_tasks?: RescheduledTask[];
  completed_tasks?: CompletedTask[];
  message: string;
  needs_confirmation?: boolean;
  error?: string;
}

export interface TaskContextItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  project_name?: string;
  project_id?: string | null;
  assigned_name?: string;
  subtasks?: Array<{title: string; completed: boolean}>;
}

export interface AssistantContext {
  projects?: Array<{ id: string; name: string; uses_clients?: boolean }>;
  profiles?: Array<{ id: string; display_name: string }>;
  currentWorkspace?: { id: string; name?: string } | null;
  existingTasks?: TaskContextItem[];
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  audioData?: {
    base64: string;
    mimeType: string;
  };
}

const GEMINI_API_KEY =
  (import.meta.env.VITE_GEMINI_API_KEY as string) ||
  (import.meta.env.GEMINI_API_KEY as string) ||
  (import.meta.env.VITE_GOOGLE_AI_API_KEY as string) ||
  "";

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.5-pro"
];

/**
 * Generate a proactive smart greeting based on the current day,
 * overdue tasks, tasks from last week, and tasks scheduled for today.
 */
export function generateProactiveGreeting(
  existingTasks: TaskContextItem[] = [],
  userName: string = 'Robinson'
): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const todayStr = now.toISOString().split('T')[0];

  const overdueTasks = existingTasks.filter(
    t => t.due_date && t.due_date < todayStr && t.status !== 'completed'
  );
  const todayTasks = existingTasks.filter(
    t => t.due_date === todayStr && t.status !== 'completed'
  );
  const weekTasks = existingTasks.filter(
    t => t.status === 'week' && (!t.due_date || t.due_date >= todayStr)
  );

  // If today is Monday (1)
  if (dayOfWeek === 1) {
    if (overdueTasks.length > 0) {
      const topOverdue = overdueTasks[0];
      return `👋 ¡Hola ${userName}! Feliz inicio de semana.

Estuve revisando tu tablero y veo que la tarea **"${topOverdue.title}"** (de la semana pasada) aún no está completada. 

¿Pudiste avanzar con ella o tuviste que priorizar otra cosa? Si prefieres, dime y te ayudo a reagendarla recomendándote el mejor día de esta semana. 🗓️`;
    }

    if (todayTasks.length > 0) {
      return `👋 ¡Hola ${userName}! Feliz lunes e inicio de semana.

Para hoy tienes **${todayTasks.length} tarea${todayTasks.length > 1 ? 's' : ''}** planificada${todayTasks.length > 1 ? 's' : ''}:
${todayTasks.slice(0, 3).map(t => `• **${t.title}** (${t.priority.toUpperCase()})`).join('\n')}

¿Por cuál quieres que empecemos o prefieres dictarme nuevas prioridades por audio o texto? 🎙️`;
    }

    return `👋 ¡Hola ${userName}! Excelente inicio de semana.

Tienes tu agenda despejada para comenzar. Puedes dictarme tus tareas por voz o escribir lo que necesitas coordinar para esta semana.`;
  }

  // Any other day
  if (overdueTasks.length > 0) {
    const topOverdue = overdueTasks[0];
    return `👋 ¡Hola ${userName}! 

Revisé tus tareas pendientes y veo que **"${topOverdue.title}"** quedó pendiente de días anteriores. 

¿La pudiste realizar o necesitas que la reagendemos para hoy o más adelante en la semana?`;
  }

  if (todayTasks.length > 0) {
    return `👋 ¡Hola ${userName}! 

Para hoy tienes **${todayTasks.length} tarea${todayTasks.length > 1 ? 's' : ''}** en agenda:
${todayTasks.slice(0, 3).map(t => `• **${t.title}** (${t.priority.toUpperCase()})`).join('\n')}

¿Cómo vas con ellas o deseas reagendar o agregar algo nuevo?`;
  }

  if (weekTasks.length > 0) {
    return `👋 ¡Hola ${userName}! Tienes **${weekTasks.length} tarea${weekTasks.length > 1 ? 's' : ''}** activas para esta semana. ¿En qué te gustaría enfocarte hoy o qué deseas registrar?`;
  }

  return `👋 ¡Hola ${userName}! Soy Nomi, tu asistente de productividad. ¿Qué tareas o proyectos organizamos hoy? Puedes escribir o enviar un audio.`;
}

export async function askGeminiAssistant(
  userMessage: string,
  context: AssistantContext = {}
): Promise<AIResponse> {
  const {
    projects = [],
    profiles = [],
    currentWorkspace,
    existingTasks = [],
    history = [],
    audioData
  } = context;

  const today = new Date().toISOString().split('T')[0];
  const dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date());

  const tasksListStr = existingTasks.length > 0
    ? existingTasks.map(t => {
        let subtasksStr = '';
        if (t.subtasks && t.subtasks.length > 0) {
          subtasksStr = ' | Subtareas: ' + t.subtasks.map(st => `[${st.completed ? 'x' : ' '}] ${st.title}`).join(', ');
        }
        return `- [ID: "${t.id}"] "${t.title}" | Estado: "${t.status}" | Prioridad: "${t.priority}" | Fecha límite: ${t.due_date || 'Sin fecha'}${subtasksStr}`;
      }).join('\n')
    : '- No hay tareas registradas';

  const systemInstruction = `Eres Nomi, el asistente inteligente de productividad ejecutiva de Robinson Sánchez (RS Sistema Operativo Personal / CRM).
Tu misión es gestionar tareas, proyectos, reagendamientos inteligentes, seguimiento diario y semanal, y optimizar el tiempo de Robinson.

FECHA DE HOY: ${today} (${dayName})

TAREAS ACTUALES EN EL SISTEMA:
${tasksListStr}

PROYECTOS DISPONIBLES:
${projects.length > 0 ? projects.map(p => `- "${p.name}" (ID: "${p.id}", usa_clientes: ${!!p.uses_clients})`).join('\n') : '- Sin proyectos'}

MIEMBROS DEL EQUIPO:
${profiles.length > 0 ? profiles.map(p => `- "${p.display_name}" (ID: "${p.id}")`).join('\n') : '- Robinson Sánchez'}

WORKSPACE: ${currentWorkspace?.name || 'Personal'}

CAPACIDADES Y REGLAS DE COMPORTAMIENTO:

1. REAGENDAMIENTO INTELIGENTE Y SEGUIMIENTO SEMANAL/DIARIO:
   - Si el usuario pide reagendar una tarea, o menciona que no la pudo hacer:
     * Identifica el ID EXACTO de la tarea de la lista de tareas actuales.
     * Asigna action: "reschedule_tasks".
     * Llena "rescheduled_tasks" obligatoriamente con [{ "id": "ID_EXACTO", "title": "Título", "new_due_date": "YYYY-MM-DD", "new_status": "week" }].
     * En "message" responde con empatía.

2. COMPLETAR TAREAS:
   - Si el usuario dice que ya hizo la tarea:
     * Identifica el ID EXACTO.
     * Asigna action: "complete_tasks".
     * Llena "completed_tasks" obligatoriamente con [{ "id": "ID_EXACTO", "title": "Título" }].

3. CREAR NUEVAS TAREAS:
   - Si el usuario dicta nuevas tareas:
     * Asigna action: "create_tasks".
     * Llena "tasks" con los objetos de tarea.

4. REGLA DE ORO (CERO ALUCINACIONES DE ACCIÓN):
   - NUNCA digas en tu mensaje de texto ("message") que has reagendado, creado o completado una tarea si no estás incluyendo realmente los datos en el array JSON correspondiente ("rescheduled_tasks", "tasks", "completed_tasks").
   - Si decides sugerir fechas en vez de accionar de una vez, DEBES hablar en futuro condicional ("Te sugiero pasarlas para el martes, ¿qué te parece?"), NO en pasado ("Ya las he reagendado"). Si dices "las reagendé", el array "rescheduled_tasks" DEBE venir lleno.

5. AUDIO Y LENGUAJE NATURAL:
   - Eres una asistente dominicana, profesional pero cercana. Habla con naturalidad.

6. FORMATO DE SALIDA (ESTRICTAMENTE JSON VÁLIDO):
{
  "action": "create_tasks" | "reschedule_tasks" | "complete_tasks" | "list_tasks" | "chat",
  "tasks": [
    {
      "title": "string",
      "project_id": "string | null",
      "project_name": "string",
      "priority": "high" | "medium" | "low",
      "due_date": "YYYY-MM-DD | null",
      "assigned_to": "string | null",
      "assigned_name": "string",
      "client": "string | null",
      "status": "inbox" | "week"
    }
  ],
  "rescheduled_tasks": [
    {
      "id": "ID_EXACTO_DE_LA_TAREA_EXISTENTE",
      "title": "Título de la tarea",
      "new_due_date": "YYYY-MM-DD",
      "new_status": "week"
    }
  ],
  "completed_tasks": [
    {
      "id": "ID_EXACTO_DE_LA_TAREA_EXISTENTE",
      "title": "Título de la tarea"
    }
  ],
  "message": "Mensaje conversacional de Nomi",
  "needs_confirmation": false
}`;

  const contents: any[] = [];

  // Add conversation history
  const recentHistory = history.slice(-6);
  for (const h of recentHistory) {
    contents.push({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    });
  }

  // Current turn parts
  const currentParts: any[] = [];

  if (audioData?.base64) {
    currentParts.push({
      inline_data: {
        mime_type: audioData.mimeType || 'audio/webm',
        data: audioData.base64,
      }
    });
    currentParts.push({
      text: userMessage || 'Por favor escucha este audio y responde según las instrucciones.'
    });
  } else {
    currentParts.push({
      text: userMessage || 'Hola Nomi'
    });
  }

  contents.push({
    role: 'user',
    parts: currentParts,
  });

  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemInstruction }]
            },
            contents,
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json",
              maxOutputTokens: 2048,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(`Gemini model ${modelName} returned ${response.status}:`, errorBody);
        lastError = new Error(`Error en modelo ${modelName} (${response.status})`);
        continue;
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      let cleaned = candidateText.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();

      try {
        const parsed: AIResponse = JSON.parse(cleaned);
        return {
          action: parsed.action || 'chat',
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
          rescheduled_tasks: Array.isArray(parsed.rescheduled_tasks) ? parsed.rescheduled_tasks : [],
          completed_tasks: Array.isArray(parsed.completed_tasks) ? parsed.completed_tasks : [],
          message: parsed.message || 'Entendido.',
          needs_confirmation: !!parsed.needs_confirmation,
        };
      } catch {
        return {
          action: 'chat',
          tasks: [],
          message: candidateText || 'Estoy lista para ayudarte con tus tareas.',
          needs_confirmation: false,
        };
      }
    } catch (err: any) {
      console.warn(`Exception calling model ${modelName}:`, err);
      lastError = err;
    }
  }

  return {
    action: 'chat',
    tasks: [],
    message: `Lo siento, ocurrió un problema al conectar con Gemini: ${lastError?.message || 'Error desconocido'}.`,
    needs_confirmation: false,
    error: lastError?.message,
  };
}
