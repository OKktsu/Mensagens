type PinnedMessageBannerProps = {
  pinnedMessage: {
    id: string;
    content: string;
    type?: "text" | "image" | "audio" | "file";
    fileName?: string | null;
    sender: {
      id: string;
      name: string;
    };
  };
  onJumpToMessage: (messageId: string) => void;
  onUnpin: () => void;
};

export function PinnedMessageBanner({
  pinnedMessage,
  onJumpToMessage,
  onUnpin,
}: PinnedMessageBannerProps) {
  const getPreviewText = () => {
    if (pinnedMessage.type === "image") return "Foto anexada";
    if (pinnedMessage.type === "audio") return "Mensagem de voz";
    if (pinnedMessage.type === "file") return pinnedMessage.fileName || "Documento anexado";
    return pinnedMessage.content || "Mensagem fixada";
  };

  return (
    <aside className="stitch-pinned-banner" aria-label="Mensagem fixada">
      <div
        className="stitch-pinned-content"
        onClick={() => onJumpToMessage(pinnedMessage.id)}
        role="button"
        tabIndex={0}
        title="Ir para a mensagem fixada"
      >
        <span className="material-symbols-outlined stitch-pinned-icon">push_pin</span>
        <span className="stitch-pinned-label">Mensagem fixada:</span>
        <span className="stitch-pinned-snippet">"{getPreviewText()}"</span>
      </div>

      <div className="stitch-pinned-actions">
        <button
          type="button"
          className="stitch-pinned-jump-link"
          onClick={() => onJumpToMessage(pinnedMessage.id)}
        >
          Ver mensagem
        </button>
        <button
          type="button"
          className="stitch-pinned-close-btn"
          onClick={onUnpin}
          title="Desafixar mensagem"
          aria-label="Desafixar"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </aside>
  );
}

