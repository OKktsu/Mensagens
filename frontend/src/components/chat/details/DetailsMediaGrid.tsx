import type { Message } from "../../../services/api";
import { getMediaUrl } from "../../../services/api";
import { formatTime } from "../../../utils/chat-helpers";

type DetailsMediaGridProps = {
  mediaMessages: Message[];
  totalCount?: number;
  onImageClick?: (url: string) => void;
  onViewAll?: () => void;
  isCompact?: boolean;
};

export function DetailsMediaGrid({
  mediaMessages,
  totalCount = 0,
  onImageClick,
  onViewAll,
  isCompact = false,
}: DetailsMediaGridProps) {
  if (mediaMessages.length === 0) {
    return (
      <div className="details-empty-state">
        <div className="details-empty-icon-wrap emerald">
          <span className="material-symbols-outlined text-[26px] text-emerald-400">photo_library</span>
        </div>
        <strong className="details-empty-title">Sem fotos ou mídias</strong>
        <p className="details-empty-sub">Nenhuma imagem foi compartilhada nesta conversa.</p>
      </div>
    );
  }

  const remainingCount = totalCount > 3 ? totalCount - 3 : 0;

  return (
    <div className={`details-media-grid ${isCompact ? "compact-preview" : "full-view"}`}>
      {mediaMessages.map((m, index) => {
        const url = getMediaUrl(m.fileUrl || "");
        const isLastCompactItemWithMore = isCompact && index === 2 && remainingCount > 0;

        return (
          <div
            key={m.id}
            className="details-media-card"
            onClick={() => {
              if (isLastCompactItemWithMore && onViewAll) {
                onViewAll();
              } else {
                onImageClick?.(url);
              }
            }}
            title={`Enviado por ${m.sender.name} às ${formatTime(m.createdAt)}`}
          >
            <img src={url} alt="Mídia" className="details-media-thumb" loading="lazy" />
            
            {isLastCompactItemWithMore ? (
              <div className="details-media-more-overlay">
                <span className="details-media-more-count">+{remainingCount}</span>
                <span className="details-media-more-label">mais</span>
              </div>
            ) : (
              <div className="details-media-overlay">
                <span className="material-symbols-outlined text-[16px] text-white">zoom_in</span>
                <span className="details-media-time">{formatTime(m.createdAt)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
