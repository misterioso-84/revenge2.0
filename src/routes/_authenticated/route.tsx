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
      const [{ data: userRoles }, { data: userPerms }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("user_permissions").select("permission").eq("user_id", uid),
      ]);
      const isAdmin = (userRoles || []).some((r: any) =>
        ["admin", "gestore", "capitano", "direzione"].includes(r.role?.toLowerCase()),
      );
      const hasPerms = (userPerms || []).length > 0;
      if (!isAdmin && !hasPerms) {
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
