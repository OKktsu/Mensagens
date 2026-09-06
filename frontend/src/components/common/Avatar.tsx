import { useState } from "react";

type AvatarProps = {
  name?: string;
  initial?: string;
  src?: string | null;
  icon?: string;
  isGroup?: boolean;
  size?: "small" | "normal" | "medium" | "large";
  isOnline?: boolean;
  className?: string;
};

// Paleta de gradientes cibernéticos determinísticos para perfis sem foto
const GRADIENTS = [
  "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", // Indigo / Violet
  "linear-gradient(135deg, #0284c7 0%, #6366f1 100%)", // Sky / Indigo
  "linear-gradient(135deg, #059669 0%, #0891b2 100%)", // Emerald / Cyan
  "linear-gradient(135deg, #d97706 0%, #e11d48 100%)", // Amber / Rose
  "linear-gradient(135deg, #db2777 0%, #7c3aed 100%)", // Pink / Purple
  "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)", // Purple / Blue
];

function getGradientIndex(str: string): number {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % GRADIENTS.length;
}

export function Avatar({
  name,
  initial,
  src,
  icon,
  isGroup,
  size = "normal",
  isOnline,
  className = "",
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Determina o nome / inicial
  const displayName = name?.trim() || "";
  const displayInitial =
    initial?.trim() ||
    (displayName ? displayName.slice(0, 1).toUpperCase() : "");

  const gradientBg = getGradientIndex(displayName || initial || "user");
  const sizeClass = `avatar-${size}`;

  // Se tem imagem e não deu erro de carregamento
  if (src && !imgError) {
    return (
      <div className={`avatar-wrapper ${sizeClass} ${className}`}>
        <img
          src={src}
          alt={displayName || "Avatar"}
          className="avatar-img"
          onError={() => setImgError(true)}
          loading="lazy"
        />
        {isOnline && <span className="online-badge" title="Online" />}
      </div>
    );
  }

  // Se for grupo
  if (isGroup) {
    const groupIcon = icon || "groups";
    return (
      <div className={`avatar-wrapper ${sizeClass} ${className}`}>
        <div className="avatar-squircle is-group" title={displayName || "Grupo"}>
          <span className="material-symbols-outlined avatar-symbol">{groupIcon}</span>
        </div>
      </div>
    );
  }

  // Se for perfil de usuário sem foto
  return (
    <div className={`avatar-wrapper ${sizeClass} ${className}`}>
      <div
        className="avatar-squircle is-user"
        style={{ background: GRADIENTS[gradientBg] }}
        title={displayName || "Usuário"}
      >
        {displayInitial ? (
          <span className="avatar-text">{displayInitial}</span>
        ) : (
          <span className="material-symbols-outlined avatar-symbol">person</span>
        )}
      </div>
      {isOnline && <span className="online-badge" title="Online" />}
    </div>
  );
}
