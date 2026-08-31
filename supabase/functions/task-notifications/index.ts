import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskDue {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  profile_email: string;
  profile_name: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Tareas <tareas@nomi.do>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return res.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find tasks due in next 24 hours that haven't been completed
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: tasksDue, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        priority,
        created_by,
        assigned_to
      `)
      .gte('due_date', now.toISOString())
      .lte('due_date', in24Hours.toISOString())
      .neq('status', 'completed')
      .neq('status', 'risk');

    if (tasksError) {
      throw tasksError;
    }

    if (!tasksDue || tasksDue.length === 0) {
      return new Response(
        JSON.stringify({ message: "No tasks due in next 24 hours" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get unique profile IDs
    const profileIds = new Set<string>();
    tasksDue.forEach(task => {
      if (task.created_by) profileIds.add(task.created_by);
      if (task.assigned_to) profileIds.add(task.assigned_to);
    });

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', Array.from(profileIds));

    if (profilesError) {
      throw profilesError;
    }

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Group tasks by user
    const tasksByUser = new Map<string, TaskDue[]>();

    tasksDue.forEach(task => {
      const responsibleId = task.assigned_to || task.created_by;
      const profile = profileMap.get(responsibleId);
      
      if (profile?.email) {
        const userTasks = tasksByUser.get(profile.email) || [];
        userTasks.push({
          id: task.id,
          title: task.title,
          due_date: task.due_date,
          priority: task.priority,
          profile_email: profile.email,
          profile_name: profile.display_name,
        });
        tasksByUser.set(profile.email, userTasks);
      }
    });

    // Send emails
    const emailPromises: Promise<any>[] = [];

    for (const [email, tasks] of tasksByUser) {
      const userName = tasks[0].profile_name;
      const priorityLabels: Record<string, string> = {
        high: '🔴 Alta',
        medium: '🟡 Media',
        low: '🟢 Baja',
      };

      const taskList = tasks.map(t => {
        const dueDate = new Date(t.due_date).toLocaleDateString('es-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        return `<li style="margin-bottom: 12px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
          <strong>${t.title}</strong><br>
          <span style="color: #666; font-size: 14px;">
            📅 ${dueDate} • ${priorityLabels[t.priority] || t.priority}
          </span>
        </li>`;
      }).join('');

      const subject = `⏰ ${tasks.length} tarea${tasks.length > 1 ? 's' : ''} por vencer en las próximas 24 horas`;
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 8px;">
            Hola ${userName} 👋
          </h1>
          <p style="color: #666; font-size: 16px; margin-bottom: 24px;">
            Tienes ${tasks.length} tarea${tasks.length > 1 ? 's' : ''} que vence${tasks.length > 1 ? 'n' : ''} pronto:
          </p>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${taskList}
          </ul>
          <p style="color: #666; font-size: 14px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">
            Este es un recordatorio automático de tu Sistema Operativo Personal.
          </p>
        </div>
      `;

      emailPromises.push(sendEmail(email, subject, html));
    }

    const results = await Promise.allSettled(emailPromises);
    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Notifications sent: ${sent}, failed: ${failed}`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${sent} notification emails`,
        tasksNotified: tasksDue.length,
        emailsSent: sent,
        emailsFailed: failed,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in task-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
