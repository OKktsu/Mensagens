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
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">image</span>
          <span>Foto</span>
        </span>
      );
    }
    if (messageToForward.type === "audio") {
      return (
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">mic</span>
          <span>Mensagem de voz</span>
        </span>
      );
    }
    if (messageToForward.type === "file") {
      return (
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">description</span>
          <span>{messageToForward.fileName || "Arquivo"}</span>
        </span>
      );
    }
    return <span>{messageToForward.content || ""}</span>;
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content forward-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Encaminhar mensagem</h2>
          <button type="button" className="icon-button flex items-center justify-center" onClick={onClose} aria-label="Fechar">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Prévia da mensagem a ser encaminhada */}
        <div className="forward-preview-box">
          <span className="forward-preview-label">Mensagem selecionada:</span>
          <div className="forward-preview-card">
            <strong>{messageToForward.sender.name}</strong>
            <p>{getPreviewContent()}</p>
          </div>
        </div>

        <div className="forward-search-wrapper">
          <input
            type="text"
            className="modal-search"
            placeholder="Pesquisar conversa ou contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="forward-list">
          {filteredConversations.length > 0 && (
            <div className="forward-section">
              <span className="forward-section-title">Conversas Recentes</span>
              {filteredConversations.map((conv) => {
                const isSelected = selectedConvIds.has(conv.id);
                const isGroup = Boolean(conv.title || conv.members.length > 2);
                const title =
                  conv.title ||
                  conv.members.find((m) => (m.userId || m.user?.id) !== currentUserId)?.user.name ||
                  "Conversa";

                return (
                  <label key={conv.id} className={`modal-user-item ${isSelected ? "selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleConv(conv.id)}
                    />
                    <div className="avatar small flex items-center justify-center">
                      {isGroup ? (
                        <span className="material-symbols-outlined text-[16px] text-purple-400">group</span>
                      ) : (
                        title[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="modal-user-info">
                      <strong>{title}</strong>
                      <small>{isGroup ? `${conv.members.length} participantes` : "Conversa direta"}</small>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {filteredUsers.length > 0 && (
            <div className="forward-section">
              <span className="forward-section-title">Outros Contatos</span>
              {filteredUsers.map((user) => {
                const isSelected = selectedUserIds.has(user.id);
                return (
                  <label key={user.id} className={`modal-user-item ${isSelected ? "selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleUser(user.id)}
                    />
                    <div className="avatar small">{user.name[0]?.toUpperCase()}</div>
                    <div className="modal-user-info">
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="ghost-button" onClick={onClose} disabled={isSending}>
            Cancelar
          </button>
          <button
            type="button"
            className="auth-form button"
            onClick={handleConfirmForward}
            disabled={totalSelected === 0 || isSending}
          >
            {isSending ? "Enviando..." : `Encaminhar (${totalSelected})`}
          </button>
        </div>
      </div>
    </div>
  );
}
