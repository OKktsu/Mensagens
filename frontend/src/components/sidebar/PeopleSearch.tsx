import { useMemo } from "react";
import type { User } from "../../services/api";
import { Avatar } from "../common/Avatar";

type PeopleSearchProps = {
  users: User[];
  searchText: string;
  onlineUserIds?: Set<string>;
  onSearchChange: (text: string) => void;
  onSelectUser: (userId: string) => void;
};

export function PeopleSearch({
  users,
  searchText,
  onlineUserIds,
  onSearchChange,
  onSelectUser,
}: PeopleSearchProps) {
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

  return (
    <section className="people-panel" aria-label="Encontrar pessoas">
      <div className="people-panel-header">
        <strong>Encontrar pessoas</strong>
        <span>{users.length} disponíveis</span>
      </div>

      <input
        type="search"
        placeholder="Buscar por nome ou email"
        aria-label="Buscar pessoas"
        value={searchText}
        onChange={(event) => onSearchChange(event.target.value)}
      />

      <div className="people-list">
        {filteredUsers.map((user) => (
          <button
            className="person-item"
            type="button"
            key={user.id}
            onClick={() => onSelectUser(user.id)}
          >
            <Avatar
              name={user.name}
              size="small"
              isOnline={Boolean(onlineUserIds?.has(user.id))}
            />
            <span>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </span>
            <strong>Conversar</strong>
          </button>
        ))}
      </div>


      {!users.length && (
        <p className="empty-state">
          Crie outra conta em outro navegador para testar uma conversa.
        </p>
      )}

      {Boolean(users.length) && !filteredUsers.length && (
        <p className="empty-state">Nenhum usuário encontrado para essa busca.</p>
      )}
    </section>
  );
}
