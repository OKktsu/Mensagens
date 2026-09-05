import { useEffect } from "react";

type ImageLightboxProps = {
  src: string | null;
  alt?: string;
  onClose: () => void;
};

export function ImageLightbox({ src, alt = "Imagem ampliada", onClose }: ImageLightboxProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (src) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div className="image-lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <button
        type="button"
        className="lightbox-close-btn"
        onClick={onClose}
        aria-label="Fechar visualizador de imagem"
      >
        ✕
      </button>

      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={alt} className="lightbox-image" />
      </div>
    </div>
  );
}
