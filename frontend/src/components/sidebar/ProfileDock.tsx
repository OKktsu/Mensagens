import { useState } from "react";
import type { AuthUser } from "../../services/api";

type ProfileDockProps = {
  currentUser: AuthUser | null;
  onLogout: () => void;
  onOpenSettings?: () => void;
  isMicMuted?: boolean;
  isAudioMuted?: boolean;
  onToggleMic?: () => void;
  onToggleAudio?: () => void;
};

export function ProfileDock({
  currentUser,
  onLogout,
  onOpenSettings,
  isMicMuted = false,
  isAudioMuted = false,
  onToggleMic,
  onToggleAudio,
}: ProfileDockProps) {
  const [internalMicMuted, setInternalMicMuted] = useState(isMicMuted);
  const [internalAudioMuted, setInternalAudioMuted] = useState(isAudioMuted);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const handleToggleMic = () => {
    if (onToggleMic) {
      onToggleMic();
    } else {
      setInternalMicMuted((prev) => !prev);
    }
  };

  const handleToggleAudio = () => {
    if (onToggleAudio) {
      onToggleAudio();
    } else {
      setInternalAudioMuted((prev) => !prev);
    }
  };

  const micActive = !(onToggleMic ? isMicMuted : internalMicMuted);
  const audioActive = !(onToggleAudio ? isAudioMuted : internalAudioMuted);

  const initial = currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "EU";

  return (
    <div className="sidebar-profile-dock">
      <div className="profile-dock-card">
        {/* User Details */}
        <div
          className="profile-user-group"
          onClick={() => setShowSettingsMenu((prev) => !prev)}
          role="button"
          tabIndex={0}
          title="Opções da Conta"
        >
          <div className="profile-avatar-squircle">
            <span>{initial}</span>
            <span className="profile-presence-dot" title="Online" />
          </div>

          <div className="profile-text-details">
            <div className="profile-name-row">
              <span className="profile-user-name">{currentUser?.name || "Usuário"}</span>
              <span className="profile-pro-badge">PRO</span>
            </div>
            <div className="profile-tag-row">
              <span className="profile-tag-dot" />
              <span className="profile-tag-text">#0001 • Online</span>
            </div>
          </div>
        </div>

        {/* Tactile Audio / Mic & Settings Controls */}
        <div className="profile-actions-group">
          <button
            type="button"
            className={`profile-action-btn ${!micActive ? "is-off" : ""}`}
            onClick={handleToggleMic}
            title={micActive ? "Microfone (Ativo)" : "Microfone (Mutado)"}
            aria-label="Microfone"
          >
            <span className="material-symbols-outlined text-[17px]">
              {micActive ? "mic" : "mic_off"}
            </span>
            {micActive && <span className="profile-btn-indicator" />}
          </button>

          <button
            type="button"
            className={`profile-action-btn ${!audioActive ? "is-off" : ""}`}
            onClick={handleToggleAudio}
            title={audioActive ? "Áudio (Ativo)" : "Áudio (Desativado)"}
            aria-label="Áudio"
          >
            <span className="material-symbols-outlined text-[17px]">
              {audioActive ? "headphones" : "headset_off"}
            </span>
            {audioActive && <span className="profile-btn-indicator" />}
          </button>

          <div className="profile-settings-wrapper">
            <button
              type="button"
              className="profile-action-btn"
              onClick={() => setShowSettingsMenu((prev) => !prev)}
              title="Opções e Sair"
              aria-label="Configurações"
            >
              <span className="material-symbols-outlined text-[17px]">settings</span>
            </button>

            {showSettingsMenu && (
              <div className="profile-settings-dropdown">
                <div className="dropdown-user-header">
                  <strong>{currentUser?.name}</strong>
                  <small>{currentUser?.email}</small>
                </div>
                {onOpenSettings && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setShowSettingsMenu(false);
                      onOpenSettings();
                    }}
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    <span>Preferências</span>
                  </button>
                )}
                <button
                  type="button"
                  className="dropdown-item danger"
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onLogout();
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>Desconectar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
