/**
 * Cloudflare Integration & Network Extraction Utilities
 * Standardizes Cloudflare Edge headers, GeoIP Country resolution, and User-Agent parsing
 * across all server routes, auth sessions, and security monitors.
 */

export interface CloudflareClientInfo {
  ip: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  cfRay: string | null;
  colo: string | null;
  protocol: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet";
  isCloudflare: boolean;
}

const COUNTRY_MAP: Record<string, { name: string; flag: string }> = {
  IT: { name: "Italia", flag: "🇮🇹" },
  SM: { name: "San Marino", flag: "🇸🇲" },
  VA: { name: "Città del Vaticano", flag: "🇻🇦" },
  CH: { name: "Svizzera", flag: "🇨🇭" },
  FR: { name: "Francia", flag: "🇫🇷" },
  DE: { name: "Germania", flag: "🇩🇪" },
  ES: { name: "Spagna", flag: "🇪🇸" },
  GB: { name: "Regno Unito", flag: "🇬🇧" },
  US: { name: "Stati Uniti", flag: "🇺🇸" },
  AT: { name: "Austria", flag: "🇦🇹" },
  BE: { name: "Belgio", flag: "🇧🇪" },
  NL: { name: "Paesi Bassi", flag: "🇳🇱" },
  PT: { name: "Portogallo", flag: "🇵🇹" },
  GR: { name: "Grecia", flag: "🇬🇷" },
  RO: { name: "Romania", flag: "🇷🇴" },
  AL: { name: "Albania", flag: "🇦🇱" },
  HR: { name: "Croazia", flag: "🇭🇷" },
  MT: { name: "Malta", flag: "🇲🇹" },
  MC: { name: "Monaco", flag: "🇲🇨" },
  CA: { name: "Canada", flag: "🇨🇦" },
  BR: { name: "Brasile", flag: "🇧🇷" },
  AU: { name: "Australia", flag: "🇦🇺" },
  JP: { name: "Giappone", flag: "🇯🇵" },
  XX: { name: "Rete Internazionale", flag: "🌐" },
  T1: { name: "Tor / Proxy Anonimo", flag: "🧅" },
};

export function getCountryInfo(code?: string | null): { name: string; flag: string } {
  if (!code) return { name: "Italia", flag: "🇮🇹" };
  const upper = code.toUpperCase();
  if (COUNTRY_MAP[upper]) return COUNTRY_MAP[upper];

  // Convert 2-letter ISO code to regional indicator flag emoji
  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) {
    const flag = String.fromCodePoint(upper.charCodeAt(0) + 127397, upper.charCodeAt(1) + 127397);
    return { name: upper, flag };
  }

  return { name: "Internazionale", flag: "🌐" };
}

export function parseUserAgent(uaString?: string): {
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet";
} {
  const ua = (uaString || "").toLowerCase();

  let os = "Windows 11";
  if (ua.includes("windows nt 10.0") || ua.includes("win64") || ua.includes("windows")) {
    os = "Windows";
  } else if (ua.includes("macintosh") || ua.includes("mac os x")) {
    os = "macOS";
  } else if (ua.includes("iphone")) {
    os = "iOS (iPhone)";
  } else if (ua.includes("ipad")) {
    os = "iPadOS";
  } else if (ua.includes("android")) {
    os = ua.includes("mobile") ? "Android" : "Android Tablet";
  } else if (ua.includes("linux")) {
    os = "Linux";
  }

  let browser = "Chrome";
  if (ua.includes("edg/")) browser = "Microsoft Edge";
  else if (ua.includes("opr/") || ua.includes("opera")) browser = "Opera";
  else if (ua.includes("chrome/") && !ua.includes("edg/")) browser = "Google Chrome";
  else if (ua.includes("safari/") && !ua.includes("chrome")) browser = "Apple Safari";
  else if (ua.includes("firefox/")) browser = "Mozilla Firefox";

  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  if (
    ua.includes("ipad") ||
    (ua.includes("android") && !ua.includes("mobile")) ||
    ua.includes("tablet")
  ) {
    deviceType = "tablet";
  } else if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
    deviceType = "mobile";
  }

  return { browser: `${browser} su ${os}`, os, deviceType };
}

export function extractCloudflareInfo(req?: Request | null): CloudflareClientInfo {
  let ip = "127.0.0.1";
  let countryCode = "IT";
  let cfRay: string | null = null;
  let colo: string | null = null;
  let protocol = "https";
  let userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36";
  let isCloudflare = false;

  if (req && req.headers) {
    const cfIp = req.headers.get("cf-connecting-ip");
    const cfCountry = req.headers.get("cf-ipcountry");
    const cfRayHdr = req.headers.get("cf-ray");
    const cfVisitor = req.headers.get("cf-visitor");
    const xForwardedFor = req.headers.get("x-forwarded-for");
    const xRealIp = req.headers.get("x-real-ip");
    const xForwardedProto = req.headers.get("x-forwarded-proto");
    const ua = req.headers.get("user-agent");

    if (cfIp) {
      ip = cfIp.trim();
      isCloudflare = true;
    } else if (xForwardedFor) {
      ip = xForwardedFor.split(",")[0].trim();
    } else if (xRealIp) {
      ip = xRealIp.trim();
    }

    if (cfCountry) {
      countryCode = cfCountry.trim().toUpperCase();
      isCloudflare = true;
    }

    if (cfRayHdr) {
      cfRay = cfRayHdr.trim();
      isCloudflare = true;
      const parts = cfRay.split("-");
      if (parts.length > 1) {
        colo = parts[parts.length - 1]; // e.g. MXP, FCO, FRA, LHR
      }
    }

    if (cfVisitor) {
      try {
        const parsed = JSON.parse(cfVisitor);
        if (parsed.scheme) protocol = parsed.scheme;
      } catch (e) {
        // ignore
      }
    } else if (xForwardedProto) {
      protocol = xForwardedProto.trim();
    }

    if (ua) {
      userAgent = ua;
    }
  }

  const { browser, os, deviceType } = parseUserAgent(userAgent);
  const country = getCountryInfo(countryCode);

  return {
    ip,
    countryCode,
    countryName: country.name,
    countryFlag: country.flag,
    cfRay,
    colo,
    protocol,
    userAgent,
    browser,
    os,
    deviceType,
    isCloudflare,
  };
}
