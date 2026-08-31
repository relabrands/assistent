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

interface InviteClientRequest {
  email: string;
  clientId: string;
  clientName: string;
  inviterProfileId: string;
  inviterName: string;
  appUrl: string;
  role?: 'viewer' | 'approver';
}

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, clientId, clientName, inviterProfileId, inviterName, appUrl, role = 'viewer' }: InviteClientRequest = await req.json();
    
    console.log("Inviting client:", { email, clientId, clientName, inviterName, role });

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('email', email)
      .maybeSingle();

    let userId: string;
    let profileId: string;
    let temporaryPassword: string | null = null;
    let isNewUser = false;

    if (existingProfile) {
      // User already exists, just grant access
      profileId = existingProfile.id;
      userId = existingProfile.user_id;
      console.log("User already exists, granting access:", profileId);
    } else {
      // Create new user with temporary password
      temporaryPassword = generateTemporaryPassword();
      isNewUser = true;
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          display_name: clientName,
        },
      });

      if (authError) {
        console.error("Error creating user:", authError);
        throw new Error(`Failed to create user: ${authError.message}`);
      }

      userId = authData.user.id;
      console.log("Created new user:", userId);

      // Wait a moment for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the profile that was created by trigger
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profileError || !newProfile) {
        console.error("Error fetching new profile:", profileError);
        throw new Error("Failed to get user profile");
      }

      profileId = newProfile.id;
    }

    // Check if access already exists
    const { data: existingAccess } = await supabase
      .from('client_access')
      .select('id')
      .eq('user_id', profileId)
      .eq('client_id', clientId)
      .maybeSingle();

    if (existingAccess) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Este usuario ya tiene acceso a este cliente" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Grant client access with role
    const { error: accessError } = await supabase
      .from('client_access')
      .insert({
        user_id: profileId,
        client_id: clientId,
        granted_by: inviterProfileId,
        role: role,
      });

    if (accessError) {
      console.error("Error granting access:", accessError);
      throw new Error(`Failed to grant access: ${accessError.message}`);
    }

    console.log("Access granted successfully");

    // Send email notification
    const portalUrl = `${appUrl}/portal`;
    
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
                      <div style="width: 64px; height: 64px; border-radius: 16px; background-color: #6366f1; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="font-size: 28px;">🏢</span>
                      </div>
                      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #1a1a2e;">
                        Acceso al Portal de Clientes
                      </h1>
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        ${clientName}
                      </p>
                    </div>
                    
                    <div style="margin-bottom: 32px;">
                      <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">
                        Hola,
                      </p>
                      <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #374151;">
                        <strong>${inviterName}</strong> te ha dado acceso al portal de clientes para revisar y aprobar contenidos de <strong>${clientName}</strong>.
                      </p>
                    </div>
                    
                    ${isNewUser ? `
                      <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #166534;">
                          Tus credenciales de acceso:
                        </p>
                        <p style="margin: 0 0 8px; font-size: 14px; color: #166534;">
                          <strong>Email:</strong> ${email}
                        </p>
                        <p style="margin: 0; font-size: 14px; color: #166534;">
                          <strong>Contraseña temporal:</strong> ${temporaryPassword}
                        </p>
                      </div>
                      <p style="margin: 0 0 24px; font-size: 14px; color: #dc2626; text-align: center;">
                        ⚠️ Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión.
                      </p>
                    ` : `
                      <div style="background-color: #eff6ff; border: 1px solid #93c5fd; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 14px; color: #1e40af;">
                          Ya tienes una cuenta. Inicia sesión con tu email <strong>${email}</strong> para acceder.
                        </p>
                      </div>
                    `}
                    
                    <div style="text-align: center; margin-bottom: 32px;">
                      <a href="${portalUrl}" style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                        Ir al Portal de Clientes
                      </a>
                    </div>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                      <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                        Desde el portal podrás revisar, aprobar o solicitar cambios en tus contenidos.
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
        subject: `Acceso al portal de ${clientName}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      // Don't throw here - access was already granted
    } else {
      const emailResponse = await res.json();
      console.log("Invitation email sent successfully:", emailResponse);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      isNewUser,
      profileId,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in invite-client function:", error);
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
