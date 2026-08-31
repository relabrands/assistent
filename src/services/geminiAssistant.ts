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

export interface AIResponse {
  action: 'create_tasks' | 'list_tasks' | 'chat';
  tasks?: ParsedTask[];
  message: string;
  needs_confirmation?: boolean;
  error?: string;
}

export interface AssistantContext {
  projects?: Array<{ id: string; name: string; uses_clients?: boolean }>;
  profiles?: Array<{ id: string; display_name: string }>;
  currentWorkspace?: { id: string; name?: string } | null;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY ||
  import.meta.env.VITE_GOOGLE_AI_API_KEY ||
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
  const { projects = [], profiles = [], currentWorkspace, history = [] } = context;

  const today = new Date().toISOString().split('T')[0];
  const dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date());

  const systemInstruction = `Eres Nomi, el asistente inteligente y de productividad personal de Robinson Sánchez (Mi Sistema Operativo Personal RS / CRM).
Tu misión es ayudar a Robinson y a su equipo a gestionar proyectos, crear tareas automáticamente, resolver dudas y optimizar su flujo de trabajo.

FECHA DE HOY: ${today} (${dayName})

PROYECTOS DISPONIBLES EN EL SISTEMA:
${projects.length > 0 ? projects.map(p => `- "${p.name}" (ID: "${p.id}", usa_clientes: ${!!p.uses_clients})`).join('\n') : '- No hay proyectos registrados aún'}

MIEMBROS DEL EQUIPO:
${profiles.length > 0 ? profiles.map(p => `- "${p.display_name}" (ID: "${p.id}")`).join('\n') : '- Robinson Sánchez (Usuario Principal)'}

WORKSPACE ACTUAL: ${currentWorkspace?.name || currentWorkspace?.id || 'Personal'}

REGLAS DE INTERPRETACIÓN:
1. Si el usuario pide crear, agendar o registrar una o varias tareas:
   - Extrae el título conciso y claro.
   - Detecta la prioridad ("high", "medium", "low"). Palabras como "urgente", "urgencia", "crítico", "ya" -> "high". Palabras como "cuando puedas", "baja" -> "low". Por defecto "medium".
   - Detecta fechas ("hoy", "mañana", "el lunes", "en 3 días", "próxima semana"). Conviértelas a formato YYYY-MM-DD basándote en la fecha de hoy (${today}).
   - Asigna el project_id correspondiente si coincide con el nombre o temática de los proyectos disponibles.
   - Asigna assigned_to si menciona a algún miembro del equipo por su nombre.
   - Si menciona un cliente y el proyecto lo requiere, llena el campo "client".
   - Asigna status: "inbox" o "week" ("week" si es para esta semana o tiene fecha próxima).
   - Pon action: "create_tasks".
   - Pon needs_confirmation: false si la petición es clara y directa para crearla de inmediato, o true si hay dudas o es una lista compleja.

2. Si el usuario hace preguntas, pide consejos, pide resúmenes o conversa:
   - Pon action: "chat".
   - "tasks": []
   - "needs_confirmation": false
   - Responde de forma muy útil, amable, ejecutiva y en español en el campo "message".

FORMATO OBLIGATORIO DE RESPUESTA (SIEMPRE JSON VÁLIDO SIN MARKDOWN ADICIONAL FUERA DEL JSON):
{
  "action": "create_tasks" | "list_tasks" | "chat",
  "tasks": [
    {
      "title": "Título de la tarea",
      "project_id": "ID_DEL_PROYECTO_O_NULL",
      "project_name": "Nombre legible del proyecto",
      "priority": "high" | "medium" | "low",
      "due_date": "YYYY-MM-DD" | null,
      "assigned_to": "ID_DEL_MIEMBRO_O_NULL",
      "assigned_name": "Nombre del asignado",
      "client": "Nombre del cliente si aplica" | null,
      "status": "inbox" | "week"
    }
  ],
  "message": "Explicación amigable de lo que se comprendió o respuesta a la consulta",
  "needs_confirmation": false
}`;

  const contents: any[] = [];

  // Add previous history if available (up to 6 turns)
  const recentHistory = history.slice(-6);
  for (const h of recentHistory) {
    contents.push({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    });
  }

  // Add current user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
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
              temperature: 0.4,
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
        continue; // Try next model
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
          message: parsed.message || 'Entendido.',
          needs_confirmation: !!parsed.needs_confirmation,
        };
      } catch {
        return {
          action: 'chat',
          tasks: [],
          message: candidateText || 'No pude estructurar la respuesta, pero estoy listo para ayudarte.',
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
    message: `Lo siento, ocurrió un problema con el asistente de IA: ${lastError?.message || 'Error desconocido'}.`,
    needs_confirmation: false,
    error: lastError?.message,
  };
}
