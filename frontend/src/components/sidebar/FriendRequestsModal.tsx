import { useState } from "react";
import type { ConversationRequest } from "../../services/api";
import { Avatar } from "../common/Avatar";

type FriendRequestsModalProps = {
  isOpen: boolean;
  receivedRequests: ConversationRequest[];
  sentRequests: ConversationRequest[];
  onClose: () => void;
  onAccept: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
  onCancel: (requestId: string) => Promise<void>;
};

export function FriendRequestsModal({
  isOpen,
  receivedRequests,
  sentRequests,
  onClose,
  onAccept,
  onReject,
  onCancel,
}: FriendRequestsModalProps) {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) {
    return null;
  }

  async function runAction(action: () => Promise<void>) {
    setIsSubmitting(true);
    setError("");

    try {
      await action();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Não foi possível atualizar a solicitação.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content friend-requests-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="friend-requests-title"
      >
        {/* CABEÇALHO */}
        <header className="modal-header">
          <div className="friend-requests-header-left">
            <div className="friend-requests-icon-badge">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div className="friend-requests-title-group">
              <h2 id="friend-requests-title" className="friend-requests-title">
                Pedidos de Amizade
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </header>

        {/* CORPO COM PADDING ADEQUADO */}
        <div className="friend-requests-body">
          {/* SELETOR DE ABAS SEGMENTADAS */}
          <div className="friend-requests-tabs">
            <button
              type="button"
              className={`friend-requests-tab ${activeTab === "received" ? "is-active" : ""}`}
              onClick={() => setActiveTab("received")}
            >
              <span className="material-symbols-outlined text-[16px]">inbox</span>
              <span>Recebidos</span>
              <span className={`tab-counter ${receivedRequests.length > 0 ? "has-badge" : ""}`}>
                {receivedRequests.length}
              </span>
            </button>

            <button
              type="button"
              className={`friend-requests-tab ${activeTab === "sent" ? "is-active" : ""}`}
              onClick={() => setActiveTab("sent")}
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              <span>Enviados</span>
              <span className={`tab-counter ${sentRequests.length > 0 ? "has-badge" : ""}`}>
                {sentRequests.length}
              </span>
            </button>
          </div>

          {/* LISTA DE PEDIDOS RECEBIDOS */}
          {activeTab === "received" && (
            <div className="friend-requests-list custom-scrollbar">
              {receivedRequests.map((request) => (
                <div className="friend-req-card" key={request.id}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar name={request.sender.name} src={request.sender.avatarUrl} size="medium" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-slate-100 truncate">{request.sender.name}</span>
                      <span className="text-xs text-slate-400 truncate">{request.sender.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="friend-req-btn accept"
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => runAction(() => onAccept(request.id))}
                      title="Aceitar pedido"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Aceitar</span>
                    </button>
                    <button
                      className="friend-req-btn reject"
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => runAction(() => onReject(request.id))}
                      title="Recusar pedido"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                      <span>Recusar</span>
                    </button>
                  </div>
                </div>
              ))}

              {receivedRequests.length === 0 && (
                <div className="friend-requests-empty">
                  <div className="empty-icon-box">
                    <span className="material-symbols-outlined text-[28px] text-violet-400">mark_email_read</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-200 mt-2">Nenhum pedido recebido</h4>
                  <p className="text-xs text-slate-400 text-center max-w-[260px] mt-1">
                    Quando outros usuários te adicionarem, as solicitações aparecerão aqui.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* LISTA DE PEDIDOS ENVIADOS */}
          {activeTab === "sent" && (
            <div className="friend-requests-list custom-scrollbar">
              {sentRequests.map((request) => (
                <div className="friend-req-card" key={request.id}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar name={request.receiver.name} src={request.receiver.avatarUrl} size="medium" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-slate-100 truncate">{request.receiver.name}</span>
                      <span className="text-xs text-slate-400 truncate">{request.receiver.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/60 hidden sm:inline-block">
                      Pendente
                    </span>
                    <button
                      className="friend-req-btn cancel"
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => runAction(() => onCancel(request.id))}
                      title="Cancelar solicitação"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                      <span>Cancelar</span>
                    </button>
                  </div>
                </div>
              ))}

              {sentRequests.length === 0 && (
                <div className="friend-requests-empty">
                  <div className="empty-icon-box">
                    <span className="material-symbols-outlined text-[28px] text-slate-400">outgoing_mail</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-200 mt-2">Nenhum pedido enviado</h4>
                  <p className="text-xs text-slate-400 text-center max-w-[260px] mt-1">
                    Você não possui solicitações de amizade aguardando resposta.
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 mt-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}