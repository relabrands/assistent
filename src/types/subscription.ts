import { Project, Profile } from './database';

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'trial';

export type SubscriptionBillingCycle = 'monthly' | 'yearly' | 'quarterly' | 'weekly' | 'one_time';

export type SubscriptionCurrency = 'USD' | 'DOP' | 'EUR';

export type SubscriptionCategory = 
  | 'software'
  | 'ai'
  | 'design'
  | 'infra'
  | 'marketing'
  | 'productivity'
  | 'entertainment'
  | 'other';

export interface Subscription {
  id: string;
  name: string;
  description?: string | null;
  cost: number;
  currency: SubscriptionCurrency;
  billing_cycle: SubscriptionBillingCycle;
  payment_day?: number | null; // 1 to 31
  next_payment_date?: string | null; // YYYY-MM-DD
  status: SubscriptionStatus;
  category: SubscriptionCategory;
  payment_method?: string | null; // e.g. "Visa Banco Popular *1234", "PayPal"
  owner_id?: string | null; // Profile ID
  owner_name?: string | null; // Profile display name or custom name
  project_id?: string | null; // Project ID
  client_id?: string | null; // Optional client reference
  website_url?: string | null;
  login_email?: string | null;
  auto_renew?: boolean;
  notes?: string | null;
  workspace_id?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPreset {
  name: string;
  category: SubscriptionCategory;
  defaultCurrency: SubscriptionCurrency;
  defaultBillingCycle: SubscriptionBillingCycle;
  color: string;
  iconName: string;
  websiteUrl?: string;
}

export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = [
  { name: 'ChatGPT Plus', category: 'ai', defaultCurrency: 'USD', defaultBillingCycle: 'monthly', color: '#10a37f', iconName: 'Bot', websiteUrl: 'https://chatgpt.com' },
  { name: 'Claude Pro', category: 'ai', defaultCurrency: 'USD', defaultBillingCycle: 'monthly', color: '#cc785c', iconName: 'Sparkles', websiteUrl: 'https://claude.ai' },
  { name: 'Midjourney', category: 'ai', defaultCurrency: 'USD', defaultBillingCycle: 'monthly', color: '#5865f2', iconName: 'Image', websiteUrl: 'https://midjourney.com' },
  { name: 'Figma', category: 'design', defaultCurrency: 'USD', defaultBillingCycle: 'monthly', color: '#a259ff', iconName: 'Figma', websiteUrl: 'https://figma.com' },
  { name: 'Adobe Creative Cloud', category: 'design', defaultCurrency: 'USD', defaultBillingCycle: 'monthly', color: '#ff0000', iconName: 'Palette', websiteUrl: 'https://adobe.com' },
  { name: 'Canva Pro', category: 'design', defaultCurrency: 'USD', defaultBillingCycle: 'monthly', color: '#00c4cc', iconName: 'Crown', websiteUrl: 'https://canva.com' },
  { name: 'Google Workspace', category: 'productivity', defaultCurrency: 'USD', defaultBillingCycle: 'monthly', color: '#4285f4', iconName: 'Mail', websiteUrl: 'https://workspace.google.com' },
  { name: 'Notion', category: 'productivity', defaultCurrency: 'USD', defaultBillingCycle: 'monthly', color: '#000000', iconName: 'FileText', websiteUrl: 'https://notion.so' },
  { name: 'GitHub Copilot', category: 'software', defaultCurrency: 'USD', defaultBillingCycle: 'monthly', color: '#24292e', iconName: 'Code', websiteUrl: 'https://github.com' },
  { name: 'Vercel Pro', category: 'infra', defaultCurrency: 'USD', defaultBillingCycle: 'monthly', color: '#000000', iconName: 'Server', websiteUrl: 'https://vercel.com' },
  { name: 'Supabase Pro', category: 'infra', defaultCurrency: 'USD', defaultBillingCycle: 'monthly', color: '#3ecf8e', iconName: 'Database', websiteUrl: 'https://supabase.com' },
  { name: 'Spotify Premium', category: 'entertainment', defaultCurrency: 'USD', defaultBillingCycle: 'monthly', color: '#1db954', iconName: 'Music', websiteUrl: 'https://spotify.com' },
];

export const CATEGORY_CONFIG: Record<SubscriptionCategory, { label: string; color: string; bg: string; border: string }> = {
  software: { label: 'Software / SaaS', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  ai: { label: 'Inteligencia Artificial', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  design: { label: 'Diseño y Creatividad', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  infra: { label: 'Cloud / Hosting', color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  marketing: { label: 'Marketing & Ads', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  productivity: { label: 'Productividad', color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  entertainment: { label: 'Entretenimiento', color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  other: { label: 'Otro', color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border' },
};

export const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: 'Activa', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  trial: { label: 'Prueba', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  paused: { label: 'Pausada', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  cancelled: { label: 'Cancelada', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
};

export const BILLING_CYCLE_LABELS: Record<SubscriptionBillingCycle, string> = {
  monthly: 'Mensual',
  yearly: 'Anual',
  quarterly: 'Trimestral',
  weekly: 'Semanal',
  one_time: 'Pago único',
};

/**
 * Calculates monthly equivalent cost for a subscription.
 */
export function getMonthlyEquivalentCost(sub: { cost: number; billing_cycle: SubscriptionBillingCycle }): number {
  switch (sub.billing_cycle) {
    case 'yearly':
      return sub.cost / 12;
    case 'quarterly':
      return sub.cost / 3;
    case 'weekly':
      return sub.cost * 4.33;
    case 'one_time':
      return 0;
    case 'monthly':
    default:
      return sub.cost;
  }
}

/**
 * Calculates days remaining until the next payment date or payment day of current month.
 */
export function getDaysUntilRenewal(sub: { next_payment_date?: string | null; payment_day?: number | null }): number | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (sub.next_payment_date) {
    const target = new Date(sub.next_payment_date);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  if (sub.payment_day && sub.payment_day >= 1 && sub.payment_day <= 31) {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const thisMonthRenewal = new Date(currentYear, currentMonth, sub.payment_day);
    thisMonthRenewal.setHours(0, 0, 0, 0);

    if (thisMonthRenewal.getTime() >= now.getTime()) {
      return Math.ceil((thisMonthRenewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      // Next month
      const nextMonthRenewal = new Date(currentYear, currentMonth + 1, sub.payment_day);
      nextMonthRenewal.setHours(0, 0, 0, 0);
      return Math.ceil((nextMonthRenewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  return null;
}
