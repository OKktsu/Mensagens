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
    <section className="pdf-stage-container" role="region" aria-label="Visualizador de PDF">
      {/* CABEÇALHO DO VISUALIZADOR DE PDF */}
      <header className="pdf-stage-header">
        <div className="pdf-stage-left">
          <button
            type="button"
            className="pdf-stage-back-btn"
            onClick={onClose}
            title="Voltar para a conversa (Esc)"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="text-xs font-semibold">Voltar</span>
          </button>

          <div className="pdf-stage-divider" />

          <div className="pdf-stage-title-box">
            <div className="pdf-stage-icon-wrap">
              <span className="material-symbols-outlined text-rose-400 text-[20px]">picture_as_pdf</span>
            </div>
            <div className="pdf-stage-text-group">
              <strong className="pdf-stage-filename" title={fileName || "Documento PDF"}>
                {fileName || "Documento PDF"}
              </strong>
              <span className="pdf-stage-subtitle">Visualização de Documento</span>
            </div>
          </div>
        </div>

        <div className="pdf-stage-actions">
          <a
            href={pdfUrl}
            download={fileName || "documento.pdf"}
            className="pdf-stage-btn pdf-stage-btn-download"
            title="Baixar PDF no dispositivo"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Baixar</span>
          </a>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pdf-stage-btn pdf-stage-btn-external"
            title="Abrir em nova aba"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            <span>Nova aba</span>
          </a>
        </div>
      </header>

      {/* CORPO DO VISUALIZADOR DE PDF */}
      <div className="pdf-stage-body">
        <iframe
          src={`${pdfUrl}#toolbar=1`}
          title={fileName || "Visualizador de PDF"}
          className="pdf-stage-iframe"
        />
      </div>
    </section>
  );
}

