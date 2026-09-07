import { formatTime } from "../../../utils/chat-helpers";
import { getYouTubeVideoId } from "../../../utils/link-extractor";

export type LinkItem = {
  id: string;
  url: string;
  domain: string;
  messageId: string;
  senderName: string;
  createdAt: string;
};

type DetailsLinksListProps = {
  linkItems: LinkItem[];
  onJumpToMessage?: (messageId: string) => void;
  isCompact?: boolean;
};

function getPlatformInfo(url: string, domain: string) {
  const lowerDomain = domain.toLowerCase();

  const youtubeId = getYouTubeVideoId(url);
  if (youtubeId) {
    return {
      platform: "YouTube",
      icon: "smart_display",
      colorClass: "youtube",
      thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  if (lowerDomain.includes("github.com")) {
    return { platform: "GitHub", icon: "terminal", colorClass: "github", thumbnail: null };
  }
  if (lowerDomain.includes("figma.com")) {
    return { platform: "Figma", icon: "draw", colorClass: "figma", thumbnail: null };
  }
  if (lowerDomain.includes("spotify.com")) {
    return { platform: "Spotify", icon: "music_note", colorClass: "spotify", thumbnail: null };
  }
  if (lowerDomain.includes("google.com") || lowerDomain.includes("drive.google.com")) {
    return { platform: "Google Drive", icon: "cloud", colorClass: "google", thumbnail: null };
  }
  if (lowerDomain.includes("twitter.com") || lowerDomain.includes("x.com")) {
    return { platform: "X", icon: "tag", colorClass: "twitter", thumbnail: null };
  }
  if (lowerDomain.includes("discord.com") || lowerDomain.includes("discord.gg")) {
    return { platform: "Discord", icon: "forum", colorClass: "discord", thumbnail: null };
  }

  return { platform: domain || "Web", icon: "language", colorClass: "web", thumbnail: null };
}

function cleanDisplayUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 1 ? u.pathname : "";
    return `${u.hostname}${path}`;
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  }
}

export function DetailsLinksList({
  linkItems,
  onJumpToMessage,
  isCompact = false,
}: DetailsLinksListProps) {
  if (linkItems.length === 0) {
    return (
      <div className="details-empty-state">
        <div className="details-empty-icon-wrap indigo">
          <span className="material-symbols-outlined text-[24px] text-indigo-400">link_off</span>
        </div>
        <strong className="details-empty-title">Sem links</strong>
        <p className="details-empty-sub">Nenhum link compartilhado na conversa.</p>
      </div>
    );
  }

  return (
    <div className={`details-links-list ${isCompact ? "compact-preview" : "full-view"}`}>
      {linkItems.map((item) => {
        const platformInfo = getPlatformInfo(item.url, item.domain);
        const displayUrl = cleanDisplayUrl(item.url);

        return (
          <div
            key={item.id}
            className={`details-link-card-clean ${platformInfo.colorClass}`}
            onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
            role="button"
            tabIndex={0}
            title={`Abrir ${item.url}`}
          >
            {/* Thumbnail ou Ícone */}
            {platformInfo.thumbnail ? (
              <div className="details-link-thumb-clean">
                <img src={platformInfo.thumbnail} alt="Thumbnail" loading="lazy" />
              </div>
            ) : (
              <div className={`details-link-icon-clean ${platformInfo.colorClass}`}>
                <span className="material-symbols-outlined text-[18px]">{platformInfo.icon}</span>
              </div>
            )}

            {/* Informações: Título e Linha de Metadados */}
            <div className="details-link-info-clean">
              <strong className="details-link-title-clean">{displayUrl}</strong>
              <div className="details-link-meta-clean">
                <span className={`details-link-platform-tag ${platformInfo.colorClass}`}>
                  {platformInfo.platform}
                </span>
                <span className="details-link-meta-dot">•</span>
                <span className="details-link-meta-sender truncate">{item.senderName}</span>
                <span className="details-link-meta-dot">•</span>
                <span className="details-link-meta-time">{formatTime(item.createdAt)}</span>
              </div>
            </div>

            {/* Único botão sutil: Ir para a mensagem no chat */}
            {onJumpToMessage && (
              <button
                type="button"
                className="details-link-jump-btn-clean"
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToMessage(item.messageId);
                }}
                title="Ver no chat"
                aria-label="Ver mensagem no chat"
              >
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
