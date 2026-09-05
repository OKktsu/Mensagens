import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";
import ogs from "open-graph-scraper";

export type LinkPreviewData = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  themeColor?: string;
  mediaType?: string;
};

type CacheEntry = {
  data: LinkPreviewData | null;
  expiresAt: number;
};

// Cache em memória de 24 horas para 500 itens (LRU simples)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_SIZE = 500;
const previewCache = new Map<string, CacheEntry>();

/**
 * Valida se uma URL é segura para ser consultada pelo servidor (Anti-SSRF).
 * Bloqueia localhost, redes privadas, metadados da nuvem (AWS/GCP) e IPs reservados.
 */
export async function isSafeUrl(targetUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(targetUrl);

    // 1. Apenas protocolos HTTP e HTTPS são permitidos
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Bloqueio direto de hostnames especiais
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }

    // 3. Resolve o IP real via DNS para evitar domínios mascarados e DNS rebinding
    const lookup = await dns.lookup(hostname);
    let addr = ipaddr.parse(lookup.address);

    // Se for um IPv6 mapeado para IPv4 (::ffff:127.0.0.1), converte para IPv4 puro
    if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
      addr = (addr as ipaddr.IPv6).toIPv4Address();
    }

    const range = addr.range();
    const blockedRanges: string[] = [
      "loopback",
      "private",
      "linkLocal",
      "uniqueLocal",
      "carrierGradeNat",
      "broadcast",
      "reserved",
      "unspecified",
    ];

    if (blockedRanges.includes(range)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Busca os metadados OpenGraph de uma URL de forma segura e performática.
 */
export async function getLinkPreview(url: string): Promise<LinkPreviewData | null> {
  const normalizedUrl = url.trim();

  // Verifica no cache em memória
  const cached = previewCache.get(normalizedUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // 1. Validação de Segurança Anti-SSRF
  const isSafe = await isSafeUrl(normalizedUrl);
  if (!isSafe) {
    saveToCache(normalizedUrl, null);
    return null;
  }

  try {
    // 2. Scraping com open-graph-scraper
    const ogsOptions = {
      url: normalizedUrl,
      timeout: 3500, // 3.5 segundos de timeout
      fetchOptions: {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; MensagensBot/1.0; +https://github.com/OKktsu/Mensagens)",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      },
    };

    const { result, error } = await ogs(ogsOptions);

    if (error || !result.success) {
      saveToCache(normalizedUrl, null);
      return null;
    }

    // Normaliza favicon e imagem
    let imageUrl = result.ogImage?.[0]?.url;
    if (imageUrl && imageUrl.startsWith("/")) {
      const origin = new URL(normalizedUrl).origin;
      imageUrl = `${origin}${imageUrl}`;
    }

    let faviconUrl = result.favicon;
    if (faviconUrl && faviconUrl.startsWith("/")) {
      const origin = new URL(normalizedUrl).origin;
      faviconUrl = `${origin}${faviconUrl}`;
    }

    const data: LinkPreviewData = {
      url: result.requestUrl || normalizedUrl,
      title: result.ogTitle || result.twitterTitle,
      description: result.ogDescription || result.twitterDescription,
      image: imageUrl,
      siteName: result.ogSiteName || result.twitterSite || new URL(normalizedUrl).hostname,
      favicon: faviconUrl,
      themeColor: (result as { themeColor?: string }).themeColor,
      mediaType: result.ogType,
    };

    // Só consideramos um preview válido se tiver pelo menos título ou descrição ou imagem
    if (!data.title && !data.description && !data.image) {
      saveToCache(normalizedUrl, null);
      return null;
    }

    saveToCache(normalizedUrl, data);
    return data;
  } catch {
    saveToCache(normalizedUrl, null);
    return null;
  }
}

function saveToCache(url: string, data: LinkPreviewData | null) {
  if (previewCache.size >= MAX_CACHE_SIZE) {
    const firstKey = previewCache.keys().next().value;
    if (firstKey) {
      previewCache.delete(firstKey);
    }
  }

  previewCache.set(url, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}
