import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "customer" | "vendor" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  avatar_url: string | null;
  company_name: string | null;
  vehicle_info: string | null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Register listener FIRST then load session (avoid races)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (!sess) {
        setRole(null);
        setProfile(null);
      } else {
        // defer fetch to next tick to avoid deadlock with onAuthStateChange
        setTimeout(() => loadProfile(sess.user.id), 0);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session) loadProfile(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const [{ data: roleRow }, { data: profileRow }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    setRole((roleRow?.role as AppRole | undefined) ?? "customer");
    setProfile(profileRow as Profile | null);
  }

  return { session, user, role, profile, loading, reload: () => user && loadProfile(user.id) };
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/";
}
