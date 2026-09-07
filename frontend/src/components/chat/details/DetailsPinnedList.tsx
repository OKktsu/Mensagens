import type { Message } from "../../../services/api";
import { formatTime } from "../../../utils/chat-helpers";

type DetailsPinnedListProps = {
  pinnedMessages: Message[];
  onJumpToMessage?: (messageId: string) => void;
  isCompact?: boolean;
};

function formatFileName(fileName?: string | null): string {
  if (!fileName) return "Documento";
  let cleaned = fileName.replace(/^\d+[-_]\d+[-_]?/, "").replace(/^[a-f0-9-]{36}[-_]/i, "");
  cleaned = cleaned.replace(/^\d{10,14}[-_]/, "");
  return cleaned || fileName;
}

export function DetailsPinnedList({
  pinnedMessages,
  onJumpToMessage,
  isCompact = false,
}: DetailsPinnedListProps) {
  if (pinnedMessages.length === 0) {
    return (
      <div className="details-empty-state">
        <div className="details-empty-icon-wrap amber">
          <span className="material-symbols-outlined text-[24px] text-amber-400">push_pin</span>
        </div>
        <strong className="details-empty-title">Sem mensagens fixadas</strong>
        <p className="details-empty-sub">Fixe mensagens importantes para encontrá-las facilmente.</p>
      </div>
    );
  }

  return (
    <div className={`details-pinned-list ${isCompact ? "compact-preview" : "full-view"}`}>
      {pinnedMessages.map((m) => {
        const snippet =
          m.type === "image"
            ? "📷 Foto compartilhada"
            : m.type === "file"
            ? `📄 ${formatFileName(m.fileName)}`
            : m.type === "audio"
            ? "🎵 Mensagem de voz"
            : m.content;

        return (
          <div
            key={m.id}
            className="details-pinned-card-clean"
            onClick={() => onJumpToMessage?.(m.id)}
            role="button"
            tabIndex={0}
            title="Ir até a mensagem no chat"
          >
            {/* Conteúdo: Autor + Snippet */}
            <div className="details-pinned-info-clean">
              <div className="details-pinned-top-row">
                <strong className="details-pinned-author truncate">{m.sender.name}</strong>
                <span className="details-pinned-time">{formatTime(m.createdAt)}</span>
              </div>
              <p className="details-pinned-text-clean truncate">{snippet}</p>
            </div>

            {/* Botão de Atalho */}
            <button
              type="button"
              className="details-pinned-jump-btn"
              onClick={(e) => {
                e.stopPropagation();
                onJumpToMessage?.(m.id);
              }}
              title="Ver no chat"
              aria-label="Ver mensagem no chat"
            >
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
