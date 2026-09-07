import type { User } from "../../../services/api";

type DetailsHeroProps = {
  isGroup: boolean;
  title: string;
  userHandle: string;
  initial: string;
  targetUser?: User | null;
  isTargetOnline?: boolean;
  memberSinceFormatted: string;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
};

export function DetailsHero({
  isGroup,
  title,
  userHandle,
  initial,
  targetUser,
  isTargetOnline,
  memberSinceFormatted,
  onStartVoiceCall,
  onStartVideoCall,
}: DetailsHeroProps) {
  return (
    <div className="chat-details-hero">
      {/* Banner com gradiente e padrão neon */}
      <div
        className="chat-details-banner"
        style={{
          backgroundColor: targetUser?.bannerColor || "#7c3aed",
          backgroundImage: targetUser?.bannerUrl ? `url(${targetUser.bannerUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="chat-details-banner-glass-overlay" />
      </div>

      {/* Avatar e Presença */}
      <div className="chat-details-avatar-row">
        <div className="chat-details-avatar-wrap">
          {!isGroup && targetUser?.avatarUrl ? (
            <img
              src={targetUser.avatarUrl}
              alt={targetUser.name}
              className="chat-details-avatar-img"
            />
          ) : (
            <div
              className="chat-details-avatar-fallback"
              style={{ backgroundColor: targetUser?.bannerColor || "#7c3aed" }}
            >
              {initial}
            </div>
          )}
          {!isGroup && (
            <span
              className={`chat-details-presence-dot ${isTargetOnline ? "online" : "offline"}`}
              title={isTargetOnline ? "Online" : "Offline"}
            />
          )}
        </div>
      </div>

      {/* Informações de Identidade */}
      <div className="chat-details-identity">
        <div className="chat-details-title-row">
          <h2 className="chat-details-name">{title}</h2>
          {!isGroup && isTargetOnline && (
            <span className="chat-details-online-chip">
              <span className="chat-details-online-dot" />
              online
            </span>
          )}
        </div>
        {userHandle && <span className="chat-details-handle">{userHandle}</span>}

        {/* Status Personalizado */}
        {!isGroup && (targetUser?.customStatus || targetUser?.statusEmoji) && (
          <div className="chat-details-status-pill">
            {targetUser.statusEmoji && (
              <span className="chat-details-status-emoji">{targetUser.statusEmoji}</span>
            )}
            <span className="chat-details-status-text truncate">{targetUser.customStatus}</span>
          </div>
        )}

        {/* Botões de Ação Rápida */}
        <div className="chat-details-actions">
          {onStartVoiceCall && (
            <button
              type="button"
              className="chat-details-action-btn voice"
              onClick={onStartVoiceCall}
              title="Iniciar chamada de áudio"
            >
              <span className="material-symbols-outlined text-[17px]">call</span>
              <span>Áudio</span>
            </button>
          )}
          {onStartVideoCall && (
            <button
              type="button"
              className="chat-details-action-btn video"
              onClick={onStartVideoCall}
              title="Iniciar chamada de vídeo"
            >
              <span className="material-symbols-outlined text-[17px]">videocam</span>
              <span>Vídeo</span>
            </button>
          )}
        </div>

        {/* Seção Sobre Mim / Bio */}
        {!isGroup && (
          <div className="chat-details-section-box">
            <span className="chat-details-section-title">Sobre Mim</span>
            <p className="chat-details-bio-text">
              {targetUser?.bio?.trim() || (
                <span className="chat-details-empty-sub">Nenhum recado ou descrição configurada.</span>
              )}
            </p>
          </div>
        )}

        {/* Data de Criação / Membro Desde */}
        {!isGroup && (
          <div className="chat-details-meta-row">
            <span className="material-symbols-outlined text-[14px] text-violet-400">calendar_month</span>
            <span>Membro desde {memberSinceFormatted}</span>
          </div>
        )}
      </div>
    </div>
  );
}
