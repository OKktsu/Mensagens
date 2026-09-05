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
    if (pinnedMessage.type === "image") return "📷 Foto";
    if (pinnedMessage.type === "audio") return "🎙️ Mensagem de voz";
    if (pinnedMessage.type === "file") return `📄 ${pinnedMessage.fileName || "Arquivo"}`;
    return pinnedMessage.content || "Mensagem fixada";
  };

  return (
    <aside className="pinned-message-banner" aria-label="Mensagem fixada">
      <div
        className="pinned-banner-content"
        onClick={() => onJumpToMessage(pinnedMessage.id)}
        role="button"
        tabIndex={0}
        title="Ir para a mensagem fixada"
      >
        <div className="pinned-icon">📌</div>
        <div className="pinned-info">
          <strong className="pinned-sender">{pinnedMessage.sender.name}</strong>
          <span className="pinned-snippet">{getPreviewText()}</span>
        </div>
      </div>

      <button
        type="button"
        className="pinned-unpin-btn"
        onClick={onUnpin}
        title="Desafixar mensagem"
        aria-label="Desafixar mensagem"
      >
        ✕
      </button>
    </aside>
  );
}
