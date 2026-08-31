import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContentNotificationRequest {
  contentId: string;
  action: 'approved' | 'changes_requested';
  clientName: string;
  contentTitle: string;
  comment?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentId, action, clientName, contentTitle, comment }: ContentNotificationRequest = await req.json();
    
    console.log("Sending content notification:", { contentId, action, clientName, contentTitle });

    // Get supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get content details with project owner
    const { data: content, error: contentError } = await supabase
      .from('content_items')
      .select(`
        *,
        project:projects!content_items_project_id_fkey(
          id,
          name,
          owner_id
        )
      `)
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      console.error("Error fetching content:", contentError);
      throw new Error("Content not found");
    }

    // Get project owner email
    const { data: ownerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, display_name')
      .eq('id', content.project.owner_id)
      .single();

    if (profileError || !ownerProfile?.email) {
      console.error("Error fetching owner profile:", profileError);
      throw new Error("Owner email not found");
    }

    // Get assigned user email if exists
    let assigneeEmail = null;
    if (content.assigned_to) {
      const { data: assigneeProfile } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', content.assigned_to)
        .single();
      
      if (assigneeProfile?.email) {
        assigneeEmail = assigneeProfile.email;
      }
    }

    const isApproved = action === 'approved';
    const actionText = isApproved ? 'aprobado' : 'solicitado cambios en';
    const actionColor = isApproved ? '#10b981' : '#f59e0b';
    const actionIcon = isApproved ? '✓' : '⚠️';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #faf9f7;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 500px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                <tr>
                  <td style="padding: 40px 32px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="width: 48px; height: 48px; border-radius: 50%; background-color: ${actionColor}20; display: inline-flex; align-items: center; justify-content: center; font-size: 24px;">
                        ${actionIcon}
                      </div>
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 32px;">
                      <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #1a1a2e;">
                        Contenido ${isApproved ? 'Aprobado' : 'Con Cambios Solicitados'}
                      </h1>
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        ${content.project.name}
                      </p>
                    </div>
                    
                    <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                        Contenido
                      </p>
                      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a2e;">
                        ${contentTitle}
                      </p>
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                      <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">
                        <strong>${clientName}</strong> ha ${actionText} el contenido.
                      </p>
                      ${comment ? `
                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0;">
                          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #92400e;">
                            Comentario del cliente:
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #78350f;">
                            "${comment}"
                          </p>
                        </div>
                      ` : ''}
                    </div>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                      <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
                        ${isApproved 
                          ? 'El contenido está listo para ser programado o publicado.' 
                          : 'Por favor revisa los cambios solicitados y actualiza el contenido.'}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <div style="margin-top: 24px; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: #9ca3af;">
                  Enviado desde Chaos Tamer
                </p>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Build recipient list
    const recipients = [ownerProfile.email];
    if (assigneeEmail && assigneeEmail !== ownerProfile.email) {
      recipients.push(assigneeEmail);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Nomi <tareas@nomi.do>",
        to: recipients,
        subject: `${isApproved ? '✓' : '⚠️'} ${clientName} ha ${actionText} "${contentTitle}"`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResponse = await res.json();
    console.log("Content notification sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-content-notification function:", error);
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
