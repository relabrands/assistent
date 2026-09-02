// Content Management Types for Marketing Agency OS

export type ContentStatus = 'draft' | 'pending_review' | 'in_review' | 'approved' | 'requires_changes' | 'scheduled' | 'published';
export type ContentType = 'post' | 'story' | 'reel' | 'video' | 'ad' | 'event' | 'carousel' | 'other';
export type PlatformType = 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'youtube' | 'twitter' | 'pinterest' | 'other';

export interface Client {
  id: string;
  project_id: string;
  name: string;
  brand_name: string | null;
  logo_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_tiktok: string | null;
  social_linkedin: string | null;
  social_youtube: string | null;
  notes: string | null;
  services?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  client_id: string;
  project_id: string;
  title: string;
  content_type: ContentType;
  platform: PlatformType;
  status: ContentStatus;
  scheduled_date: string | null;
  published_date: string | null;
  copy: string | null;
  hashtags: string[] | null;
  cta: string | null;
  link: string | null;
  reference_urls: string[] | null;
  file_urls: string[] | null;
  thumbnail_url: string | null;
  assigned_to: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentComment {
  id: string;
  content_id: string;
  author_id: string;
  comment: string;
  is_approval_request: boolean;
  is_change_request: boolean;
  created_at: string;
}

export interface ClientAccess {
  id: string;
  client_id: string;
  user_id: string;
  granted_by: string;
  created_at: string;
}

export interface ProjectPlatform {
  id: string;
  project_id: string;
  platform: PlatformType;
  created_at: string;
}

// Labels for UI display
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Borrador',
  pending_review: 'Pendiente de revisión',
  in_review: 'En revisión',
  approved: 'Aprobado',
  requires_changes: 'Requiere cambios',
  scheduled: 'Programado',
  published: 'Publicado',
};

export const CONTENT_STATUS_COLORS: Record<ContentStatus, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  pending_review: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  in_review: { bg: 'bg-blue-100', text: 'text-blue-700' },
  approved: { bg: 'bg-green-100', text: 'text-green-700' },
  requires_changes: { bg: 'bg-orange-100', text: 'text-orange-700' },
  scheduled: { bg: 'bg-purple-100', text: 'text-purple-700' },
  published: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  post: 'Publicación',
  story: 'Historia',
  reel: 'Reel',
  video: 'Video',
  ad: 'Anuncio',
  event: 'Evento',
  carousel: 'Carrusel',
  other: 'Otro',
};

export const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  post: '📷',
  story: '📱',
  reel: '🎬',
  video: '🎥',
  ad: '📢',
  event: '📅',
  carousel: '🎠',
  other: '📄',
};

export const PLATFORM_LABELS: Record<PlatformType, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  twitter: 'Twitter',
  pinterest: 'Pinterest',
  other: 'Otro',
};

export const PLATFORM_COLORS: Record<PlatformType, { bg: string; text: string }> = {
  instagram: { bg: 'bg-pink-100', text: 'text-pink-700' },
  facebook: { bg: 'bg-blue-100', text: 'text-blue-700' },
  tiktok: { bg: 'bg-gray-900', text: 'text-white' },
  linkedin: { bg: 'bg-sky-100', text: 'text-sky-700' },
  youtube: { bg: 'bg-red-100', text: 'text-red-700' },
  twitter: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  pinterest: { bg: 'bg-rose-100', text: 'text-rose-700' },
  other: { bg: 'bg-gray-100', text: 'text-gray-700' },
};
