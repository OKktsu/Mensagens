import { useMemo } from "react";
import type { User, Conversation, CallRecord, AuthUser } from "../../services/api";
import { SidebarHeader, SidebarTab } from "./SidebarHeader";
import { PeopleSearch } from "./PeopleSearch";
import { ConversationList } from "./ConversationList";
import { CallList } from "./CallList";
import { ProfileDock } from "./ProfileDock";

type SidebarProps = {
  users: User[];
  userSearchText: string;
  onSearchChange: (text: string) => void;
  onSelectUser: (userId: string) => void;
  conversations: Conversation[];
  selectedConversationId: string | null;
  currentUserId: string;
  currentUser?: AuthUser | null;
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
  onOpenSettings?: () => void;
};

export function Sidebar({
  users,
  userSearchText,
  onSearchChange,
  onSelectUser,
  conversations,
  selectedConversationId,
  currentUserId,
  currentUser,
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
  onOpenSettings,
}: SidebarProps) {
  // Contadores de DMs e Squads para as pílulas de navegação
  const { dmCount, squadCount } = useMemo(() => {
    let dms = 0;
    let squads = 0;
    for (const c of conversations) {
      if (c.title || c.members.length > 2) {
        squads += 1;
      } else {
        dms += 1;
      }
    }
    return { dmCount: dms, squadCount: squads };
  }, [conversations]);

  const isCallView = activeTab === "calls";

  return (
    <aside aria-label="PulseChat Modular Workspace Hub" className="sidebar">
      {/* Top Header com Marca, Busca e Pílulas */}
      <SidebarHeader
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenCreateGroup={onOpenCreateGroup}
        onOpenSearch={onOpenSearch}
        onOpenSettings={onOpenSettings}
        dmCount={dmCount}
        squadCount={squadCount}
      />

      {/* Busca de Pessoas (se houver texto de busca ativo) */}
      {userSearchText.trim() && (
        <PeopleSearch
          users={users}
          searchText={userSearchText}
          onlineUserIds={onlineUserIds}
          onSearchChange={onSearchChange}
          onSelectUser={onSelectUser}
        />
      )}

      {/* Conteúdo Principal da Barra Lateral */}
      {isCallView ? (
        <CallList
          calls={calls}
          currentUserId={currentUserId}
          onStartVoiceCall={onStartVoiceCall}
          onStartVideoCall={onStartVideoCall}
        />
      ) : (
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          currentUserId={currentUserId}
          typingMap={typingMap}
          onlineUserIds={onlineUserIds}
          filterTab={activeTab}
          onSelectConversation={onSelectConversation}
          onOpenCreateGroup={onOpenCreateGroup}
          onOpenNewDm={() => onOpenSearch?.()}
          onStartVoiceCall={(id, name, convId) => onStartVoiceCall(id, name, convId)}
        />
      )}

      {/* Dock Tátil de Perfil na Base */}
      <ProfileDock
        currentUser={currentUser ?? null}
        onLogout={onLogout}
        onOpenSettings={onOpenSettings}
      />
    </aside>
  );
}
