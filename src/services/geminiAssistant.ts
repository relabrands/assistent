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
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview"
];

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
    ? existingTasks.map(t => `- [ID: "${t.id}"] "${t.title}" | Estado: "${t.status}" | Prioridad: "${t.priority}" | Fecha límite: ${t.due_date || 'Sin fecha'} | Proyecto: ${t.project_name || 'N/A'}`).join('\n')
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
   - Si el usuario dice que no pudo hacer una tarea, o que tuvo que hacer otra cosa, o pide reagendar una tarea existente:
     * Identifica cuál tarea es por su título o ID de la lista de tareas actuales.
     * Recomienda amablemente un día de esta semana (ej. "Te sugiero pasarla al jueves que tienes menos carga").
     * Asigna action: "reschedule_tasks".
     * Llena "rescheduled_tasks" con [{ "id": "ID_DE_LA_TAREA", "title": "Título", "new_due_date": "YYYY-MM-DD", "new_status": "week" }].
     * Responde con empatía y claridad en "message".

2. COMPLETAR TAREAS:
   - Si el usuario dice que ya hizo la tarea, que la terminó o la completó:
     * Asigna action: "complete_tasks".
     * Llena "completed_tasks" con [{ "id": "ID_DE_LA_TAREA", "title": "Título" }].
     * Felicita y confirma que fue marcada como completada en "message".

3. CREAR NUEVAS TAREAS:
   - Si el usuario dicta o escribe una o varias tareas nuevas:
     * Extrae título conciso, prioridad ('high', 'medium', 'low'), fecha estimada (YYYY-MM-DD), project_id si coincide, y assigned_to.
     * Asigna action: "create_tasks".
     * Llena "tasks" con los objetos de tarea.

4. AUDIO Y LENGUAJE NATURAL:
   - Puedes recibir audio multimodal o texto. Procesa el contenido hablado con total naturalidad en español dominicano / neutro y profesional.

5. FORMATO DE SALIDA (ESTRICTAMENTE JSON VÁLIDO):
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
  "message": "Mensaje conversacional de Nomi para Robinson",
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
