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
      setError(caughtError instanceof Error ? caughtError.message : "Nao foi possivel atualizar o pedido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content create-group-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="friend-requests-title"
      >
        <header className="modal-header">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-violet-400">person_add</span>
            <h2 id="friend-requests-title">Pedidos de amizade</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn flex items-center justify-center"
            onClick={onClose}
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </header>

        <div className="modal-members-section">
          <div className="modal-section-title">
            <span>Recebidos</span>
            <span className="modal-selected-badge">{receivedRequests.length}</span>
          </div>

          <div className="modal-user-list custom-scrollbar">
            {receivedRequests.map((request) => (
              <div className="modal-user-row" key={request.id}>
                <Avatar name={request.sender.name} size="small" />
                <div className="modal-user-details">
                  <span className="modal-user-name">{request.sender.name}</span>
                  <span className="modal-user-email">{request.sender.email}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="modal-btn-submit"
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => runAction(() => onAccept(request.id))}
                  >
                    Aceitar
                  </button>
                  <button
                    className="modal-btn-cancel"
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => runAction(() => onReject(request.id))}
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}

            {!receivedRequests.length && (
              <div className="modal-empty-state">
                <span className="material-symbols-outlined text-[24px] text-gray-500 mb-1">mark_email_read</span>
                <p>Nenhum pedido recebido.</p>
              </div>
            )}
          </div>

          <div className="modal-section-title mt-5">
            <span>Enviados</span>
            <span className="modal-selected-badge">{sentRequests.length}</span>
          </div>

          <div className="modal-user-list custom-scrollbar">
            {sentRequests.map((request) => (
              <div className="modal-user-row" key={request.id}>
                <Avatar name={request.receiver.name} size="small" />
                <div className="modal-user-details">
                  <span className="modal-user-name">{request.receiver.name}</span>
                  <span className="modal-user-email">{request.receiver.email}</span>
                </div>
                <button
                  className="modal-btn-cancel"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => runAction(() => onCancel(request.id))}
                >
                  Cancelar
                </button>
              </div>
            ))}

            {!sentRequests.length && (
              <div className="modal-empty-state">
                <span className="material-symbols-outlined text-[24px] text-gray-500 mb-1">outgoing_mail</span>
                <p>Nenhum pedido enviado.</p>
              </div>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}