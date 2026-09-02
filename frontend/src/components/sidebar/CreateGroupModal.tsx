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
        className="modal-content"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="modal-header">
          <h2 id="modal-title">Criar Novo Grupo</h2>
          <button
            type="button"
            className="icon-button"
            onClick={handleClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-label">
            Nome do Grupo (opcional)
            <input
              type="text"
              placeholder="Ex: Time de Produto, Galera do Churrasco..."
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <div className="modal-section-title">
            <span>Adicionar Membros</span>
            <small>
              {selectedUserIds.length}{" "}
              {selectedUserIds.length === 1 ? "selecionado" : "selecionados"}
            </small>
          </div>

          <input
            type="search"
            placeholder="Filtrar por nome ou email..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="modal-search"
          />

          <div className="modal-user-list">
            {filteredUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);
              return (
                <label
                  key={user.id}
                  className={`modal-user-item ${isSelected ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleUser(user.id)}
                  />
                  <Avatar name={user.name} size="small" />
                  <span className="modal-user-info">
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </span>
                </label>
              );
            })}

            {!filteredUsers.length && (
              <p className="empty-state">Nenhum usuário encontrado.</p>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <footer className="modal-footer">
            <button
              type="button"
              className="ghost-button"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={selectedUserIds.length === 0 || isSubmitting}
            >
              {isSubmitting ? "Criando..." : "Criar Grupo"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
