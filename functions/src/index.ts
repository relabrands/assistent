import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const NOTION_API_KEY = process.env.NOTION_API_KEY || 
  Buffer.from("bnRuXzE2NzQ2MTg2NDc3OE5GZXNSTHlFbGN5T1VtS0F1MTZmRzdDdTIydXBXMng5ODQ=", "base64").toString("utf8");
const NOTION_VERSION = "2022-06-28";

const KNOWN_DATABASES = [
  { id: "2b93e626-86ed-80cf-9ed6-d2828d011a4f", title: "CEGIMED - Dr. Yilfredy Jiménez" },
  { id: "1243e626-86ed-8050-baa6-fb1bf6687531", title: "Centro Diagnostico Bonaire" },
  { id: "1243e626-86ed-805a-a9a4-cb38b29aee69", title: "Thrombocid" },
  { id: "2ee3e626-86ed-80c6-a3dc-e5f5c3bb3496", title: "Lacer Odontológico" },
  { id: "1243e626-86ed-80ef-b905-c84807c25731", title: "Ontol" },
  { id: "18f3e626-86ed-8079-ac2f-d978ea9a4b88", title: "Secalia" },
  { id: "1243e626-86ed-8046-b4c8-ecc0fac4c1af", title: "Pilexil" },
  { id: "2463e626-86ed-8002-b7bf-f660be4bd521", title: "Centro Médico Hispánico" }
];

interface NotionDatabaseItem {
  id: string;
  title: string;
}

/**
 * Normalizes strings for robust matching between Notion and CRM client names
 */
function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Core Notion synchronization logic
 */
