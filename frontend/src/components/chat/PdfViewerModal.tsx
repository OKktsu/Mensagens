import { useEffect } from "react";

type PdfViewerModalProps = {
  pdfUrl: string;
  fileName?: string;
  onClose: () => void;
};

export function PdfViewerModal({ pdfUrl, fileName, onClose }: PdfViewerModalProps) {
  // Fechar no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="pdf-modal-backdrop" onClick={onClose}>
      <div className="pdf-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* CABEÇALHO DO MODAL */}
        <header className="pdf-modal-header">
          <div className="pdf-modal-title-box">
            <span className="pdf-modal-icon">📄</span>
            <div className="pdf-modal-text-group">
              <strong className="pdf-modal-filename">{fileName || "Documento PDF"}</strong>
              <span className="pdf-modal-subtitle">Visualização no Chat</span>
            </div>
          </div>

          <div className="pdf-modal-actions">
            <a
              href={pdfUrl}
              download={fileName || "documento.pdf"}
              className="pdf-btn pdf-btn-download"
              title="Baixar PDF no dispositivo"
            >
              <span>⬇ Baixar</span>
            </a>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-btn pdf-btn-external"
              title="Abrir em nova aba"
            >
              <span>↗ Nova aba</span>
            </a>

            <button
              type="button"
              className="pdf-btn pdf-btn-close"
              onClick={onClose}
              title="Fechar visualização (Esc)"
            >
              ✕
            </button>
          </div>
        </header>

        {/* CORPO DO VISUALIZADOR DE PDF */}
        <div className="pdf-modal-body">
          <iframe
            src={`${pdfUrl}#toolbar=1`}
            title={fileName || "Visualizador de PDF"}
            className="pdf-modal-iframe"
          />
        </div>
      </div>
    </div>
  );
}
