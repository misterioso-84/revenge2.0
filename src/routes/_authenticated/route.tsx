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
