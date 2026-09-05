export type SidebarTab = "chats" | "calls";

type SidebarHeaderProps = {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onLogout: () => void;
  onOpenCreateGroup: () => void;
  onOpenSearch?: () => void;
};

export function SidebarHeader({
  activeTab,
  onTabChange,
  onLogout,
  onOpenCreateGroup,
  onOpenSearch,
}: SidebarHeaderProps) {
  return (
    <header className="sidebar-header-wrapper">
      <div className="sidebar-header">
        <div className="brand-group">
          <div className="brand-logo-squircle">
            <span className="brand-icon">⚡</span>
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <span className="brand-name">PulseHub</span>
              <span className="brand-badge">v2.4</span>
            </div>
            <span className="brand-subtitle">Workspace • Tempo Real</span>
          </div>
        </div>

        <div className="header-actions">
          {activeTab === "chats" && (
            <button
              className="ghost-button group-button"
              type="button"
              onClick={onOpenCreateGroup}
              title="Criar novo grupo / squad"
            >
              + Grupo
            </button>
          )}
          <button className="ghost-button logout-button" type="button" onClick={onLogout} title="Desconectar">
            Sair
          </button>
        </div>
      </div>

      {/* BARRA DE BUSCA RÁPIDA (CTRL+K) */}
      <div
        className="sidebar-quick-search"
        onClick={onOpenSearch}
        role="button"
        tabIndex={0}
        title="Abrir busca global (Ctrl + K)"
      >
        <span className="quick-search-icon">🔍</span>
        <span className="quick-search-placeholder">Buscar mensagens ou pessoas...</span>
        <span className="quick-search-kbd">Ctrl+K</span>
      </div>

      <nav className="sidebar-tabs" aria-label="Navegação lateral">
        <button
          type="button"
          className={`sidebar-tab-item ${activeTab === "chats" ? "active" : ""}`}
          onClick={() => onTabChange("chats")}
        >
          <span className="tab-icon">💬</span>
          <span>Conversas</span>
        </button>
        <button
          type="button"
          className={`sidebar-tab-item ${activeTab === "calls" ? "active" : ""}`}
          onClick={() => onTabChange("calls")}
        >
          <span className="tab-icon">📞</span>
          <span>Chamadas</span>
        </button>
      </nav>
    </header>
  );
}


