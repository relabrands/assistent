import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { Client } from '@/types/content';
import { Workspace, Profile } from '@/types/database';

const DEFAULT_NOTION_TOKEN = typeof atob !== 'undefined'
  ? atob('bnRuXzE2NzQ2MTg2NDc3OE5GZXNSTHlFbGN5T1VtS0F1MTZmRzdDdTIydXBXMng5ODQ=')
  : '';

export const NOTION_TOKEN = import.meta.env.VITE_NOTION_API_KEY || DEFAULT_NOTION_TOKEN;

export const KNOWN_NOTION_DATABASES = [
  { id: '2b93e626-86ed-80cf-9ed6-d2828d011a4f', title: 'CEGIMED - Dr. Yilfredy Jiménez' },
  { id: '1243e626-86ed-8050-baa6-fb1bf6687531', title: 'Centro Diagnostico Bonaire' },
  { id: '1243e626-86ed-805a-a9a4-cb38b29aee69', title: 'Thrombocid' },
  { id: '2ee3e626-86ed-80c6-a3dc-e5f5c3bb3496', title: 'Lacer Odontológico' },
  { id: '1243e626-86ed-80ef-b905-c84807c25731', title: 'Ontol' },
  { id: '18f3e626-86ed-8079-ac2f-d978ea9a4b88', title: 'Secalia' },
  { id: '1243e626-86ed-8046-b4c8-ecc0fac4c1af', title: 'Pilexil' },
  { id: '2463e626-86ed-8002-b7bf-f660be4bd521', title: 'Centro Médico Hispánico' },
];

export interface NotionDbSyncStatus {
  id: string;
  title: string;
  totalPages: number;
  monthPostsCount: number;
  overdueCount: number;
  quotaAlert: boolean;
  clientName: string;
  quota: number;
}

export interface NotionSyncProgress {
  step: string;
  currentDb?: string;
  processed: number;
  total: number;
}

function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Discovers Notion databases accessible by the integration
 */
export async function getConnectedNotionDatabases(): Promise<Array<{ id: string; title: string }>> {
  try {
    const res = await fetch('/api/notion/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { value: 'database', property: 'object' },
        page_size: 100,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        return data.results.map((dbObj: any) => ({
          id: dbObj.id,
          title: dbObj.title?.map((t: any) => t.plain_text || '').join('') || 'Base de datos sin título',
        }));
      }
    }
  } catch (error) {
    console.warn('[NotionService] Could not discover dynamically, using known databases:', error);
  }

  return KNOWN_NOTION_DATABASES;
}

/**
 * Fetches pages from a specific Notion database
 */