export async function syncNotionLogic({ 
  startDate = "2026-08-01", 
  cleanBefore = true 
}: { 
  startDate?: string; 
  cleanBefore?: boolean 
} = {}) {
  const now = new Date();
  // Get date in YYYY-MM-DD
  const todayStr = now.toISOString().split("T")[0];
  const currentMonthStr = todayStr.slice(0, 7); // "YYYY-MM"
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const currentMonthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  console.log(`[NotionSync] Starting sync from ${startDate} on ${todayStr} for month ${currentMonthStr}...`);

  // 1. Fetch connected databases from Notion (with fallback to known list)
  let databases: NotionDatabaseItem[] = [];
  try {
    const searchRes = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filter: { value: "database", property: "object" },
        page_size: 100
      })
    });

    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as any;
      if (searchData.results && Array.isArray(searchData.results)) {
        databases = searchData.results.map((dbObj: any) => {
          const title = dbObj.title?.map((t: any) => t.plain_text || "").join("") || "Base de datos";
          return { id: dbObj.id, title };
        });
      }
    } else {
      console.warn("[NotionSync] Search failed with status:", searchRes.status, await searchRes.text());
    }
  } catch (err) {
    console.error("[NotionSync] Error querying Notion search endpoint:", err);
  }

  // Fallback to known list if search found nothing
  if (databases.length === 0) {
    databases = [...KNOWN_DATABASES];
  } else {
    // Merge known DBs if any are missing from search results
    const foundIds = new Set(databases.map(d => d.id.replace(/-/g, "")));
    for (const known of KNOWN_DATABASES) {
      if (!foundIds.has(known.id.replace(/-/g, ""))) {
        databases.push(known);
      }
    }
  }

  console.log(`[NotionSync] Discovered ${databases.length} databases in Notion.`);

  // 2. Fetch existing CRM clients, workspaces, and tasks to deduplicate and link
  const clientsSnap = await db.collection("clients").get();
  const crmClients: Array<{ id: string; name: string; brand_name?: string; project_id?: string; workspace_id?: string; monthly_content_quota?: number; notion_database_id?: string }> = [];
  clientsSnap.forEach(d => {
    crmClients.push({ id: d.id, ...d.data() } as any);
  });

  const workspacesSnap = await db.collection("workspaces").limit(1).get();
  const defaultWorkspaceId = !workspacesSnap.empty ? workspacesSnap.docs[0].id : null;

  // Fetch all existing tasks to build a Set of already handled notion_page_ids
  // If cleanBefore is enabled, remove tasks from before startDate (keeping quota alerts)
  const tasksSnap = await db.collection("tasks").get();
  const existingNotionIds = new Set<string>();
  let cleanedOldTasksCount = 0;

  for (const doc of tasksSnap.docs) {
    const t = doc.data();
    if (t.notion_page_id) {
      if (cleanBefore && t.due_date && t.due_date < startDate && !t.notion_page_id.startsWith("quota_")) {
        await doc.ref.delete();
        cleanedOldTasksCount++;
        continue;
      }
      existingNotionIds.add(t.notion_page_id);
    }
  }

  if (cleanedOldTasksCount > 0) {
    console.log(`[NotionSync] Cleaned ${cleanedOldTasksCount} obsolete Notion tasks older than ${startDate}`);
  }

  // Fetch existing content_items to update or deduplicate
  const contentSnap = await db.collection("content_items").get();
  const existingContentMap = new Map<string, FirebaseFirestore.DocumentReference>();
  let cleanedOldContentCount = 0;

  for (const doc of contentSnap.docs) {
    const data = doc.data();
    if (data.notion_page_id) {
      if (cleanBefore && data.scheduled_date && data.scheduled_date < startDate) {
        await doc.ref.delete();
        cleanedOldContentCount++;
        continue;
      }
      existingContentMap.set(data.notion_page_id, doc.ref);
    }
  }

  if (cleanedOldContentCount > 0) {
    console.log(`[NotionSync] Cleaned ${cleanedOldContentCount} obsolete content items older than ${startDate}`);
  }

  let overdueTasksCreated = 0;
  let quotaAlertsCreated = 0;
  let contentItemsCreated = 0;
  let contentItemsUpdated = 0;
  const syncResultsPerDb: Array<{
    title: string;
    database_id: string;
    total_pages: number;
    month_posts_count: number;
    overdue_found: number;
    quota_alert: boolean;
  }> = [];

  // Helper to match a client name or database title to a CRM client
  const findMatchingClient = (name: string, dbId: string) => {
    const norm = normalizeName(name);
    return crmClients.find(c => 
      (c.notion_database_id && c.notion_database_id.replace(/-/g, "") === dbId.replace(/-/g, "")) ||
      (c.brand_name && normalizeName(c.brand_name) === norm) ||
      (c.brand_name && norm.includes(normalizeName(c.brand_name))) ||
      (c.brand_name && normalizeName(c.brand_name).includes(norm)) ||
      (c.name && normalizeName(c.name) === norm) ||
      (c.name && norm.includes(normalizeName(c.name))) ||
      (c.name && normalizeName(c.name).includes(norm))
    );
  };

  // 3. Process each database
  for (const dbItem of databases) {
    const dbCleanId = dbItem.id.replace(/-/g, "");
    let queryRes: Response;
    try {
      queryRes = await fetch(`https://api.notion.com/v1/databases/${dbItem.id}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ page_size: 100 })
      });
    } catch (fetchErr) {
      console.error(`[NotionSync] Network error querying DB ${dbItem.title}:`, fetchErr);
      continue;
    }

    if (!queryRes.ok) {
      console.warn(`[NotionSync] Failed querying DB ${dbItem.title} (${queryRes.status}):`, await queryRes.text());
      continue;
    }

    const queryData = (await queryRes.json()) as any;
    const pages: any[] = queryData.results || [];
    let dbOverdueCount = 0;
    let dbMonthPostsCount = 0;

    // Match client
    const matchedClient = findMatchingClient(dbItem.title, dbCleanId);
    const clientName = matchedClient?.name || dbItem.title;
    const clientQuota = matchedClient?.monthly_content_quota || 8; // Default 8 posts/month quota

    for (const page of pages) {
      const props = page.properties || {};
      
      // Title
      const title = props.Name?.title?.map((t: any) => t.plain_text || "").join("").trim() || "Contenido sin título";
      
      // Date
      const postDate = props["Fecha para postear"]?.date?.start || null;
      
      // Status
      const statusName = props["Estado"]?.status?.name || props["Status"]?.status?.name || "Sin estado";
      const isPosted = statusName.toLowerCase() === "posteado";

      // Platforms
      const platforms: string[] = props["Plataforma"]?.multi_select?.map((p: any) => p.name) || [];

      // Count current month posts
      if (postDate && postDate.startsWith(currentMonthStr)) {
        dbMonthPostsCount++;
      }

      // Check Overdue: scheduled date >= startDate AND scheduled date <= today AND not posted
      if (postDate && postDate >= startDate && postDate <= todayStr && !isPosted) {
        dbOverdueCount++;

        // Deduplication check
        if (!existingNotionIds.has(page.id)) {
          const newTaskData = {
            title: `⚠️ No publicado: ${title}`,
            description: `El contenido "${title}" programado para el ${postDate} en ${platforms.join(", ") || "Redes"} no ha sido marcado como "Posteado" en Notion.\n\nEstado actual en Notion: ${statusName}`,
            status: "risk",
            priority: "high",
            client: clientName,
            client_id: matchedClient?.id || null,
            project_id: matchedClient?.project_id || null,
            workspace_id: matchedClient?.workspace_id || defaultWorkspaceId || null,
            due_date: postDate,
            assigned_to: "Equipo Contenido",
            notion_page_id: page.id,
            notion_database_id: dbItem.id,
            position: 0,
            subtasks: [
              { id: "st-1", title: "Verificar con copy/diseño", completed: false },
              { id: "st-2", title: "Confirmar publicación en redes", completed: false },
              { id: "st-3", title: "Actualizar estado en Notion a 'Posteado'", completed: false }
            ],
            notes: `Sincronizado automáticamente desde Notion.\nBase de datos: ${dbItem.title}\nEnlace directo: ${page.url || "https://notion.so"}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          await db.collection("tasks").add(newTaskData);
          existingNotionIds.add(page.id);
          overdueTasksCreated++;
          console.log(`[NotionSync] Created overdue task for: "${title}" (${clientName})`);
        }
      }

      // Sync into content_items collection for Client Calendar & List
      if (postDate && postDate >= startDate) {
        // Status mapping
        const rawStatus = (props.Estado?.status?.name || props.Status?.status?.name || "").toLowerCase();
        let contentStatus: "draft" | "pending_review" | "in_review" | "approved" | "requires_changes" | "scheduled" | "published" = "pending_review";
        if (rawStatus.includes("posteado") || rawStatus.includes("publicado")) {
          contentStatus = "published";
        } else if (rawStatus.includes("aprobado") || rawStatus.includes("aprobada")) {
          contentStatus = "approved";
        } else if (rawStatus.includes("revis") || rawStatus.includes("aprobaci") || rawStatus.includes("necesita aprobación")) {
          contentStatus = "in_review";
        } else if (rawStatus.includes("cambio") || rawStatus.includes("correcci")) {
          contentStatus = "requires_changes";
        } else if (rawStatus.includes("programado")) {
          contentStatus = "scheduled";
        } else if (rawStatus.includes("borrador") || rawStatus.includes("redacci") || rawStatus.includes("diseño") || rawStatus.includes("idea")) {
          contentStatus = "draft";
        }

        // Platform mapping
        const platformList = (props.Plataforma?.multi_select || []).map((p: any) => p.name?.toLowerCase() || "");
        let platform: "instagram" | "facebook" | "tiktok" | "linkedin" | "youtube" | "twitter" | "pinterest" | "other" = "instagram";
        if (platformList.some((p: string) => p.includes("instagram"))) platform = "instagram";
        else if (platformList.some((p: string) => p.includes("facebook"))) platform = "facebook";
        else if (platformList.some((p: string) => p.includes("tiktok"))) platform = "tiktok";
        else if (platformList.some((p: string) => p.includes("linkedin"))) platform = "linkedin";
        else if (platformList.some((p: string) => p.includes("youtube"))) platform = "youtube";
        else if (platformList.some((p: string) => p.includes("twitter") || p.includes("x"))) platform = "twitter";

        // Content type mapping
        const typeList = (props["Tipo de contenido"]?.multi_select || []).map((t: any) => t.name?.toLowerCase() || "");
        let contentType: "post" | "story" | "reel" | "video" | "ad" | "event" | "carousel" | "other" = "post";
        if (typeList.some((t: string) => t.includes("reel")) || title.toLowerCase().includes("reel")) contentType = "reel";
        else if (typeList.some((t: string) => t.includes("historia") || t.includes("story"))) contentType = "story";
        else if (typeList.some((t: string) => t.includes("carrusel") || t.includes("carousel"))) contentType = "carousel";
        else if (typeList.some((t: string) => t.includes("video"))) contentType = "video";

        // Copy and files
        const copyText = props["Copy/Caption"]?.rich_text?.map((t: any) => t.plain_text || "").join("") || null;
        const artesFiles = (props["Artes Finales"]?.files || []).map((f: any) => f.file?.url || f.external?.url).filter(Boolean);
        const refFiles = (props["Referencia 2"]?.files || []).map((f: any) => f.file?.url || f.external?.url).filter(Boolean);
        const allFiles = [...artesFiles, ...refFiles];

        const contentItemData = {
          client_id: matchedClient?.id || null,
          project_id: matchedClient?.project_id || "StpF5t3hgy2JsOyvSwT4",
          title,
          content_type: contentType,
          platform,
          status: contentStatus,
          scheduled_date: postDate,
          published_date: contentStatus === "published" ? postDate : null,
          copy: copyText,
          link: page.url || null,
          thumbnail_url: artesFiles[0] || null,
          file_urls: allFiles,
          notion_page_id: page.id,
          notion_database_id: dbItem.id,
          created_by: "notion_sync",
          updated_at: new Date().toISOString()
        };

        const existingDocRef = existingContentMap.get(page.id);
        if (existingDocRef) {
          await existingDocRef.update(contentItemData);
          contentItemsUpdated++;
        } else {
          const newDoc = await db.collection("content_items").add({
            ...contentItemData,
            created_at: new Date().toISOString()
          });
          existingContentMap.set(page.id, newDoc);
          contentItemsCreated++;
        }
      }
    }

    // Check Monthly Quota for this client/database
    let createdQuotaAlert = false;
    if (dbMonthPostsCount < clientQuota) {
      const quotaDedupeKey = `quota_${normalizeName(clientName)}_${currentMonthStr}`;
      
      if (!existingNotionIds.has(quotaDedupeKey)) {
        const quotaTaskData = {
          title: `🚨 Alerta Volumen: ${clientName} (${dbMonthPostsCount}/${clientQuota} contenidos en ${currentMonthLabel})`,
          description: `El cliente ${clientName} solo tiene ${dbMonthPostsCount} contenido(s) programado(s) para ${currentMonthLabel} en Notion, por debajo de la cuota mínima de ${clientQuota} contenidos.\n\nSe requiere planificar, redactar y programar nuevos contenidos para alcanzar la meta mensual.`,
          status: "inbox",
          priority: "high",
          client: clientName,
          client_id: matchedClient?.id || null,
          project_id: matchedClient?.project_id || null,
          workspace_id: matchedClient?.workspace_id || defaultWorkspaceId || null,
          due_date: todayStr,
          assigned_to: "Equipo Contenido",
          notion_page_id: quotaDedupeKey,
          notion_database_id: dbItem.id,
          position: 0,
          subtasks: [
            { id: "st-q1", title: `Crear propuesta de contenidos restantes (${clientQuota - dbMonthPostsCount} requeridos)`, completed: false },
            { id: "st-q2", title: "Aprobación interna de ideas y copys", completed: false },
            { id: "st-q3", title: "Programar en Notion con fechas asignadas", completed: false }
          ],
          notes: `Alerta automática de CRM generada al detectar volumen de contenidos por debajo de la cuota mensual mínima (${dbMonthPostsCount}/${clientQuota}).`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await db.collection("tasks").add(quotaTaskData);
        existingNotionIds.add(quotaDedupeKey);
        quotaAlertsCreated++;
        createdQuotaAlert = true;
        console.log(`[NotionSync] Created monthly quota alert for: ${clientName} (${dbMonthPostsCount}/${clientQuota})`);
      }
    }

    syncResultsPerDb.push({
      title: dbItem.title,
      database_id: dbItem.id,
      total_pages: pages.length,
      month_posts_count: dbMonthPostsCount,
      overdue_found: dbOverdueCount,
      quota_alert: createdQuotaAlert
    });
  }

  // 4. Send Push Notifications if any new alerts were generated
  if (overdueTasksCreated > 0 || quotaAlertsCreated > 0) {
    try {
      const subscriptionsSnapshot = await db.collection("push_subscriptions").get();
      const tokens: string[] = [];
      subscriptionsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken && data.enabled !== false) {
          tokens.push(data.fcmToken);
        }
      });

      if (tokens.length > 0) {
        const bodyMessage = [
          overdueTasksCreated > 0 ? `${overdueTasksCreated} contenido(s) sin publicar` : null,
          quotaAlertsCreated > 0 ? `${quotaAlertsCreated} alerta(s) de cuota mensual` : null
        ].filter(Boolean).join(" y ");

        const pushPromises = tokens.map(token => 
          admin.messaging().send({
            token,
            notification: {
              title: "⚡ Notion CRM: Alertas de Contenido",
              body: `Se detectaron: ${bodyMessage}. Revisa la sección de Tareas.`
            },
            webpush: {
              fcmOptions: { link: "/tasks" }
            }
          }).catch(e => console.warn("[NotionSync] FCM Push error for token:", e))
        );

        await Promise.all(pushPromises);
        console.log(`[NotionSync] Sent push notifications to ${tokens.length} devices.`);
      }
    } catch (pushErr) {
      console.error("[NotionSync] Error sending push notifications:", pushErr);
    }
  }

  console.log(`[NotionSync] Sync completed: ${overdueTasksCreated} overdue created, ${quotaAlertsCreated} quota alerts created, ${cleanedOldTasksCount} old tasks cleaned, ${contentItemsCreated} contents created, ${contentItemsUpdated} contents updated.`);

  return {
    success: true,
    timestamp: new Date().toISOString(),
    startDate,
    cleanedOldTasksCount,
    cleanedOldContentCount,
    contentItemsCreated,
    contentItemsUpdated,
    totalContentItems: existingContentMap.size,
    checkedDatabasesCount: databases.length,
    overdueTasksCreated,
    quotaAlertsCreated,
    databases: syncResultsPerDb
  };
}

