import "./lib/error-capture";
import { fetchTelegramUpdates } from "./lib/telegram.server";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// Catches unhandled SSR errors or h3 500 JSON responses on Cloudflare Pages / Node
async function normalizeCatastrophicSsrResponse(
  response: Response,
  request: Request,
): Promise<Response> {
  if (response.status < 500) return response;

  // If this is an API route, RPC call, or TanStack server function, preserve JSON format
  const url = request.url;
  const isApi = url.includes("/_serverFn") || url.includes("/api/") || url.includes("/_server");
  if (isApi) {
    return response;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  try {
    const body = await response.clone().text();
    // Catch any h3/nitro unhandled JSON error like {"error":true,"status":500,"unhandled":true}
    if (
      body.includes('"unhandled":true') ||
      body.includes('"error":true') ||
      body.includes('"status":500')
    ) {
      const capturedErr = consumeLastCapturedError();
      if (capturedErr) {
        console.error("[SSR Catastrophic Catch] Captured error:", capturedErr);
      } else {
        console.error(`[SSR Catastrophic Catch] Nitro 500 response intercepted: ${body}`);
      }
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  } catch (e) {
    // If reading body fails, return standard error page
  }

  return response;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Keep Telegram updates running safely within request lifecycle on Cloudflare Pages / Node
    try {
      const p = fetchTelegramUpdates().catch(() => {});
      if (ctx && typeof (ctx as any).waitUntil === "function") {
        (ctx as any).waitUntil(p);
      }
    } catch (e) {
      // Ignore background fetch errors
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response, request);
    } catch (error) {
      console.error("[Server Entry] Unhandled exception:", error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
