import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function requireApiAuth(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    throw new Error("Unauthorized: No authorization header provided");
  }

  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Only Bearer tokens are supported");
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new Error("Unauthorized: No token provided");
  }

  const getEnv = (val: any, fallback: string) => {
    if (!val) return fallback;
    const s = String(val).trim();
    if (s === "" || s === "undefined" || s === "null" || s.includes("placeholder")) return fallback;
    return s;
  };

  const SUPABASE_URL = getEnv(import.meta.env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL, "https://azezbvzqyhopmlzybtcx.supabase.co");
  const SUPABASE_PUBLISHABLE_KEY = getEnv(import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY, "sb_publishable_VYwOqXtDruPAhFtrAMGHow_v6e60MD-");

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}`);
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const decodeJwt = (t: string) => {
    try {
      const parts = t.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        (typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary'))
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (err) {
      return null;
    }
  };

  const claims = decodeJwt(token);
  if (!claims) {
    throw new Error("Unauthorized: Invalid token");
  }

  if (!claims.sub) {
    throw new Error("Unauthorized: No user ID found in token");
  }

  return {
    supabase,
    userId: claims.sub,
    claims: claims,
  };
}
