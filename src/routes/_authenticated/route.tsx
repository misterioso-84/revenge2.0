import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        throw redirect({ to: "/auth" });
      }
      const uid = data.user.id;
      const [{ data: profile }, { data: userRoles }, { data: perms }, { data: customRoles }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("username, has_employee_access, is_fired, show_in_staff_list")
            .eq("id", uid)
            .maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", uid),
          supabase.rpc("user_permissions", { _user_id: uid }).catch(() => ({ data: [] })),
          supabase
            .from("user_custom_roles")
            .select("custom_roles(id, name, permissions)")
            .eq("user_id", uid),
        ]);

      const rolesList = ((userRoles as Array<{ role: string }> | null) ?? []).map((r) =>
        r.role?.toLowerCase(),
      );
      const directPerms = (perms as string[] | null) ?? [];
      const rawCustomRoles = ((customRoles as Array<{ custom_roles: any | null }> | null) ?? [])
        .map((r) => r.custom_roles)
        .filter(Boolean);
      const customRolePerms = rawCustomRoles.flatMap((r: any) => (r.permissions as string[]) || []);
      const permsList = Array.from(new Set([...directPerms, ...customRolePerms]));

      const customRoleNamesList = rawCustomRoles.map((r: any) => r.name?.toLowerCase() || "");

      const userRoleAdmin = rolesList.some(
        (r: string) => r === "admin" || r === "gestore" || r === "capitano" || r === "direzione",
      );
      const usernameAdmin =
        profile?.username?.toLowerCase() === "admin" ||
        profile?.username?.toLowerCase() === "giuse84pro" ||
        data.user?.email?.toLowerCase() === "beppemonti84@gmail.com" ||
        data.user?.user_metadata?.username?.toLowerCase() === "admin";
      const customRoleAdmin = customRoleNamesList.some((n: string) => {
        return (
          n.includes("amministratore") ||
          n.includes("capitano") ||
          n.includes("direzione") ||
          n.includes("gestore")
        );
      });
      const permAdmin =
        permsList.includes("utenti.gestisci") || permsList.includes("ruoli.gestisci");

      const isAdmin = userRoleAdmin || usernameAdmin || customRoleAdmin || permAdmin;
      const hasEmployeeAccess =
        profile?.has_employee_access !== false && (profile as any)?.is_fired !== true;

      if (!hasEmployeeAccess) {
        throw redirect({ to: "/scheda-cittadino" });
      }
      return { user: data.user };
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error("Auth check error in _authenticated route:", err);
      throw redirect({ to: "/auth" });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
