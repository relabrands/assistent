import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  token: string;
  appUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, workspaceName, inviterName, role, token, appUrl }: InvitationEmailRequest = await req.json();

    const inviteUrl = `${appUrl}?invite=${token}`;
    const roleText = role === 'admin' ? 'administrador' : 'colaborador';

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
                    <div style="text-align: center; margin-bottom: 32px;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a1a2e;">
                        Invitación al Workspace
                      </h1>
                    </div>
                    
                    <div style="margin-bottom: 32px;">
                      <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">
                        Hola,
                      </p>
                      <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">
                        <strong>${inviterName}</strong> te ha invitado a unirte al workspace <strong>"${workspaceName}"</strong> como <strong>${roleText}</strong>.
                      </p>
                      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                        Haz clic en el botón de abajo para registrarte y unirte al equipo:
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 32px;">
                      <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1a1a2e; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                        Registrarme y Unirme
                      </a>
                    </div>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                      <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280; text-align: center;">
                        Si ya tienes una cuenta, inicia sesión y encontrarás la invitación en tu panel.
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                        Este enlace expira en 7 días.
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

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Nomi <tareas@nomi.do>",
        to: [email],
        subject: `Te han invitado a unirte a ${workspaceName}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResponse = await res.json();
    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
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
