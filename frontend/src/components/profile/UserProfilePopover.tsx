import React, { useEffect, useRef } from "react";
import type { User } from "../../services/api";

type UserProfilePopoverProps = {
  user: User;
  isOnline?: boolean;
  onClose: () => void;
  onSendMessage?: () => void;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
  isSelf?: boolean;
};

export function UserProfilePopover({
  user,
  isOnline = false,
  onClose,
  onSendMessage,
  onStartVoiceCall,
  onStartVideoCall,
  isSelf = false,
}: UserProfilePopoverProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const memberSinceFormatted = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Recentemente";

  const userHandle = `@${user.email ? user.email.split("@")[0] : "user"}`;
  const initial = user.name ? user.name.slice(0, 1).toUpperCase() : "U";

  return (
    <div className="profile-edit-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        ref={containerRef}
        className="profile-popover-card-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* BANNER HEADER */}
        <div
          className="profile-preview-banner"
          style={{
            backgroundColor: user.bannerColor || "#7c3aed",
            backgroundImage: user.bannerUrl ? `url(${user.bannerUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <button
            type="button"
            className="profile-popover-close-btn"
            onClick={onClose}
            title="Fechar"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* AVATAR OVERLAY */}
        <div className="profile-preview-avatar-row">
          <div className="profile-preview-avatar-circle">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="profile-preview-avatar-img" />
            ) : (
              <div
                className="profile-preview-avatar-fallback"
                style={{ backgroundColor: user.bannerColor || "#7c3aed" }}
              >
                {initial}
              </div>
            )}
            <span
              className={`profile-preview-presence-dot ${isOnline ? "online" : "offline"}`}
              title={isOnline ? "Online" : "Offline"}
            />
          </div>
        </div>

        {/* CARD DETAILS */}
        <div className="profile-preview-card-body">
          {/* BADGES */}
          <div className="profile-preview-badges">
            <span className="profile-preview-badge-item pro">
              <span className="material-symbols-outlined text-[12px] text-amber-400">verified</span>
              <span>PRO</span>
            </span>
            <span className="profile-preview-badge-item early">
              <span className="material-symbols-outlined text-[12px] text-indigo-400">military_tech</span>
              <span>EARLY</span>
            </span>
          </div>

          {/* USER IDENTITY */}
          <div className="profile-preview-identity">
            <h3 className="profile-preview-name">{user.name}</h3>
            <span className="profile-preview-handle">{userHandle}</span>
          </div>

          {/* CUSTOM STATUS */}
          {(user.customStatus || user.statusEmoji) && (
            <div className="profile-preview-status-pill">
              {user.statusEmoji && <span className="text-sm">{user.statusEmoji}</span>}
              <span className="truncate">{user.customStatus}</span>
            </div>
          )}

          {/* AÇÕES RÁPIDAS (SE NÃO FOR O PRÓPRIO USUÁRIO) */}
          {!isSelf && (
            <div className="profile-popover-actions-group">
              {onSendMessage && (
                <button
                  type="button"
                  className="profile-popover-action-btn primary"
                  onClick={() => {
                    onSendMessage();
                    onClose();
                  }}
                  title="Enviar mensagem direta"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  <span>Conversar</span>
                </button>
              )}
              {onStartVoiceCall && (
                <button
                  type="button"
                  className="profile-popover-action-btn icon"
                  onClick={() => {
                    onStartVoiceCall();
                    onClose();
                  }}
                  title="Iniciar chamada de voz"
                >
                  <span className="material-symbols-outlined text-[16px]">call</span>
                </button>
              )}
              {onStartVideoCall && (
                <button
                  type="button"
                  className="profile-popover-action-btn icon"
                  onClick={() => {
                    onStartVideoCall();
                    onClose();
                  }}
                  title="Iniciar chamada de vídeo"
                >
                  <span className="material-symbols-outlined text-[16px]">videocam</span>
                </button>
              )}
            </div>
          )}

          <div className="profile-preview-divider" />

          {/* BIO */}
          <div className="profile-preview-section">
            <h4 className="profile-preview-section-heading">SOBRE MIM</h4>
            <p className="profile-preview-bio-text">
              {user.bio?.trim() || <span className="text-slate-500 italic">Nenhuma descrição adicionada ainda.</span>}
            </p>
          </div>

          {/* JOIN DATE */}
          <div className="profile-preview-section">
            <h4 className="profile-preview-section-heading">MEMBRO DESDE</h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <span className="material-symbols-outlined text-[15px] text-slate-400">calendar_month</span>
              <span>{memberSinceFormatted}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