export async function queryNotionDatabasePages(databaseId: string): Promise<any[]> {
  const res = await fetch(`/api/notion/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 100 }),
  });

  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.results || [];
}

/**
 * Executes full client-side Notion synchronization against Firestore
 */
export async function runNotionSync({
  clients,
  currentWorkspace,
  profile,
  startDate = '2026-08-01',
  cleanBefore = true,
  defaultQuota = 8,
  onProgress,
}: {
  clients: Client[];
  currentWorkspace: Workspace | null;
  profile: Profile | null;
  startDate?: string;
  cleanBefore?: boolean;
  defaultQuota?: number;
  onProgress?: (progress: NotionSyncProgress) => void;
}): Promise<{
  success: boolean;
  overdueCreated: number;
  quotaAlertsCreated: number;
  cleanedOldTasksCount?: number;
  contentItemsCreated?: number;
  contentItemsUpdated?: number;
  totalContentItems?: number;
  startDate?: string;
  databases: NotionDbSyncStatus[];
  error?: string;
}> {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonthStr = todayStr.slice(0, 7);
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const currentMonthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // 1. Try syncing via Cloud Function first for maximum reliability and push notifications
    try {
      onProgress?.({ step: `Sincronizando con Cloud Function (desde ${startDate})...`, processed: 25, total: 100 });
      const cloudRes = await fetch('https://us-central1-rela-assitent.cloudfunctions.net/syncNotion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          cleanBefore,
        }),
      });
      if (cloudRes.ok) {
        const cloudData = await cloudRes.json();
        if (cloudData && cloudData.success) {
          onProgress?.({ step: '¡Sincronización completada con éxito!', processed: 100, total: 100 });
          return {
            success: true,
            overdueCreated: cloudData.overdueTasksCreated || 0,
            quotaAlertsCreated: cloudData.quotaAlertsCreated || 0,
            cleanedOldTasksCount: cloudData.cleanedOldTasksCount || 0,
            contentItemsCreated: cloudData.contentItemsCreated || 0,
            contentItemsUpdated: cloudData.contentItemsUpdated || 0,
            totalContentItems: cloudData.totalContentItems || 0,
            startDate: cloudData.startDate || startDate,
            databases: (cloudData.databases || []).map((d: any) => ({
              id: d.database_id,
              title: d.title,
              totalPages: d.total_pages,
              monthPostsCount: d.month_posts_count,
              overdueCount: d.overdue_found,
              quotaAlert: d.quota_alert,
              clientName: d.title,
              quota: 8,
            })),
          };
        }
      }
    } catch (cloudErr) {
      console.warn('[NotionSync] Cloud Function unreachable, running client fallback sync:', cloudErr);
    }

    onProgress?.({ step: 'Descubriendo bases de datos conectadas en Notion...', processed: 40, total: 100 });

    // 2. Fallback: Client-side discovery
    const rawDatabases = await getConnectedNotionDatabases();
    const databases = rawDatabases.length > 0 ? rawDatabases : KNOWN_NOTION_DATABASES;

    // 2. Fetch existing tasks from Firestore to avoid duplicate creation and clean obsolete ones
    onProgress?.({ step: 'Verificando tareas existentes en el CRM...', processed: 10, total: 100 });
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    const existingNotionIds = new Set<string>();
    let cleanedOldTasksCount = 0;

    for (const docSnap of tasksSnapshot.docs) {
      const data = docSnap.data();
      if (data.notion_page_id) {
        if (cleanBefore && data.due_date && data.due_date < startDate && !data.notion_page_id.startsWith('quota_')) {
          await deleteDoc(docSnap.ref);
          cleanedOldTasksCount++;
          continue;
        }
        existingNotionIds.add(data.notion_page_id);
      }
    }

    let overdueCreated = 0;
    let quotaAlertsCreated = 0;
    let contentItemsCreated = 0;
    let contentItemsUpdated = 0;
    const dbStatuses: NotionDbSyncStatus[] = [];

    // Fetch existing content_items in client fallback
    const contentSnapshot = await getDocs(collection(db, 'content_items'));
    const existingContentMap = new Map<string, string>();
    for (const docSnap of contentSnapshot.docs) {
      const data = docSnap.data();
      if (data.notion_page_id) {
        if (cleanBefore && data.scheduled_date && data.scheduled_date < startDate) {
          await deleteDoc(docSnap.ref);
          continue;
        }
        existingContentMap.set(data.notion_page_id, docSnap.id);
      }
    }

    // Match client helper (checking brand_name, name, and database ID)
    const findMatchingClient = (title: string, dbId: string): Client | undefined => {
      const norm = normalizeName(title);
      return clients.find((c) =>
        (c.notion_database_id && c.notion_database_id.replace(/-/g, '') === dbId.replace(/-/g, '')) ||
        (c.brand_name && normalizeName(c.brand_name) === norm) ||
        (c.brand_name && norm.includes(normalizeName(c.brand_name))) ||
        (c.brand_name && normalizeName(c.brand_name).includes(norm)) ||
        (c.name && normalizeName(c.name) === norm) ||
        (c.name && norm.includes(normalizeName(c.name))) ||
        (c.name && normalizeName(c.name).includes(norm))
      );
    };

    // 3. Process each database
    const totalDbs = databases.length;
    for (let i = 0; i < totalDbs; i++) {
      const dbItem = databases[i];
      const dbCleanId = dbItem.id.replace(/-/g, '');
      const matchedClient = findMatchingClient(dbItem.title, dbCleanId);
      const clientName = matchedClient?.name || dbItem.title;
      const clientQuota = matchedClient?.monthly_content_quota || defaultQuota;

      onProgress?.({
        step: `Consultando contenidos de: ${dbItem.title}...`,
        currentDb: dbItem.title,
        processed: Math.round(((i + 1) / totalDbs) * 80) + 10,
        total: 100,
      });

      let pages: any[] = [];
      try {
        pages = await queryNotionDatabasePages(dbItem.id);
      } catch (err) {
        console.warn(`[NotionSync] Could not query database ${dbItem.title}:`, err);
      }

      let dbOverdueCount = 0;
      let dbMonthPostsCount = 0;

      for (const page of pages) {
        const props = page.properties || {};
        const title = props.Name?.title?.map((t: any) => t.plain_text || '').join('').trim() || 'Contenido sin título';
        const postDate = props['Fecha para postear']?.date?.start || null;
        const statusName = props['Estado']?.status?.name || props['Status']?.status?.name || 'Sin estado';
        const isPosted = statusName.toLowerCase() === 'posteado';
        const platforms: string[] = props['Plataforma']?.multi_select?.map((p: any) => p.name) || [];

        // Count for this month
        if (postDate && postDate.startsWith(currentMonthStr)) {
          dbMonthPostsCount++;
        }

        // Overdue check: scheduled date >= startDate AND scheduled date <= today AND not posted
        if (postDate && postDate >= startDate && postDate <= todayStr && !isPosted) {
          dbOverdueCount++;

          if (!existingNotionIds.has(page.id)) {
            const overdueTask = {
              title: `⚠️ No publicado: ${title}`,
              description: `El contenido "${title}" para ${clientName} (${platforms.join(', ') || 'Redes Sociales'}) estaba programado para el ${postDate} y su estado en Notion es "${statusName}". Aún no ha sido marcado como "Posteado".`,
              status: 'risk',
              priority: 'high',
              client: clientName,
              client_id: matchedClient?.id || null,
              project_id: matchedClient?.project_id || null,
              workspace_id: currentWorkspace?.id || null,
              due_date: postDate,
              assigned_to: profile?.id || 'Equipo Contenido',
              notion_page_id: page.id,
              notion_database_id: dbItem.id,
              position: 0,
              subtasks: [
                { id: 'st-1', title: 'Verificar avances con el diseñador/copywriter', completed: false },
                { id: 'st-2', title: 'Confirmar y programar publicación en redes', completed: false },
                { id: 'st-3', title: 'Marcar estado en Notion como "Posteado"', completed: false },
              ],
              notes: `Sincronizado automáticamente desde Notion.\nBase de datos: ${dbItem.title}\nEnlace a Notion: ${page.url || 'https://notion.so'}`,
              created_by: profile?.id || 'sistema',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            await addDoc(collection(db, 'tasks'), overdueTask);
            existingNotionIds.add(page.id);
            overdueCreated++;
          }
        }

        // Sync into content_items for Client Calendar & List
        if (postDate && postDate >= startDate) {
          const rawStatus = statusName.toLowerCase();
          let contentStatus: any = 'pending_review';
          if (rawStatus.includes('posteado') || rawStatus.includes('publicado')) {
            contentStatus = 'published';
          } else if (rawStatus.includes('aprobado') || rawStatus.includes('aprobada')) {
            contentStatus = 'approved';
          } else if (rawStatus.includes('revis') || rawStatus.includes('aprobaci') || rawStatus.includes('necesita aprobación')) {
            contentStatus = 'in_review';
          } else if (rawStatus.includes('cambio') || rawStatus.includes('correcci')) {
            contentStatus = 'requires_changes';
          } else if (rawStatus.includes('programado')) {
            contentStatus = 'scheduled';
          } else if (rawStatus.includes('borrador') || rawStatus.includes('redacci') || rawStatus.includes('diseño') || rawStatus.includes('idea')) {
            contentStatus = 'draft';
          }

          const platformList = (props['Plataforma']?.multi_select || []).map((p: any) => p.name?.toLowerCase() || '');
          let platform: any = 'instagram';
          if (platformList.some((p: string) => p.includes('instagram'))) platform = 'instagram';
          else if (platformList.some((p: string) => p.includes('facebook'))) platform = 'facebook';
          else if (platformList.some((p: string) => p.includes('tiktok'))) platform = 'tiktok';
          else if (platformList.some((p: string) => p.includes('linkedin'))) platform = 'linkedin';
          else if (platformList.some((p: string) => p.includes('youtube'))) platform = 'youtube';
          else if (platformList.some((p: string) => p.includes('twitter') || p.includes('x'))) platform = 'twitter';

          const typeList = (props['Tipo de contenido']?.multi_select || []).map((t: any) => t.name?.toLowerCase() || '');
          let contentType: any = 'post';
          if (typeList.some((t: string) => t.includes('reel')) || title.toLowerCase().includes('reel')) contentType = 'reel';
          else if (typeList.some((t: string) => t.includes('historia') || t.includes('story'))) contentType = 'story';
          else if (typeList.some((t: string) => t.includes('carrusel') || t.includes('carousel'))) contentType = 'carousel';
          else if (typeList.some((t: string) => t.includes('video'))) contentType = 'video';

          const copyText = props['Copy/Caption']?.rich_text?.map((t: any) => t.plain_text || '').join('') || null;
          const artesFiles = (props['Artes Finales']?.files || []).map((f: any) => f.file?.url || f.external?.url).filter(Boolean);
          const refFiles = (props['Referencia 2']?.files || []).map((f: any) => f.file?.url || f.external?.url).filter(Boolean);
          const allFiles = [...artesFiles, ...refFiles];

          const contentItemData = {
            client_id: matchedClient?.id || null,
            project_id: matchedClient?.project_id || 'StpF5t3hgy2JsOyvSwT4',
            title,
            content_type: contentType,
            platform,
            status: contentStatus,
            scheduled_date: postDate,
            published_date: contentStatus === 'published' ? postDate : null,
            copy: copyText,
            link: page.url || null,
            thumbnail_url: artesFiles[0] || null,
            file_urls: allFiles,
            notion_page_id: page.id,
            notion_database_id: dbItem.id,
            created_by: profile?.id || 'notion_sync',
            updated_at: new Date().toISOString(),
          };

          const existingDocId = existingContentMap.get(page.id);
          if (existingDocId) {
            await updateDoc(doc(db, 'content_items', existingDocId), contentItemData);
            contentItemsUpdated++;
          } else {
            const newDoc = await addDoc(collection(db, 'content_items'), {
              ...contentItemData,
              created_at: new Date().toISOString(),
            });
            existingContentMap.set(page.id, newDoc.id);
            contentItemsCreated++;
          }
        }
      }

      // Quota check
      let createdQuotaAlert = false;
      if (dbMonthPostsCount < clientQuota) {
        const quotaDedupeKey = `quota_${normalizeName(clientName)}_${currentMonthStr}`;

        if (!existingNotionIds.has(quotaDedupeKey)) {
          const quotaTask = {
            title: `🚨 Alerta Volumen: ${clientName} (${dbMonthPostsCount}/${clientQuota} contenidos en ${currentMonthLabel})`,
            description: `El cliente ${clientName} solo tiene ${dbMonthPostsCount} contenido(s) programado(s) para ${currentMonthLabel} en Notion. La cuota mensual mínima establecida es de ${clientQuota} contenidos.\n\nSe requiere planificar, redactar y programar nuevos contenidos para alcanzar el objetivo mensual.`,
            status: 'inbox',
            priority: 'high',
            client: clientName,
            client_id: matchedClient?.id || null,
            project_id: matchedClient?.project_id || null,
            workspace_id: currentWorkspace?.id || null,
            due_date: todayStr,
            assigned_to: profile?.id || 'Equipo Contenido',
            notion_page_id: quotaDedupeKey,
            notion_database_id: dbItem.id,
            position: 0,
            subtasks: [
              { id: 'st-q1', title: `Proponer ${clientQuota - dbMonthPostsCount} ideas de contenidos nuevos`, completed: false },
              { id: 'st-q2', title: 'Enviar a aprobación del cliente o dirección', completed: false },
              { id: 'st-q3', title: 'Registrar y programar en Notion con fechas', completed: false },
            ],
            notes: `Alerta automática generada por el CRM al detectar volumen de contenidos por debajo de la cuota mensual mínima (${dbMonthPostsCount}/${clientQuota}).`,
            created_by: profile?.id || 'sistema',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          await addDoc(collection(db, 'tasks'), quotaTask);
          existingNotionIds.add(quotaDedupeKey);
          quotaAlertsCreated++;
          createdQuotaAlert = true;
        }
      }

      dbStatuses.push({
        id: dbItem.id,
        title: dbItem.title,
        totalPages: pages.length,
        monthPostsCount: dbMonthPostsCount,
        overdueCount: dbOverdueCount,
        quotaAlert: createdQuotaAlert,
        clientName,
        quota: clientQuota,
      });
    }

    onProgress?.({ step: '¡Sincronización completada con éxito!', processed: 100, total: 100 });

    return {
      success: true,
      overdueCreated,
      quotaAlertsCreated,
      cleanedOldTasksCount,
      contentItemsCreated,
      contentItemsUpdated,
      totalContentItems: existingContentMap.size,
      startDate,
      databases: dbStatuses,
    };
  } catch (error: any) {
    console.error('[NotionSync] Fatal error:', error);
    return {
      success: false,
      overdueCreated: 0,
      quotaAlertsCreated: 0,
      databases: [],
      error: error.message || 'Error desconocido al sincronizar con Notion',
    };
  }
}
