import type { Conversation, User } from "../../../services/api";

type DetailsMembersListProps = {
  members: Conversation["members"];
  onlineUserIds?: Set<string>;
  onUserClick?: (user: User) => void;
  isCompact?: boolean;
};

export function DetailsMembersList({
  members,
  onlineUserIds,
  onUserClick,
  isCompact = false,
}: DetailsMembersListProps) {
  return (
    <div className={`details-members-list ${isCompact ? "compact-preview" : "full-view"}`}>
      {members.map((member) => {
        const u = member.user;
        const isOnline = Boolean(onlineUserIds?.has(u.id));
        const initial = u.name ? u.name.slice(0, 2).toUpperCase() : "U";
        const role = (member as { role?: string }).role;

        return (
          <div
            key={u.id}
            className="details-member-card"
            onClick={() => onUserClick?.(u)}
            role="button"
            tabIndex={0}
            title={`Ver perfil de ${u.name}`}
          >
            <div className="details-member-left">
              <div className="details-member-avatar-wrap">
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt={u.name} className="details-member-avatar-img" />
                ) : (
                  <div
                    className="details-member-avatar-fallback"
                    style={{ backgroundColor: u.bannerColor || "#7c3aed" }}
                  >
                    {initial}
                  </div>
                )}
                <span className={`details-presence-dot small ${isOnline ? "online" : "offline"}`} />
              </div>

              <div className="details-member-info">
                <strong className="details-member-name">{u.name}</strong>
                <span className="details-member-email">
                  {u.email ? `@${u.email.split("@")[0]}` : "membro"}
                </span>
              </div>
            </div>

            {role && (
              <span className={`details-member-role-badge ${role.toLowerCase()}`}>
                {role}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
