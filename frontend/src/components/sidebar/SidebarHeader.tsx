export type SidebarTab = "all" | "chats" | "dms" | "squads" | "calls";

type SidebarHeaderProps = {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onLogout?: () => void;
  onOpenCreateGroup: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  dmCount?: number;
  squadCount?: number;
};

export function SidebarHeader({
  activeTab,
  onTabChange,
  onOpenCreateGroup,
  onOpenSearch,
  onOpenSettings,
  dmCount = 0,
  squadCount = 0,
}: SidebarHeaderProps) {
  const isDmsActive = activeTab === "dms";
  const isSquadsActive = activeTab === "squads";
  const isCallsActive = activeTab === "calls";
  const isAllActive = activeTab === "all" || activeTab === "chats";

  return (
    <header className="sidebar-header-wrapper">
      {/* 1. Quick Search Field (⌘K / Ctrl+K) */}
      <div
        className="sidebar-quick-search"
        onClick={onOpenSearch}
        role="button"
        tabIndex={0}
        title="Buscar DMs, Squads ou mensagens (Ctrl + K)"
      >
        <div className="quick-search-left">
          <span className="material-symbols-outlined text-[15px] text-gray-500">search</span>
          <span className="quick-search-placeholder">Buscar DMs, Squads ou mensagens...</span>
        </div>
        <span className="quick-search-kbd">⌘K</span>
      </div>

      {/* 3. Dual-Mode Segmented Navigation Pill Header */}
      <nav className="sidebar-tabs" aria-label="Filtros de navegação">
        <button
          type="button"
          className={`sidebar-tab-item ${isDmsActive || isAllActive ? "active" : ""}`}
          onClick={() => onTabChange(isDmsActive ? "all" : "dms")}
          title="Mensagens Diretas"
        >
          <span className="material-symbols-outlined text-[14px]">forum</span>
          <span>DMs</span>
          {dmCount > 0 && <span className="tab-badge">{dmCount}</span>}
        </button>

        <button
          type="button"
          className={`sidebar-tab-item ${isSquadsActive ? "active" : ""}`}
          onClick={() => onTabChange("squads")}
          title="Grupos & Squads"
        >
          <span className="material-symbols-outlined text-[14px]">groups</span>
          <span>Squads</span>
          {squadCount > 0 && <span className="tab-badge subtle">{squadCount}</span>}
        </button>

        <button
          type="button"
          className={`sidebar-tab-item icon-only ${isCallsActive ? "active" : ""}`}
          onClick={() => onTabChange("calls")}
          title="Histórico de Chamadas"
          aria-label="Chamadas"
        >
          <span className="material-symbols-outlined text-[14px]">call</span>
        </button>
      </nav>
    </header>
  );
}


