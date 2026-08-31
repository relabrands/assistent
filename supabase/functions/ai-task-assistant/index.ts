import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, projects, profiles, currentWorkspace } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Eres un asistente de productividad experto. Tu trabajo es ayudar a crear tareas de manera eficiente.

PROYECTOS DISPONIBLES:
${projects?.map((p: any) => `- "${p.name}" (ID: ${p.id}, usa_clientes: ${p.uses_clients})`).join('\n') || 'No hay proyectos'}

MIEMBROS DEL EQUIPO:
${profiles?.map((p: any) => `- "${p.display_name}" (ID: ${p.id})`).join('\n') || 'No hay miembros'}

WORKSPACE ACTUAL: ${currentWorkspace?.id || 'personal'}

INSTRUCCIONES:
1. Cuando el usuario quiera agregar tareas, extrae la información y devuelve un JSON estructurado
2. Puedes crear MÚLTIPLES tareas a la vez si el usuario lo solicita
3. Asigna automáticamente al proyecto correcto basándote en el contexto
4. Si el proyecto usa clientes, intenta detectar el nombre del cliente
5. Detecta la prioridad (high, medium, low) basándote en palabras clave como "urgente", "importante", etc.
6. Detecta fechas relativas como "mañana", "próxima semana", "viernes", etc.
7. Si el usuario menciona a alguien del equipo, asígnale la tarea

FORMATO DE RESPUESTA (SIEMPRE en JSON válido):
{
  "action": "create_tasks" | "list_tasks" | "chat",
  "tasks": [
    {
      "title": "título de la tarea",
      "project_id": "id del proyecto o null",
      "project_name": "nombre del proyecto para confirmar",
      "priority": "high" | "medium" | "low",
      "due_date": "YYYY-MM-DD o null",
      "assigned_to": "id del miembro o null",
      "assigned_name": "nombre para confirmar",
      "client": "nombre del cliente si aplica o null",
      "status": "inbox" | "week"
    }
  ],
  "message": "mensaje amigable para el usuario explicando lo que harás",
  "needs_confirmation": true | false
}

Si el usuario solo quiere chatear o preguntar algo, usa action: "chat" y responde en "message".
Si detectas tareas pero hay ambigüedad, pon needs_confirmation: true y explica las opciones.

Responde SIEMPRE en español y sé conciso pero amable.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "";

    // Try to parse as JSON, if fails return as chat message
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedMessage = aiMessage.trim();
      if (cleanedMessage.startsWith("```json")) {
        cleanedMessage = cleanedMessage.slice(7);
      }
      if (cleanedMessage.startsWith("```")) {
        cleanedMessage = cleanedMessage.slice(3);
      }
      if (cleanedMessage.endsWith("```")) {
        cleanedMessage = cleanedMessage.slice(0, -3);
      }
      cleanedMessage = cleanedMessage.trim();
      
      const parsed = JSON.parse(cleanedMessage);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      // If not valid JSON, return as chat
      return new Response(JSON.stringify({
        action: "chat",
        message: aiMessage,
        tasks: [],
        needs_confirmation: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("AI assistant error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
