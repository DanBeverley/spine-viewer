import { ViewerAccount } from "../interfaces";
import { requireSupabase, supabase } from "./supabaseClient";

const toViewerAccount = (user: { id: string; email?: string | null }): ViewerAccount => ({
    id: user.id,
    username: user.email ?? "Account"
});

class AccountService {
    public static async register(email: string, password: string): Promise<ViewerAccount> {
        const client = requireSupabase();
        const { data, error } = await client.auth.signUp({
            email: email.trim(),
            password
        });

        if (error) throw error;
        if (!data.user) throw new Error("Supabase did not return a user.");
        if (!data.session) {
            throw new Error("Account created. Check your email to confirm it, then log in.");
        }

        return toViewerAccount(data.user);
    }

    public static async login(email: string, password: string): Promise<ViewerAccount> {
        const client = requireSupabase();
        const { data, error } = await client.auth.signInWithPassword({
            email: email.trim(),
            password
        });

        if (error) throw error;
        if (!data.user) throw new Error("Supabase did not return a user.");
        return toViewerAccount(data.user);
    }

    public static async getCurrentAccount(): Promise<ViewerAccount | null> {
        const client = requireSupabase();
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        return data.session?.user ? toViewerAccount(data.session.user) : null;
    }

    public static onAuthStateChange(callback: (account: ViewerAccount | null) => void) {
        if (!supabase) return () => undefined;

        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            callback(session?.user ? toViewerAccount(session.user) : null);
        });
        return () => data.subscription.unsubscribe();
    }

    public static async logout(): Promise<void> {
        const client = requireSupabase();
        const { error } = await client.auth.signOut();
        if (error) throw error;
    }
}

export default AccountService;
