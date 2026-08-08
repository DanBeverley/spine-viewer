import { createClient } from "@supabase/supabase-js";

const configuredUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseUrl = configuredUrl?.trim().replace(/\/+$/, "");
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

const hasValidSupabaseUrl = (() => {
    if (!supabaseUrl) return false;
    try {
        const parsed = new URL(supabaseUrl);
        return (parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.pathname === "/";
    } catch {
        return false;
    }
})();

export const isSupabaseConfigured = Boolean(hasValidSupabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    })
    : null;

export const requireSupabase = () => {
    if (!supabase) {
        throw new Error("Invalid Supabase configuration. VITE_SUPABASE_URL must look like https://your-project-ref.supabase.co.");
    }
    return supabase;
};
