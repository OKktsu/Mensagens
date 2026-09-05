export type SidebarTab = "chats" | "calls";

type SidebarHeaderProps = {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onLogout: () => void;
  onOpenCreateGroup: () => void;
};

export function SidebarHeader({
  activeTab,
  onTabChange,
  onLogout,
  onOpenCreateGroup,
}: SidebarHeaderProps) {
  return (
    <header className="sidebar-header-wrapper">
      <div className="sidebar-header">
        <div>
          <span className="eyebrow">Mensagens</span>
          <h1>{activeTab === "chats" ? "Conversas" : "Chamadas"}</h1>
        </div>
        <div className="header-actions">
          {activeTab === "chats" && (
            <button
              className="ghost-button group-button"
              type="button"
              onClick={onOpenCreateGroup}
              title="Criar novo grupo"
            >
              + Grupo
            </button>
          )}
          <button className="ghost-button" type="button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </div>

      <nav className="sidebar-tabs" aria-label="Navegação lateral">
        <button
          type="button"
          className={`sidebar-tab-item ${activeTab === "chats" ? "active" : ""}`}
          onClick={() => onTabChange("chats")}
        >
          <span>💬 Conversas</span>
        </button>
        <button
          type="button"
          className={`sidebar-tab-item ${activeTab === "calls" ? "active" : ""}`}
          onClick={() => onTabChange("calls")}
        >
          <span>📞 Chamadas</span>
        </button>
      </nav>
    </header>
  );
}


