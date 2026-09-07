import type { Message } from "../../../services/api";
import { getMediaUrl } from "../../../services/api";
import { formatTime } from "../../../utils/chat-helpers";

type DetailsDocsListProps = {
  docMessages: Message[];
  onPdfClick?: (url: string, fileName?: string) => void;
  isCompact?: boolean;
};

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFileName(fileName?: string | null): string {
  if (!fileName) return "Documento";
  let cleaned = fileName.replace(/^\d+[-_]\d+[-_]?/, "").replace(/^[a-f0-9-]{36}[-_]/i, "");
  cleaned = cleaned.replace(/^\d{10,14}[-_]/, "");
  return cleaned || fileName;
}

function getFileExtensionInfo(fileName?: string | null, fileUrl?: string | null) {
  const name = (fileName || fileUrl || "").toLowerCase();
  if (name.endsWith(".pdf") || name.includes(".pdf")) {
    return { ext: "PDF", icon: "picture_as_pdf", colorClass: "pdf" };
  }
  if (name.endsWith(".zip") || name.endsWith(".rar") || name.endsWith(".7z") || name.endsWith(".tar")) {
    return { ext: "ZIP", icon: "folder_zip", colorClass: "archive" };
  }
  if (name.endsWith(".doc") || name.endsWith(".docx") || name.endsWith(".odt")) {
    return { ext: "DOC", icon: "article", colorClass: "word" };
  }
  if (name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) {
    return { ext: "XLS", icon: "table_chart", colorClass: "sheet" };
  }
  if (name.endsWith(".js") || name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".json") || name.endsWith(".html")) {
    return { ext: "CODE", icon: "code", colorClass: "code" };
  }
  return { ext: "DOC", icon: "draft", colorClass: "generic" };
}

export function DetailsDocsList({
  docMessages,
  onPdfClick,
  isCompact = false,
}: DetailsDocsListProps) {
  if (docMessages.length === 0) {
    return (
      <div className="details-empty-state">
        <div className="details-empty-icon-wrap rose">
          <span className="material-symbols-outlined text-[26px] text-rose-400">folder_open</span>
        </div>
        <strong className="details-empty-title">Sem documentos</strong>
        <p className="details-empty-sub">Nenhum documento ou arquivo PDF compartilhado.</p>
      </div>
    );
  }

  return (
    <div className={`details-docs-list ${isCompact ? "compact-preview" : "full-view"}`}>
      {docMessages.map((m) => {
        const url = getMediaUrl(m.fileUrl || "");
        const extInfo = getFileExtensionInfo(m.fileName, m.fileUrl);
        const isPdf = extInfo.ext === "PDF";
        const displayName = formatFileName(m.fileName);

        return (
          <div
            key={m.id}
            className={`details-doc-card ${extInfo.colorClass}`}
            onClick={() => {
              if (isPdf && onPdfClick) {
                onPdfClick(url, displayName);
              }
            }}
          >
            {/* Ícone Estilizado */}
            <div className={`details-doc-icon-wrap ${extInfo.colorClass}`}>
              <span className="material-symbols-outlined text-[21px]">
                {extInfo.icon}
              </span>
            </div>

            <div className="details-doc-details">
              <strong className="details-doc-title" title={m.fileName || undefined}>
                {displayName}
              </strong>
              <div className="details-doc-meta-row">
                {m.fileSize ? <span className="details-doc-size">{formatBytes(m.fileSize)}</span> : null}
                <span className="details-doc-dot">•</span>
                <span className="details-doc-sender truncate">{m.sender.name}</span>
                <span className="details-doc-dot">•</span>
                <span className="details-doc-time">{formatTime(m.createdAt)}</span>
              </div>
            </div>

            <div className="details-doc-actions">
              {isPdf && onPdfClick ? (
                <button
                  type="button"
                  className="details-doc-action-btn preview"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPdfClick(url, displayName);
                  }}
                  title="Visualizar PDF"
                  aria-label="Visualizar PDF"
                >
                  <span className="material-symbols-outlined text-[15px]">visibility</span>
                </button>
              ) : null}

              <a
                href={url}
                download={displayName}
                target="_blank"
                rel="noopener noreferrer"
                className="details-doc-action-btn download"
                onClick={(e) => e.stopPropagation()}
                title="Baixar arquivo"
                aria-label="Baixar arquivo"
              >
                <span className="material-symbols-outlined text-[15px]">download</span>
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
