import React from "react";

type DetailsSectionCardProps = {
  title: string;
  icon: string;
  count: number;
  accentColor?: "violet" | "emerald" | "rose" | "indigo" | "amber" | "cyan";
  onViewAll?: () => void;
  children: React.ReactNode;
  emptyMessage?: string;
};

export function DetailsSectionCard({
  title,
  icon,
  count,
  accentColor = "violet",
  onViewAll,
  children,
  emptyMessage = "Nenhum item disponível",
}: DetailsSectionCardProps) {
  return (
    <section className={`details-category-section accent-${accentColor}`}>
      <div className="details-category-header">
        <div className="details-category-title-group">
          <div className={`details-category-icon-bubble accent-${accentColor}`}>
            <span className="material-symbols-outlined text-[15px]">{icon}</span>
          </div>
          <h4 className="details-category-heading">{title}</h4>
          {count > 0 && (
            <span className={`details-category-badge accent-${accentColor}`}>
              {count}
            </span>
          )}
        </div>

        {count > 0 && onViewAll && (
          <button
            type="button"
            className={`details-category-view-all-btn accent-${accentColor}`}
            onClick={onViewAll}
            title={`Ver todos os ${count} itens`}
          >
            <span>Ver mais</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        )}
      </div>

      <div className="details-category-body">
        {count > 0 ? (
          children
        ) : (
          <div className="details-category-empty">
            <span className="material-symbols-outlined text-[16px] text-slate-600">{icon}</span>
            <span className="details-category-empty-text">{emptyMessage}</span>
          </div>
        )}
      </div>
    </section>
  );
}