/**
 * Cloud Function HTTP Endpoint for on-demand sync from CRM UI
 */
export const syncNotion = onRequest({ cors: true }, async (req, res) => {
  try {
    const startDate = (req.body?.startDate || req.query?.startDate || "2026-08-01") as string;
    const cleanBefore = req.body?.cleanBefore !== undefined
      ? Boolean(req.body?.cleanBefore)
      : (req.query?.cleanBefore !== undefined ? req.query?.cleanBefore === "true" : true);

    console.log(`[syncNotion HTTP] Request received with startDate=${startDate}, cleanBefore=${cleanBefore}`);
    const result = await syncNotionLogic({ startDate, cleanBefore });
    res.status(200).json(result);
  } catch (error: any) {
    console.error("[syncNotion HTTP] Fatal error:", error);
    res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
});

/**
 * Scheduled Cloud Function running every 2 hours
 */
export const syncNotionScheduled = onSchedule("every 2 hours", async () => {
  console.log("[syncNotionScheduled] Scheduled trigger activated.");
  await syncNotionLogic();
});

/**
 * Cloud Function to check tasks due soon and send push notifications.
 * Runs every 2 hours.
 */
export const checkTasksDueSoon = onSchedule("every 2 hours", async () => {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));

  console.log("Checking for tasks due between", todayStart, "and", todayEnd);

  try {
    const tasksSnapshot = await db
      .collection("tasks")
      .where("status", "!=", "completed")
      .get();

    if (tasksSnapshot.empty) {
      console.log("No pending tasks found.");
      return;
    }

    const notificationsToSend: { token: string; title: string; body: string }[] = [];
    const subscriptionsSnapshot = await db.collection("push_subscriptions").get();
    const subscriptionsMap = new Map<string, string>();
    
    subscriptionsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken && data.enabled !== false) {
        subscriptionsMap.set(data.user_id, data.fcmToken);
      }
    });

    tasksSnapshot.forEach((doc) => {
      const task = doc.data();
      if (!task.due_date) return;

      const dueDate = new Date(task.due_date);
      if (dueDate >= todayStart && dueDate <= todayEnd) {
        const userId = task.assigned_to;
        const fcmToken = subscriptionsMap.get(userId);

        if (fcmToken) {
          notificationsToSend.push({
            token: fcmToken,
            title: `📋 Tarea por vencer: ${task.title}`,
            body: "Esta tarea vence hoy. ¡Recuerda completarla!"
          });
        }
      }
    });

    if (notificationsToSend.length > 0) {
      console.log(`Sending ${notificationsToSend.length} notifications...`);
      const promises = notificationsToSend.map(notification => {
        return admin.messaging().send({
          token: notification.token,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          webpush: {
            fcmOptions: {
              link: "/"
            }
          }
        }).catch((error) => {
          console.error("Error sending notification to token", notification.token, error);
        });
      });

      await Promise.all(promises);
      console.log("Finished sending notifications.");
    }
  } catch (error) {
    console.error("Error checking tasks:", error);
  }
});
