import React, { useState, useEffect, useRef } from "react";
import {
  AuthUser,
  updateUserProfile,
  uploadUserAvatar,
  removeUserAvatar,
  uploadUserBanner,
  removeUserBanner,
} from "../../services/api";

type ProfileSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  token: string;
  onProfileUpdated: (updatedUser: AuthUser) => void;
};

const BANNER_THEME_COLORS = [
  { name: "Pulse Violet", color: "#7c3aed" },
  { name: "Cyber Indigo", color: "#6366f1" },
  { name: "Electric Cyan", color: "#06b6d4" },
  { name: "Emerald Glow", color: "#10b981" },
  { name: "Amber Flame", color: "#f59e0b" },
  { name: "Rose Sunset", color: "#f43f5e" },
  { name: "Neon Magenta", color: "#d946ef" },
  { name: "Obsidian Dark", color: "#1e2029" },
  { name: "Slate Navy", color: "#334155" },
];

const STATUS_EMOJI_LIST = [
  "💻", "🚀", "🎮", "🎧", "☕", "⚡", "🔥", "✨", "🧠", "🎯", "💬", "🍕", "💤", "❤️", "👑", "🔮"
];

export function ProfileSettingsModal({
  isOpen,
  onClose,
  currentUser,
  token,
  onProfileUpdated,
}: ProfileSettingsModalProps) {
  // Form values
  const [name, setName] = useState(currentUser.name || "");
  const [bio, setBio] = useState(currentUser.bio || "");
  const [bannerColor, setBannerColor] = useState(currentUser.bannerColor || "#7c3aed");
  const [customStatus, setCustomStatus] = useState(currentUser.customStatus || "");
  const [statusEmoji, setStatusEmoji] = useState(currentUser.statusEmoji || "");

  // Media preview states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatarUrl || null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(currentUser.bannerUrl || null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [isAvatarRemoved, setIsAvatarRemoved] = useState(false);
  const [isBannerRemoved, setIsBannerRemoved] = useState(false);

  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || "");
      setBio(currentUser.bio || "");
      setBannerColor(currentUser.bannerColor || "#7c3aed");
      setCustomStatus(currentUser.customStatus || "");
      setStatusEmoji(currentUser.statusEmoji || "");
      setAvatarPreview(currentUser.avatarUrl || null);
      setBannerPreview(currentUser.bannerUrl || null);
      setSelectedAvatarFile(null);
      setSelectedBannerFile(null);
      setIsAvatarRemoved(false);
      setIsBannerRemoved(false);
      setErrorMessage("");
      setSuccessMessage("");
      setIsEmojiPickerOpen(false);
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDirty =
    name !== (currentUser.name || "") ||
    bio !== (currentUser.bio || "") ||
    bannerColor !== (currentUser.bannerColor || "#7c3aed") ||
    customStatus !== (currentUser.customStatus || "") ||
    statusEmoji !== (currentUser.statusEmoji || "") ||
    selectedAvatarFile !== null ||
    selectedBannerFile !== null ||
    isAvatarRemoved ||
    isBannerRemoved;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Por favor, selecione um arquivo de imagem válido.");
        return;
      }
      setSelectedAvatarFile(file);
      setIsAvatarRemoved(false);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Por favor, selecione um arquivo de imagem válido.");
        return;
      }
      setSelectedBannerFile(file);
      setIsBannerRemoved(false);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveAvatar = () => {
    setSelectedAvatarFile(null);
    setIsAvatarRemoved(true);
    setAvatarPreview(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleRemoveBanner = () => {
    setSelectedBannerFile(null);
    setIsBannerRemoved(true);
    setBannerPreview(null);
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  };

  const handleReset = () => {
    setName(currentUser.name || "");
    setBio(currentUser.bio || "");
    setBannerColor(currentUser.bannerColor || "#7c3aed");
    setCustomStatus(currentUser.customStatus || "");
    setStatusEmoji(currentUser.statusEmoji || "");
    setAvatarPreview(currentUser.avatarUrl || null);
    setBannerPreview(currentUser.bannerUrl || null);
    setSelectedAvatarFile(null);
    setSelectedBannerFile(null);
    setIsAvatarRemoved(false);
    setIsBannerRemoved(false);
    setErrorMessage("");
    setSuccessMessage("");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMessage("O nome de exibição não pode estar vazio.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      let updated = currentUser;

      // 1. Avatar
      if (selectedAvatarFile) {
        const res = await uploadUserAvatar(token, selectedAvatarFile);
        updated = { ...updated, ...res.user };
      } else if (isAvatarRemoved) {
        const res = await removeUserAvatar(token);
        updated = { ...updated, ...res.user };
      }

      // 2. Banner
      if (selectedBannerFile) {
        const res = await uploadUserBanner(token, selectedBannerFile);
        updated = { ...updated, ...res.user };
      } else if (isBannerRemoved) {
        const res = await removeUserBanner(token);
        updated = { ...updated, ...res.user };
      }

      // 3. Info
      const res = await updateUserProfile(token, {
        name: name.trim(),
        bio: bio.trim(),
        bannerColor,
        customStatus: customStatus.trim() || null,
        statusEmoji: statusEmoji.trim() || null,
      });

      updated = { ...updated, ...res.user };

      onProfileUpdated(updated);
      setSuccessMessage("Perfil salvo com sucesso!");
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao salvar o perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  const memberSinceFormatted = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Recentemente";

  const userHandle = `@${currentUser.email ? currentUser.email.split("@")[0] : "user"}`;
  const initial = name.trim() ? name.trim().slice(0, 1).toUpperCase() : "U";

  if (!isOpen) {
    return null;
  }

  return (
    <div className="profile-edit-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="profile-edit-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* CABEÇALHO */}
        <header className="profile-edit-header">
          <div className="profile-edit-header-title">
            <div className="profile-edit-header-icon">
              <span className="material-symbols-outlined text-[20px] text-violet-400">tune</span>
            </div>
            <div>
              <h2 className="profile-edit-title-text">Personalizar Perfil</h2>
              <p className="profile-edit-subtitle-text">Configure sua identidade visual e preferências do chat</p>
            </div>
          </div>
          <button
            type="button"
            className="profile-edit-close-btn"
            onClick={onClose}
            title="Fechar (Esc)"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </header>

        {/* CORPO EM 2 COLUNAS */}
        <div className="profile-edit-body">
          {/* COLUNA ESQUERDA: FORMULÁRIO */}
          <div className="profile-edit-form-side">
            {errorMessage && (
              <div className="profile-edit-alert error">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="profile-edit-alert success">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* 1. NOME DE EXIBIÇÃO */}
            <div className="profile-edit-form-group">
              <label className="profile-edit-label" htmlFor="edit-profile-name">
                Nome de Exibição
              </label>
              <input
                id="edit-profile-name"
                type="text"
                className="profile-edit-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome no chat"
                maxLength={32}
              />
            </div>

            {/* 2. AVATAR */}
            <div className="profile-edit-form-group">
              <label className="profile-edit-label">Foto de Perfil</label>
              <div className="profile-edit-avatar-controls">
                <div className="profile-edit-avatar-thumb">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="profile-edit-avatar-img" />
                  ) : (
                    <div
                      className="profile-edit-avatar-fallback"
                      style={{ backgroundColor: bannerColor }}
                    >
                      {initial}
                    </div>
                  )}
                </div>

                <div className="profile-edit-avatar-btn-group">
                  <button
                    type="button"
                    className="profile-edit-btn primary"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                    <span>Carregar Foto</span>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                  />

                  {avatarPreview && (
                    <button
                      type="button"
                      className="profile-edit-btn danger"
                      onClick={handleRemoveAvatar}
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Remover</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3. CAPA / BANNER */}
            <div className="profile-edit-form-group">
              <label className="profile-edit-label">Capa do Perfil (Banner)</label>
              <div className="profile-edit-banner-controls">
                <div className="profile-edit-banner-btn-group">
                  <button
                    type="button"
                    className="profile-edit-btn secondary"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <span className="material-symbols-outlined text-[16px]">image</span>
                    <span>Carregar Imagem de Capa</span>
                  </button>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleBannerChange}
                  />

                  {bannerPreview && (
                    <button
                      type="button"
                      className="profile-edit-btn danger"
                      onClick={handleRemoveBanner}
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Remover Imagem</span>
                    </button>
                  )}
                </div>

                {/* Paleta de Cores */}
                <div className="profile-edit-theme-palette">
                  <span className="profile-edit-palette-title">
                    Cor Temática de Destaque
                  </span>
                  <div className="profile-edit-swatches-row">
                    {BANNER_THEME_COLORS.map((t) => (
                      <button
                        key={t.color}
                        type="button"
                        className={`profile-edit-swatch ${bannerColor === t.color ? "active" : ""}`}
                        style={{ backgroundColor: t.color }}
                        onClick={() => setBannerColor(t.color)}
                        title={t.name}
                      />
                    ))}
                    <label className="profile-edit-custom-color-btn" title="Cor personalizada">
                      <input
                        type="color"
                        value={bannerColor}
                        onChange={(e) => setBannerColor(e.target.value)}
                        className="profile-edit-hidden-color-input"
                      />
                      <span className="material-symbols-outlined text-[16px] text-white">colorize</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. SOBRE MIM (BIO) */}
            <div className="profile-edit-form-group">
              <div className="profile-edit-label-row">
                <label className="profile-edit-label" htmlFor="edit-profile-bio">
                  Sobre Mim (Bio)
                </label>
                <span className="profile-edit-char-counter">{bio.length} / 190</span>
              </div>
              <textarea
                id="edit-profile-bio"
                className="profile-edit-textarea"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Compartilhe algo sobre você, seus projetos ou interesses..."
                maxLength={190}
              />
            </div>

            {/* 5. STATUS PERSONALIZADO */}
            <div className="profile-edit-form-group">
              <label className="profile-edit-label">Status Personalizado</label>
              <div className="profile-edit-status-box">
                <button
                  type="button"
                  className="profile-edit-status-emoji-btn"
                  onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                  title="Selecionar emoji de status"
                >
                  <span>{statusEmoji || "💬"}</span>
                </button>

                <input
                  type="text"
                  className="profile-edit-status-input"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="O que você está pensando agora?"
                  maxLength={50}
                />

                {(customStatus || statusEmoji) && (
                  <button
                    type="button"
                    className="profile-edit-status-clear-btn"
                    onClick={() => {
                      setCustomStatus("");
                      setStatusEmoji("");
                    }}
                    title="Limpar status"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                )}

                {/* Popover de Emoji */}
                {isEmojiPickerOpen && (
                  <div className="profile-edit-emoji-dropdown">
                    <div className="profile-edit-emoji-dropdown-header">
                      <span className="text-[11px] font-bold text-slate-300">Selecione um Emoji</span>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-white text-xs"
                        onClick={() => setIsEmojiPickerOpen(false)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="profile-edit-emoji-grid">
                      {STATUS_EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="profile-edit-emoji-item"
                          onClick={() => {
                            setStatusEmoji(emoji);
                            setIsEmojiPickerOpen(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: LIVE PREVIEW */}
          <div className="profile-edit-preview-side">
            <span className="profile-edit-preview-badge">Prévia do Cartão de Perfil</span>

            {/* CARTÃO DE PREVIEW */}
            <div className="profile-preview-card">
              {/* BANNER HEADER */}
              <div
                className="profile-preview-banner"
                style={{
                  backgroundColor: bannerColor,
                  backgroundImage: bannerPreview ? `url(${bannerPreview})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />

              {/* AVATAR OVERLAY */}
              <div className="profile-preview-avatar-row">
                <div className="profile-preview-avatar-circle">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="profile-preview-avatar-img" />
                  ) : (
                    <div
                      className="profile-preview-avatar-fallback"
                      style={{ backgroundColor: bannerColor }}
                    >
                      {initial}
                    </div>
                  )}
                  <span className="profile-preview-presence-dot online" title="Online" />
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
                  <h3 className="profile-preview-name">{name.trim() || "Seu Nome"}</h3>
                  <span className="profile-preview-handle">{userHandle}</span>
                </div>

                {/* CUSTOM STATUS */}
                {(customStatus || statusEmoji) && (
                  <div className="profile-preview-status-pill">
                    {statusEmoji && <span className="text-sm">{statusEmoji}</span>}
                    <span className="truncate">{customStatus || "Status ativo"}</span>
                  </div>
                )}

                <div className="profile-preview-divider" />

                {/* BIO */}
                <div className="profile-preview-section">
                  <h4 className="profile-preview-section-heading">SOBRE MIM</h4>
                  <p className="profile-preview-bio-text">
                    {bio.trim() || <span className="profile-preview-bio-empty">Nenhuma descrição adicionada ainda.</span>}
                  </p>
                </div>

                {/* JOIN DATE */}
                <div className="profile-preview-section">
                  <h4 className="profile-preview-section-heading">MEMBRO DESDE</h4>
                  <div className="profile-preview-member-since">
                    <span className="material-symbols-outlined text-[15px] text-slate-400">calendar_month</span>
                    <span>{memberSinceFormatted}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE SALVAMENTO FIXADA NO RODAPÉ DO MODAL (NUNCA TAPA O FORMULÁRIO) */}
        {isDirty && (
          <div className="profile-edit-savebar-dock animate-fade-in-up">
            <div className="profile-savebar-left">
              <span className="material-symbols-outlined text-amber-400 text-[18px]">warning</span>
              <span className="profile-savebar-text">
                Você tem alterações não salvas
              </span>
            </div>

            <div className="profile-savebar-actions">
              <button
                type="button"
                className="profile-savebar-btn reset"
                onClick={handleReset}
                disabled={isSaving}
              >
                Descartar
              </button>
              <button
                type="button"
                className="profile-savebar-btn save"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="profile-savebar-loading">
                    <span className="profile-savebar-spinner" />
                    <span>Salvando...</span>
                  </span>
                ) : (
                  <span>Salvar Alterações</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
