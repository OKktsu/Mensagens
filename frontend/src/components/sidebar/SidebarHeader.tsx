type SidebarHeaderProps = {
  onLogout: () => void;
  onOpenCreateGroup: () => void;
};

export function SidebarHeader({ onLogout, onOpenCreateGroup }: SidebarHeaderProps) {
  return (
    <header className="sidebar-header">
      <div>
        <span className="eyebrow">Mensagens</span>
        <h1>Conversas</h1>
      </div>
      <div className="header-actions">
        <button
          className="ghost-button group-button"
          type="button"
          onClick={onOpenCreateGroup}
          title="Criar novo grupo"
        >
          + Grupo
        </button>
        <button className="ghost-button" type="button" onClick={onLogout}>
          Sair
        </button>
      </div>
    </header>
  );
}

