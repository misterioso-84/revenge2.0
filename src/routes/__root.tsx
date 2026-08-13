import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  isRedirect,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Pagina non trovata</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La pagina che stai cercando non esiste.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  if (isRedirect(error)) {
    throw error;
  }
  console.error("Root ErrorComponent caught error:", error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Errore di caricamento</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Qualcosa non ha funzionato. Riprova o torna alla home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Riprova
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Casinò Revenge — Pannello di Gestione" },
      {
        name: "description",
        content:
          "Pannello interno di gestione del Casinò Revenge: cittadini, serate, ippodromo e cassette.",
      },
      { property: "og:title", content: "Casinò Revenge — Pannello di Gestione" },
      { name: "twitter:title", content: "Casinò Revenge — Pannello di Gestione" },
      {
        property: "og:description",
        content:
          "Pannello interno di gestione del Casinò Revenge: cittadini, serate, ippodromo e cassette.",
      },
      {
        name: "twitter:description",
        content:
          "Pannello interno di gestione del Casinò Revenge: cittadini, serate, ippodromo e cassette.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/db6fdeb3-a87b-424e-ab0b-033c69db080e/id-preview-b812c411--1fb6931b-f6ad-40ce-9508-ed89c180a6ff.lovable.app-1781269771300.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/db6fdeb3-a87b-424e-ab0b-033c69db080e/id-preview-b812c411--1fb6931b-f6ad-40ce-9508-ed89c180a6ff.lovable.app-1781269771300.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { useAuth } from "@/hooks/useAuth";
import { TelegramVerificationGuard } from "@/components/TelegramVerificationGuard";
import { useQueryClient } from "@tanstack/react-query";

function GlobalTelegramEnforcer() {
  const { user, profile, loading } = useAuth();
  const qc = useQueryClient();

  if (loading || !user || !profile) return null;

  const isTelegramMissing =
    !profile.telegram_connected ||
    !profile.telegram_handle ||
    profile.telegram_handle.trim() === "";

  if (!isTelegramMissing) return null;

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return <TelegramVerificationGuard profile={profile} signOut={signOut} />;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <GlobalTelegramEnforcer />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
