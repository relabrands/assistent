// Supabase client with safe fallback configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://sezfbxhnutgcyckldjej.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlemZieGhudXRnY3lja2xkamVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzI2MDksImV4cCI6MjA4NDAwODYwOX0.6L0SOKmh6ggj75ljr7175IKAF1O-ZlwlM-svYVGmNKM";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});