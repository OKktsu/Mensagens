import { useState, useRef, useEffect } from "react";
import type { AuthUser } from "../../services/api";

type ProfileDockProps = {
  currentUser: AuthUser | null;
  onLogout: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  isMicMuted?: boolean;
  isAudioMuted?: boolean;
  isVideoOff?: boolean;
  isInCall?: boolean;
  onToggleMic?: () => void;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
};

export function ProfileDock({
  currentUser,
  onLogout,
  onOpenProfile,
  onOpenSettings,
  isMicMuted = false,
  isAudioMuted = false,
  isVideoOff = true,
  isInCall = false,
  onToggleMic,
  onToggleAudio,
  onToggleVideo,
}: ProfileDockProps) {
  const [internalMicMuted, setInternalMicMuted] = useState(isMicMuted);
  const [internalAudioMuted, setInternalAudioMuted] = useState(isAudioMuted);
  const [internalVideoOff, setInternalVideoOff] = useState(isVideoOff);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    if (showSettingsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettingsMenu]);

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

  const handleToggleVideo = () => {
    if (onToggleVideo) {
      onToggleVideo();
    } else {
      setInternalVideoOff((prev) => !prev);
    }
  };

  const micActive = !(onToggleMic ? isMicMuted : internalMicMuted);
  const audioActive = !(onToggleAudio ? isAudioMuted : internalAudioMuted);
  const videoActive = !(onToggleVideo ? isVideoOff : internalVideoOff);

  const initial = currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "EU";

  return (
    <div className="sidebar-profile-dock">
      <div className="profile-dock-card">
        {/* User Details */}
        <div
          className="profile-user-group"
          onClick={() => {
            if (onOpenProfile) {
              onOpenProfile();
            } else {
              setShowSettingsMenu((prev) => !prev);
            }
          }}
          role="button"
          tabIndex={0}
          title="Ver e Editar Perfil"
        >
          <div className="profile-avatar-squircle">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="avatar-img"
              />
            ) : (
              <span>{initial}</span>
            )}
            <span className="profile-presence-dot" title="Online" />
          </div>

          <div className="profile-text-details">
            <span className="profile-user-name">{currentUser?.name || "Usuário"}</span>
            {(currentUser?.customStatus || currentUser?.statusEmoji) ? (
              <span className="profile-custom-status-snippet">
                {currentUser.statusEmoji && <span className="mr-0.5">{currentUser.statusEmoji}</span>}
                <span className="truncate">{currentUser.customStatus}</span>
              </span>
            ) : (
              <span className="profile-user-handle">
                Online
              </span>
            )}
          </div>
        </div>

        {/* Tactile Audio / Mic / Video & Settings Controls */}
        <div className="profile-actions-group">
          {/* Microfone */}
          <button
            type="button"
            className={`profile-action-btn ${micActive ? "is-active" : "is-off"}`}
            onClick={handleToggleMic}
            title={micActive ? "Silenciar Microfone" : "Ativar Microfone"}
            aria-label="Microfone"
          >
            <span className="material-symbols-outlined text-[17px]">
              {micActive ? "mic" : "mic_off"}
            </span>
          </button>

          {/* Áudio / Fone */}
          <button
            type="button"
            className={`profile-action-btn ${audioActive ? "is-active" : "is-off"}`}
            onClick={handleToggleAudio}
            title={audioActive ? "Desativar Áudio" : "Ativar Áudio"}
            aria-label="Áudio"
          >
            <span className="material-symbols-outlined text-[17px]">
              {audioActive ? "headphones" : "headset_off"}
            </span>
          </button>

          {/* Câmera / Vídeo */}
          <button
            type="button"
            className={`profile-action-btn ${videoActive ? "is-active" : "is-off"}`}
            onClick={handleToggleVideo}
            title={videoActive ? "Desligar Câmera de Vídeo" : "Ligar Câmera de Vídeo"}
            aria-label="Câmera"
          >
            <span className="material-symbols-outlined text-[17px]">
              {videoActive ? "videocam" : "videocam_off"}
            </span>
          </button>

          {/* Configurações */}
          <div className="profile-settings-wrapper" ref={dropdownRef}>
            <button
              type="button"
              className="profile-action-btn"
              onClick={() => setShowSettingsMenu((prev) => !prev)}
              title="Opções de Perfil e Conta"
              aria-label="Configurações"
            >
              <span className="material-symbols-outlined text-[17px]">settings</span>
            </button>

            {showSettingsMenu && (
              <div className="profile-settings-dropdown animate-fade-in-up">
                <div className="dropdown-user-header">
                  <strong>{currentUser?.name}</strong>
                  <small>{currentUser?.email}</small>
                </div>
                {onOpenProfile && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setShowSettingsMenu(false);
                      onOpenProfile();
                    }}
                  >
                    <span className="material-symbols-outlined text-[16px] text-indigo-400">person</span>
                    <span>Editar Perfil</span>
                  </button>
                )}
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

