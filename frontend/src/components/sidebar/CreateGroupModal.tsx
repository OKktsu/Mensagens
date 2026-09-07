import { useState, useMemo, FormEvent } from "react";
import type { User } from "../../services/api";
import { Avatar } from "../common/Avatar";

type CreateGroupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onCreateGroup: (participantIds: string[], title?: string) => Promise<void>;
};

export function CreateGroupModal({
  isOpen,
  onClose,
  users,
  onCreateGroup,
}: CreateGroupModalProps) {
  const [title, setTitle] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filteredUsers = useMemo(() => {
    const normalized = searchText.trim().toLowerCase();
    if (!normalized) {
      return users;
    }
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized),
    );
  }, [users, searchText]);

  if (!isOpen) {
    return null;
  }

  function handleToggleUser(userId: string) {
    setError("");
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (selectedUserIds.length < 1) {
      setError("Selecione pelo menos 1 contato para criar o grupo.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onCreateGroup(selectedUserIds, title);
      setTitle("");
      setSearchText("");
      setSelectedUserIds([]);
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível criar o grupo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setTitle("");
    setSearchText("");
    setSelectedUserIds([]);
    setError("");
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-content create-group-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="modal-header">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-violet-400">group_add</span>
            <h2 id="modal-title">Criar Novo Grupo</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn flex items-center justify-center"
            onClick={handleClose}
            aria-label="Fechar"
            title="Fechar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-field">
            <label className="modal-label" htmlFor="group-name-input">
              Nome do Grupo <span className="modal-optional-hint">(opcional)</span>
            </label>
            <div className="modal-input-wrapper">
              <span className="material-symbols-outlined modal-input-icon">groups</span>
              <input
                id="group-name-input"
                type="text"
                className="modal-text-input"
                placeholder="Ex: Time de Produto, Galera do Churrasco..."
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="modal-members-section">
            <div className="modal-section-title">
              <span>Adicionar Membros</span>
              <span className="modal-selected-badge">
                {selectedUserIds.length}{" "}
                {selectedUserIds.length === 1 ? "selecionado" : "selecionados"}
              </span>
            </div>

            <div className="modal-search-wrapper">
              <span className="material-symbols-outlined modal-search-icon">search</span>
              <input
                type="search"
                placeholder="Filtrar por nome ou email..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className="modal-search-input"
              />
              {searchText && (
                <button
                  type="button"
                  className="modal-search-clear"
                  onClick={() => setSearchText("")}
                  title="Limpar pesquisa"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            <div className="modal-user-list custom-scrollbar">
              {filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    className={`modal-user-row ${isSelected ? "selected" : ""}`}
                    onClick={() => handleToggleUser(user.id)}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        handleToggleUser(user.id);
                      }
                    }}
                  >
                    <div className={`modal-custom-checkbox ${isSelected ? "checked" : ""}`}>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[13px]">check</span>
                      )}
                    </div>
                    <Avatar name={user.name} size="small" />
                    <div className="modal-user-details">
                      <span className="modal-user-name">{user.name}</span>
                      <span className="modal-user-email">{user.email}</span>
                    </div>
                  </div>
                );
              })}

              {!filteredUsers.length && (
                <div className="modal-empty-state">
                  <span className="material-symbols-outlined text-[24px] text-gray-500 mb-1">person_search</span>
                  <p>Nenhum contato encontrado</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="modal-error-banner flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-red-400">error</span>
              <span>{error}</span>
            </div>
          )}

          <footer className="modal-footer">
            <button
              type="button"
              className="modal-btn-cancel"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="modal-btn-submit"
              disabled={selectedUserIds.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  <span>Criando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Criar Grupo</span>
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
