export type DetailsTabKey = "media" | "docs" | "links" | "pinned" | "members";

type DetailsTabsProps = {
  activeTab: DetailsTabKey;
  onSelectTab: (tab: DetailsTabKey) => void;
  mediaCount: number;
  docsCount: number;
  linksCount: number;
  pinnedCount: number;
  isGroup: boolean;
  membersCount: number;
};

export function DetailsTabs({
  activeTab,
  onSelectTab,
  mediaCount,
  docsCount,
  linksCount,
  pinnedCount,
  isGroup,
  membersCount,
}: DetailsTabsProps) {
  return (
    <div className="chat-details-tabs-bar" role="tablist">
      <button
        type="button"
        className={`chat-details-tab-btn ${activeTab === "media" ? "active" : ""}`}
        onClick={() => onSelectTab("media")}
        role="tab"
        aria-selected={activeTab === "media"}
        title="Fotos e Vídeos"
      >
        <span className="material-symbols-outlined text-[16px]">image</span>
        <span>Mídias</span>
        {mediaCount > 0 && <span className="chat-details-tab-badge">{mediaCount}</span>}
      </button>

      <button
        type="button"
        className={`chat-details-tab-btn ${activeTab === "docs" ? "active" : ""}`}
        onClick={() => onSelectTab("docs")}
        role="tab"
        aria-selected={activeTab === "docs"}
        title="Arquivos e Documentos"
      >
        <span className="material-symbols-outlined text-[16px]">description</span>
        <span>Arquivos</span>
        {docsCount > 0 && <span className="chat-details-tab-badge">{docsCount}</span>}
      </button>

      <button
        type="button"
        className={`chat-details-tab-btn ${activeTab === "links" ? "active" : ""}`}
        onClick={() => onSelectTab("links")}
        role="tab"
        aria-selected={activeTab === "links"}
        title="Links compartilhados"
      >
        <span className="material-symbols-outlined text-[16px]">link</span>
        <span>Links</span>
        {linksCount > 0 && <span className="chat-details-tab-badge">{linksCount}</span>}
      </button>

      <button
        type="button"
        className={`chat-details-tab-btn ${activeTab === "pinned" ? "active" : ""}`}
        onClick={() => onSelectTab("pinned")}
        role="tab"
        aria-selected={activeTab === "pinned"}
        title="Mensagens fixadas"
      >
        <span className="material-symbols-outlined text-[16px]">push_pin</span>
        <span>Fixadas</span>
        {pinnedCount > 0 && <span className="chat-details-tab-badge">{pinnedCount}</span>}
      </button>

      {isGroup && (
        <button
          type="button"
          className={`chat-details-tab-btn ${activeTab === "members" ? "active" : ""}`}
          onClick={() => onSelectTab("members")}
          role="tab"
          aria-selected={activeTab === "members"}
          title="Membros do Squad"
        >
          <span className="material-symbols-outlined text-[16px]">group</span>
          <span>Membros</span>
          {membersCount > 0 && <span className="chat-details-tab-badge">{membersCount}</span>}
        </button>
      )}
    </div>
  );
}
