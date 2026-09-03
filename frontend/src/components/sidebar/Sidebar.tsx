import type { User, Conversation } from "../../services/api";
import { SidebarHeader } from "./SidebarHeader";
import { PeopleSearch } from "./PeopleSearch";
import { ConversationList } from "./ConversationList";

type SidebarProps = {
  users: User[];
  userSearchText: string;
  onSearchChange: (text: string) => void;
  onSelectUser: (userId: string) => void;
  conversations: Conversation[];
  selectedConversationId: string | null;
  currentUserId: string;
  typingMap?: Record<string, string[]>;
  onlineUserIds?: Set<string>;
  onSelectConversation: (conversationId: string) => void;
  onLogout: () => void;
  onOpenCreateGroup: () => void;
};

export function Sidebar({
  users,
  userSearchText,
  onSearchChange,
  onSelectUser,
  conversations,
  selectedConversationId,
  currentUserId,
  typingMap,
  onlineUserIds,
  onSelectConversation,
  onLogout,
  onOpenCreateGroup,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <SidebarHeader onLogout={onLogout} onOpenCreateGroup={onOpenCreateGroup} />
      <PeopleSearch
        users={users}
        searchText={userSearchText}
        onlineUserIds={onlineUserIds}
        onSearchChange={onSearchChange}
        onSelectUser={onSelectUser}
      />
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        currentUserId={currentUserId}
        typingMap={typingMap}
        onlineUserIds={onlineUserIds}
        onSelectConversation={onSelectConversation}
      />
    </aside>
  );
}



