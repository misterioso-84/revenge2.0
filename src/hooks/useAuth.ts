import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { syncUserSession } from "@/lib/registration.functions";
import { toast } from "sonner";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  has_employee_access?: boolean;
  telegram_connected?: boolean;
  telegram_handle?: string | null;
  show_in_staff_list?: boolean;
  staff_weight?: number;
  staff_color?: string;
  ip_address?: string;
};

export interface ClientNetworkInfo {
  ip: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  cfRay: string | null;
  colo: string | null;
  protocol: string;
  browser: string;
  deviceType: string;
  isCloudflare: boolean;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [customRoleNames, setCustomRoleNames] = useState<string[]>([]);
  const [activeSuspension, setActiveSuspension] = useState<any | null>(null);
  const [activeLeave, setActiveLeave] = useState<any | null>(null);
  const [userSanctions, setUserSanctions] = useState<any[]>([]);
  const [networkInfo, setNetworkInfo] = useState<ClientNetworkInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!isMounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setProfileLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
      if (!data.session?.user) {
        setProfileLoading(false);
      }
    });
    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Sync active user session with server & Cloudflare headers
  useEffect(() => {
    if (!user) {
      setNetworkInfo(null);
      return;
    }

    let isMounted = true;
    const syncSession = async () => {
      try {
        const storedStr =
          typeof window !== "undefined" ? localStorage.getItem("casinorevenge_session") : null;
        let storedSessionId: string | undefined;
        if (storedStr) {
          try {
            const parsed = JSON.parse(storedStr);
            storedSessionId = parsed.session?.session_id;
          } catch (e) {
            // ignore
          }
        }

        const res = await syncUserSession({
          data: {
            userId: user.id,
            sessionId: storedSessionId,
            username: user.user_metadata?.username,
            displayName: user.user_metadata?.display_name,
          },
        });

        if (!isMounted) return;

        if (res?.isRevoked) {
          toast.error("La tua sessione è stata revocata dall'amministratore.", {
            description: "Sei stato disconnesso per motivi di sicurezza.",
          });
          await supabase.auth.signOut();
          if (typeof window !== "undefined") {
            window.location.href = "/auth";
          }
          return;
        }

        if (res?.clientInfo) {
          setNetworkInfo(res.clientInfo as ClientNetworkInfo);
        }
      } catch (err: any) {
        // Non-blocking background session synchronization
        console.warn("[useAuth] Session sync non-blocking notice:", err?.message || err);
      }
    };

    syncSession();
    // Heartbeat every 45s to maintain active status and verify session validity
    const interval = setInterval(syncSession, 45000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      setRoles([]);
      setPermissions([]);
      setCustomRoleNames([]);
      setActiveSuspension(null);
      setActiveLeave(null);
      setUserSanctions([]);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    (async () => {
      try {
        const [
          { data: p },
          { data: userRolesData },
          { data: perms },
          { data: cr },
          { data: sancs },
          { data: leaves },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, username, display_name, has_employee_access, telegram_connected, telegram_handle, show_in_staff_list, staff_weight, staff_color, ip_address",
            )
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
          supabase
            .from("leave_requests")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "approved"),
        ]);

        if (!isMounted) return;

        const profileData = p as Profile | null;
        setProfile(profileData);

        const rolesList = ((userRolesData as Array<{ role: string }> | null) ?? []).map(
          (r) => r.role,
        );
        setRoles(rolesList);

        const permsList = (perms as string[] | null) ?? [];
        const names = ((cr as Array<{ custom_roles: { name: string } | null }> | null) ?? [])
          .map((r) => r.custom_roles?.name)
          .filter((n): n is string => !!n);
        setCustomRoleNames(names);

        const userRoleAdmin = rolesList.some(
          (r: string) => r === "admin" || r === "gestore" || r === "capitano" || r === "direzione",
        );
        const usernameAdmin =
          profileData?.username?.toLowerCase() === "admin" ||
          profileData?.username?.toLowerCase() === "giuse84pro" ||
          user?.email?.toLowerCase() === "beppemonti84@gmail.com" ||
          user?.user_metadata?.username?.toLowerCase() === "admin";
        const customRoleAdmin = names.some((n) => {
          const lower = n.toLowerCase();
          return (
            lower.includes("amministratore") ||
            lower.includes("capitano") ||
            lower.includes("direzione") ||
            lower.includes("gestore")
          );
        });
        const permAdmin =
          permsList.includes("utenti.gestisci") || permsList.includes("ruoli.gestisci");

        const admin = userRoleAdmin || usernameAdmin || customRoleAdmin || permAdmin;
        setIsAdmin(admin);
        setPermissions(permsList);

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
      } catch (err) {
        console.error("[useAuth] Errore caricamento profilo e permessi:", err);
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const hasEmployeeAccess =
    profile?.has_employee_access === true ||
    profile?.show_in_staff_list === true ||
    isAdmin ||
    roles.length > 0 ||
    customRoleNames.length > 0 ||
    permissions.length > 0;

  const loading = authLoading || (!!user && profileLoading);

  return {
    session,
    user,
    profile,
    isAdmin,
    roles,
    hasEmployeeAccess,
    permissions,
    customRoleNames,
    activeSuspension,
    activeLeave,
    userSanctions,
    networkInfo,
    loading,
  };
}
