import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TaskAssignmentRequest {
  assignee_email: string;
  assignee_name: string;
  assigner_name: string;
  task_title: string;
  task_priority: string;
  task_due_date: string | null;
  project_name: string | null;
  client_name: string | null;
}

const priorityLabels: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      assignee_email,
      assignee_name,
      assigner_name,
      task_title,
      task_priority,
      task_due_date,
      project_name,
      client_name,
    }: TaskAssignmentRequest = await req.json();

    const priorityLabel = priorityLabels[task_priority] || task_priority;
    const dueDateFormatted = task_due_date
      ? new Date(task_due_date).toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Sin fecha límite";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📋 Nueva tarea asignada</h1>
          </div>
          
          <div style="padding: 30px;">
            <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
              Hola <strong>${assignee_name}</strong>,
            </p>
            
            <p style="color: #666; font-size: 16px; margin-bottom: 25px;">
              <strong>${assigner_name}</strong> te ha asignado una nueva tarea:
            </p>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid #1a1a1a; padding: 20px; border-radius: 4px; margin-bottom: 25px;">
              <h2 style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 20px;">
                ${task_title}
              </h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #666;">🎯 Prioridad:</td>
                  <td style="padding: 5px 0;">
                    <span style="background-color: ${task_priority === 'high' ? '#fee2e2' : task_priority === 'medium' ? '#fef3c7' : '#d1fae5'}; color: ${task_priority === 'high' ? '#dc2626' : task_priority === 'medium' ? '#d97706' : '#059669'}; padding: 2px 8px; border-radius: 4px; font-size: 14px; font-weight: 500;">
                      ${priorityLabel}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">📅 Fecha límite:</td>
                  <td style="padding: 5px 0; color: #1a1a1a; font-weight: 500;">${dueDateFormatted}</td>
                </tr>
                ${project_name ? `
                <tr>
                  <td style="padding: 5px 0; color: #666;">📁 Proyecto:</td>
                  <td style="padding: 5px 0; color: #1a1a1a; font-weight: 500;">${project_name}</td>
                </tr>
                ` : ''}
                ${client_name ? `
                <tr>
                  <td style="padding: 5px 0; color: #666;">🏢 Cliente:</td>
                  <td style="padding: 5px 0; color: #1a1a1a; font-weight: 500;">${client_name}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
              Inicia sesión en Chaos Tamer para ver los detalles completos.
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Este correo fue enviado automáticamente por Chaos Tamer.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Nomi <tareas@nomi.do>",
        to: [assignee_email],
        subject: `Nueva tarea asignada: ${task_title}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResponse = await res.json();
    console.log("Task assignment email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-task-assignment-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
