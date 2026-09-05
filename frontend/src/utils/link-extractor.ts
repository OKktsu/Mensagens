/**
 * Regex para capturar URLs http/https em textos.
 */
const URL_REGEX = /https?:\/\/[^\s<>"'()]+/gi;

/**
 * Remove pontuações acidentais no fim de uma URL encontrada em uma frase
 * Exemplo: "Veja https://github.com." -> "https://github.com"
 */
export function cleanUrl(url: string): string {
  let cleaned = url;
  const trailingPunctuation = /[.,!?:;)\]'"]+$/;
  while (trailingPunctuation.test(cleaned)) {
    cleaned = cleaned.replace(trailingPunctuation, "");
  }
  return cleaned;
}

/**
 * Extrai a primeira URL encontrada em um texto.
 */
export function extractFirstUrl(text?: string | null): string | null {
  if (!text) return null;
  const matches = text.match(URL_REGEX);
  if (!matches || matches.length === 0) return null;
  return cleanUrl(matches[0]);
}

/**
 * Extrai o ID do vídeo do YouTube caso a URL seja do YouTube ou YouTube Shorts.
 */
export function getYouTubeVideoId(url?: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // youtu.be/ID
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id || null;
    }

    // youtube.com / m.youtube.com / www.youtube.com
    if (host.includes("youtube.com")) {
      // /watch?v=ID
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v") || null;
      }
      // /shorts/ID
      if (parsed.pathname.startsWith("/shorts/")) {
        const id = parsed.pathname.split("/shorts/")[1]?.split("/")[0];
        return id || null;
      }
      // /embed/ID
      if (parsed.pathname.startsWith("/embed/")) {
        const id = parsed.pathname.split("/embed/")[1]?.split("/")[0];
        return id || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export type TextSegment = {
  type: "text" | "link";
  content: string;
  href?: string;
};

/**
 * Divide o texto em segmentos de texto normal e links clicáveis.
 */
export function parseTextWithLinks(text: string): TextSegment[] {
  if (!text) return [];

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  // Usa matchAll para capturar índices exatos
  const regex = /https?:\/\/[^\s<>"'()]+/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const rawUrl = match[0];
    const cleaned = cleanUrl(rawUrl);
    const startIndex = match.index;
    const punctuationOffset = rawUrl.length - cleaned.length;

    // Adiciona o texto antes do link
    if (startIndex > lastIndex) {
      segments.push({
        type: "text",
        content: text.substring(lastIndex, startIndex),
      });
    }

    // Adiciona o link
    segments.push({
      type: "link",
      content: cleaned,
      href: cleaned,
    });

    // Se houve pontuação no final que foi removida da URL, adiciona como texto
    if (punctuationOffset > 0) {
      const punctuation = rawUrl.substring(cleaned.length);
      segments.push({
        type: "text",
        content: punctuation,
      });
    }

    lastIndex = startIndex + rawUrl.length;
  }

  // Adiciona o texto restante final
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.substring(lastIndex),
    });
  }

  return segments;
}
