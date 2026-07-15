import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [customRoleNames, setCustomRoleNames] = useState<string[]>([]);
  const [activeSuspension, setActiveSuspension] = useState<any | null>(null);
  const [activeLeave, setActiveLeave] = useState<any | null>(null);
  const [userSanctions, setUserSanctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      setPermissions([]);
      setCustomRoleNames([]);
      setActiveSuspension(null);
      setActiveLeave(null);
      setUserSanctions([]);
      return;
    }
    (async () => {
      const [
        { data: p },
        { data: roles },
        { data: perms },
        { data: cr },
        { data: sancs },
        { data: leaves },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, display_name")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.rpc("user_permissions", { _user_id: user.id }),
        supabase.from("user_custom_roles").select("custom_roles(name)").eq("user_id", user.id),
        supabase
          .from("sanctions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("leave_requests").select("*").eq("user_id", user.id).eq("status", "approved"),
      ]);
      setProfile(p as Profile | null);
      setIsAdmin(!!roles?.some((r: { role: string }) => r.role === "admin"));
      setPermissions((perms as string[] | null) ?? []);
      const names = ((cr as Array<{ custom_roles: { name: string } | null }> | null) ?? [])
        .map((r) => r.custom_roles?.name)
        .filter((n): n is string => !!n);
      setCustomRoleNames(names);

      const sanctionsList = (sancs as any[] | null) ?? [];
      setUserSanctions(sanctionsList);

      const activeSusp = sanctionsList.find((s: any) => {
        if (!s.is_active) return false;
        if (s.type === "espulsione") return true;
        if (s.type === "sospensione") {
          if (!s.expires_at) return true; // permanent
          return new Date(s.expires_at) > new Date();
        }
        return false;
      });
      setActiveSuspension(activeSusp || null);

      const leavesList = (leaves as any[] | null) ?? [];
      const activeLv = leavesList.find((l: any) => {
        const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        return todayStr >= l.start_date && todayStr <= l.end_date;
      });
      setActiveLeave(activeLv || null);
    })();
  }, [user]);

  return {
    session,
    user,
    profile,
    isAdmin,
    permissions,
    customRoleNames,
    activeSuspension,
    activeLeave,
    userSanctions,
    loading,
  };
}
