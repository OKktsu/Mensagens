import { useState, useMemo } from "react";
import type { Conversation, Message, User } from "../../services/api";

type ForwardMessageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  messageToForward: Message | null;
  conversations: Conversation[];
  users: User[];
  currentUserId: string;
  onForward: (targetConversationIds: string[], targetUserIds: string[]) => Promise<void>;
};

export function ForwardMessageModal({
  isOpen,
  onClose,
  messageToForward,
  conversations,
  users,
  currentUserId,
  onForward,
}: ForwardMessageModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);

  // Filtra conversas e contatos
  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const term = searchTerm.toLowerCase();
    return conversations.filter((c) => {
      if (c.title?.toLowerCase().includes(term)) return true;
      const otherMembers = c.members.filter((m) => (m.userId || m.user?.id) !== currentUserId);
      return otherMembers.some((m) => m.user.name.toLowerCase().includes(term));
    });
  }, [conversations, searchTerm, currentUserId]);

  const filteredUsers = useMemo(() => {
    const directContactIds = new Set(
      conversations
        .filter((c) => !c.title && c.members.length === 2)
        .flatMap((c) => c.members.map((m) => m.userId || m.user?.id))
        .filter((id): id is string => Boolean(id) && id !== currentUserId)
    );

    const availableUsers = users.filter(
      (u) => u.id !== currentUserId && !directContactIds.has(u.id)
    );

    if (!searchTerm.trim()) return availableUsers;
    const term = searchTerm.toLowerCase();
    return availableUsers.filter((u) => u.name.toLowerCase().includes(term));
  }, [users, conversations, searchTerm, currentUserId]);

  if (!isOpen || !messageToForward) return null;

  const toggleConv = (id: string) => {
    setSelectedConvIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalSelected = selectedConvIds.size + selectedUserIds.size;

  const handleConfirmForward = async () => {
    if (totalSelected === 0 || isSending) return;
    try {
      setIsSending(true);
      await onForward(Array.from(selectedConvIds), Array.from(selectedUserIds));
      setSelectedConvIds(new Set());
      setSelectedUserIds(new Set());
      onClose();
    } catch {
      // Ignora ou trata erro
    } finally {
      setIsSending(false);
    }
  };

  const getPreviewContent = () => {
    if (messageToForward.type === "image") {
      return (
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="material-symbols-outlined text-[15px] text-violet-400">image</span>
          <span>Foto enviada</span>
        </span>
      );
    }
    if (messageToForward.type === "audio") {
      return (
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="material-symbols-outlined text-[15px] text-emerald-400">mic</span>
          <span>Mensagem de voz</span>
        </span>
      );
    }
    if (messageToForward.type === "file") {
      return (
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="material-symbols-outlined text-[15px] text-rose-400">description</span>
          <span className="truncate">{messageToForward.fileName || "Arquivo anexado"}</span>
        </span>
      );
    }
    return <span className="truncate">{messageToForward.content || ""}</span>;
  };

  return (
    <div className="forward-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="forward-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* CABEÇALHO */}
        <header className="forward-modal-header">
          <div className="forward-modal-title-group">
            <div className="forward-modal-icon">
              <span className="material-symbols-outlined text-[18px] text-violet-400">reply</span>
            </div>
            <div>
              <h2 className="forward-modal-title">Encaminhar Mensagem</h2>
              <p className="forward-modal-subtitle">Selecione uma ou mais conversas para enviar</p>
            </div>
          </div>
          <button
            type="button"
            className="forward-modal-close-btn"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar (Esc)"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </header>

        {/* PRÉVIA DA MENSAGEM SELECIONADA */}
        <div className="forward-preview-block">
          <span className="forward-preview-heading">Mensagem selecionada:</span>
          <div className="forward-preview-card">
            <div className="forward-preview-author">
              <span className="material-symbols-outlined text-[13px] text-slate-400">person</span>
              <span>{messageToForward.sender.name}</span>
            </div>
            <div className="forward-preview-snippet">{getPreviewContent()}</div>
          </div>
        </div>

        {/* CAMPO DE BUSCA */}
        <div className="forward-search-box">
          <span className="material-symbols-outlined forward-search-icon">search</span>
          <input
            type="text"
            className="forward-search-input"
            placeholder="Pesquisar conversa ou contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          {searchTerm && (
            <button
              type="button"
              className="forward-search-clear"
              onClick={() => setSearchTerm("")}
              title="Limpar busca"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>

        {/* LISTA DE DESTINATÁRIOS */}
        <div className="forward-targets-list">
          {filteredConversations.length > 0 && (
            <div className="forward-targets-section">
              <span className="forward-section-title">Conversas Recentes</span>
              {filteredConversations.map((conv) => {
                const isSelected = selectedConvIds.has(conv.id);
                const isGroup = Boolean(conv.title || conv.members.length > 2);
                const title =
                  conv.title ||
                  conv.members.find((m) => (m.userId || m.user?.id) !== currentUserId)?.user.name ||
                  "Conversa";
                const initial = title.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={conv.id}
                    className={`forward-target-item ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleConv(conv.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={`forward-checkbox ${isSelected ? "checked" : ""}`}>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[13px]">check</span>
                      )}
                    </div>

                    <div className={`forward-target-avatar ${isGroup ? "group" : ""}`}>
                      {isGroup ? (
                        <span className="material-symbols-outlined text-[16px]">groups</span>
                      ) : (
                        <span>{initial}</span>
                      )}
                    </div>

                    <div className="forward-target-info">
                      <strong className="forward-target-name">{title}</strong>
                      <span className="forward-target-sub">
                        {isGroup ? `${conv.members.length} participantes` : "Conversa direta"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredUsers.length > 0 && (
            <div className="forward-targets-section">
              <span className="forward-section-title">Outros Contatos</span>
              {filteredUsers.map((user) => {
                const isSelected = selectedUserIds.has(user.id);
                const initial = user.name.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={user.id}
                    className={`forward-target-item ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleUser(user.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={`forward-checkbox ${isSelected ? "checked" : ""}`}>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[13px]">check</span>
                      )}
                    </div>

                    <div className="forward-target-avatar">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span>{initial}</span>
                      )}
                    </div>

                    <div className="forward-target-info">
                      <strong className="forward-target-name">{user.name}</strong>
                      <span className="forward-target-sub">{user.email}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredConversations.length === 0 && filteredUsers.length === 0 && (
            <div className="forward-empty-results">
              <span className="material-symbols-outlined text-[24px] text-slate-500">search_off</span>
              <span>Nenhuma conversa ou contato encontrado</span>
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <footer className="forward-modal-footer">
          <button
            type="button"
            className="forward-cancel-btn"
            onClick={onClose}
            disabled={isSending}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`forward-submit-btn ${totalSelected > 0 ? "active" : "disabled"}`}
            onClick={handleConfirmForward}
            disabled={totalSelected === 0 || isSending}
          >
            {isSending ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Enviando...</span>
              </span>
            ) : (
              <span>Encaminhar {totalSelected > 0 ? `(${totalSelected})` : ""}</span>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
