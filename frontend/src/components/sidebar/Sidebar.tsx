import type { User, Conversation, CallRecord } from "../../services/api";
import { SidebarHeader, SidebarTab } from "./SidebarHeader";
import { PeopleSearch } from "./PeopleSearch";
import { ConversationList } from "./ConversationList";
import { CallList } from "./CallList";

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
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  calls: CallRecord[];
  onStartVoiceCall: (userId: string, userName: string, conversationId?: string) => void;
  onStartVideoCall: (userId: string, userName: string, conversationId?: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onLogout: () => void;
  onOpenCreateGroup: () => void;
  onOpenSearch?: () => void;
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
  activeTab,
  onTabChange,
  calls,
  onStartVoiceCall,
  onStartVideoCall,
  onSelectConversation,
  onLogout,
  onOpenCreateGroup,
  onOpenSearch,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <SidebarHeader
        activeTab={activeTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
        onOpenCreateGroup={onOpenCreateGroup}
        onOpenSearch={onOpenSearch}
      />

      {activeTab === "chats" ? (
        <>
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
        </>
      ) : (
        <CallList
          calls={calls}
          currentUserId={currentUserId}
          onStartVoiceCall={onStartVoiceCall}
          onStartVideoCall={onStartVideoCall}
        />
      )}
    </aside>
  );
}




