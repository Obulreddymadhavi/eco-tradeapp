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
    let cancelled = false;

    // Register listener FIRST then load session (avoid races)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (!sess) {
        setRole(null);
        setProfile(null);
        setLoading(false);
      } else {
        // defer fetch to next tick to avoid deadlock with onAuthStateChange
        setTimeout(async () => {
          if (cancelled) return;
          await loadProfile(sess.user.id);
          if (!cancelled) setLoading(false);
        }, 0);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session) {
        await loadProfile(data.session.user.id);
      }
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId: string) {
    let roleVal: AppRole = "customer";
    let profileVal: Profile | null = null;

    try {
      const [{ data: roleRow }, { data: profileRow }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      ]);

      roleVal = (roleRow?.role as AppRole | undefined) ?? "customer";
      profileVal = profileRow as Profile | null;

      // Safety fallback: if authenticated user has no profile row, create it
      if (!profileVal) {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (user) {
          const newProfile = {
            id: userId,
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Customer",
            email: user.email ?? null,
            phone: user.user_metadata?.phone ?? null,
            address: user.user_metadata?.address ?? null,
            company_name: user.user_metadata?.company_name ?? null,
            vehicle_info: user.user_metadata?.vehicle_info ?? null,
          };
          
          const { data: insertedProfile } = await supabase
            .from("profiles")
            .insert(newProfile)
            .select()
            .maybeSingle();
          
          if (insertedProfile) {
            profileVal = insertedProfile as Profile;
          }
        }
      }

      // Safety fallback: if user has no role row, create it
      if (!roleRow && profileVal) {
        const defaultRole = (profileVal.company_name || profileVal.vehicle_info) ? "vendor" : "customer";
        await supabase.from("user_roles").insert({ user_id: userId, role: defaultRole });
        roleVal = defaultRole;
      }
    } catch (e) {
      console.error("Failed to load or initialize profile/role:", e);
    }

    setRole(roleVal);
    setProfile(profileVal);
  }

  return { session, user, role, profile, loading, reload: () => user && loadProfile(user.id) };
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/";
}
