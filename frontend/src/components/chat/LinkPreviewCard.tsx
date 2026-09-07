import { useEffect, useState } from "react";
import type { LinkPreviewData } from "../../services/api";
import { getLinkPreview } from "../../services/api";
import { getYouTubeVideoId } from "../../utils/link-extractor";

type LinkPreviewCardProps = {
  url: string;
  token?: string | null;
};

// Cache simples em memória no frontend para não refazer fetch ao rolar o chat
const clientPreviewCache = new Map<string, LinkPreviewData | null>();

export function LinkPreviewCard({ url, token }: LinkPreviewCardProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(
    () => clientPreviewCache.get(url) ?? null,
  );
  const [loading, setLoading] = useState<boolean>(!clientPreviewCache.has(url));
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  const youtubeId = getYouTubeVideoId(url);

  useEffect(() => {
    let isMounted = true;

    if (clientPreviewCache.has(url)) {
      setPreview(clientPreviewCache.get(url) ?? null);
      setLoading(false);
      return;
    }

    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    getLinkPreview(token, url)
      .then((res) => {
        if (!isMounted) return;
        const data = res?.preview ?? null;
        clientPreviewCache.set(url, data);
        setPreview(data);
      })
      .catch(() => {
        if (!isMounted) return;
        clientPreviewCache.set(url, null);
        setPreview(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [url, token]);

  // Se estiver carregando, exibe esqueleto discreto
  if (loading) {
    return (
      <div className="link-preview-card skeleton-preview">
        <div className="preview-accent-bar" />
        <div className="preview-content">
          <div className="skeleton-line line-site" />
          <div className="skeleton-line line-title" />
          <div className="skeleton-line line-desc" />
        </div>
      </div>
    );
  }

  // Se não encontrou dados e não é YouTube, não renderiza nada para não poluir
  if (!preview && !youtubeId) {
    return null;
  }

  const hostname = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  const siteName = preview?.siteName || (youtubeId ? "YouTube" : hostname);
  const title = preview?.title || (youtubeId ? "Vídeo do YouTube" : hostname);
  const description = preview?.description || "";
  const imageUrl =
    preview?.image ||
    (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg` : null);
  const themeColor = preview?.themeColor || (youtubeId ? "#FF0000" : "#6366f1");

  return (
    <div
      className={`link-preview-card ${youtubeId ? "youtube-preview" : ""}`}
      style={{ "--preview-theme": themeColor } as React.CSSProperties}
    >
      <div className="preview-accent-bar" />

      <div className="preview-inner">
        {/* CABEÇALHO DO SITE COM FAVICON */}
        <div className="preview-header">
          {preview?.favicon ? (
            <img
              src={preview.favicon}
              alt=""
              className="preview-favicon"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <span className="preview-site-icon">🌐</span>
          )}
          <span className="preview-site-name">{siteName}</span>
        </div>

        {/* TÍTULO COM LINK */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="preview-title"
          title={title}
        >
          {title}
        </a>

        {/* DESCRIÇÃO */}
        {description && <p className="preview-description">{description}</p>}

        {/* SE FOR YOUTUBE: PLAYER EMBUTIDO COM CLICK-TO-PLAY */}
        {youtubeId && (
          <div className="preview-youtube-wrapper">
            {isPlayingVideo ? (
              <div className="preview-video-container">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="preview-iframe"
                />
              </div>
            ) : (
              <div
                className="preview-video-thumbnail"
                onClick={() => setIsPlayingVideo(true)}
                role="button"
                tabIndex={0}
                title="Reproduzir vídeo no chat"
              >
                {imageUrl && (
                  <img src={imageUrl} alt={title} className="preview-thumb-img" />
                )}
                <div className="preview-play-btn" title="Assistir no Chat">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="preview-play-badge">Assistir no Chat</span>
              </div>
            )}
          </div>
        )}

        {/* SE NÃO FOR YOUTUBE MAS TIVER IMAGEM: THUMBNAIL OPENGRAPH */}
        {!youtubeId && imageUrl && (
          <div className="preview-media-container">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={imageUrl}
                alt={title}
                className="preview-thumb-img"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
