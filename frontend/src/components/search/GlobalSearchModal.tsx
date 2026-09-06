import { useState, useEffect, useRef, useMemo } from "react";
import type {
  SearchCategory,
  SearchMessageResult,
  SearchUserResult,
} from "../../services/api";
import { searchGlobal } from "../../services/api";
import { formatTime } from "../../utils/chat-helpers";

type GlobalSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
  onSelectMessage?: (conversationId: string, messageId: string) => void;
  onSelectUser?: (user: { id: string; name: string; email: string }) => void;
  activeConversationId?: string | null;
};

const CATEGORIES: Array<{ id: SearchCategory; label: string; icon: string }> = [
  { id: "all", label: "Tudo", icon: "bolt" },
  { id: "messages", label: "Mensagens", icon: "chat" },
  { id: "users", label: "Pessoas", icon: "person" },
  { id: "media", label: "Mídias", icon: "photo_library" },
  { id: "links", label: "Links", icon: "link" },
  { id: "files", label: "Arquivos", icon: "description" },
];

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="search-highlight">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function GlobalSearchModal({
  isOpen,
  onClose,
  token,
  onSelectMessage,
  onSelectUser,
  activeConversationId,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const [inActiveConvOnly, setInActiveConvOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [messages, setMessages] = useState<SearchMessageResult[]>([]);
  const [users, setUsers] = useState<SearchUserResult[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lista unificada para navegação por teclado
  const totalItems = useMemo(() => {
    const list: Array<
      | { type: "user"; data: SearchUserResult }
      | { type: "message"; data: SearchMessageResult }
    > = [];

    for (const u of users) {
      list.push({ type: "user", data: u });
    }
    for (const m of messages) {
      list.push({ type: "message", data: m });
    }
    return list;
  }, [users, messages]);

  // Foca no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setMessages([]);
      setUsers([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Busca debounced (250ms)
  useEffect(() => {
    if (!isOpen || !token) return;

    if (!query.trim()) {
      setMessages([]);
      setUsers([]);
      setLoading(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setLoading(true);

    debounceTimerRef.current = setTimeout(() => {
      const convId = inActiveConvOnly && activeConversationId ? activeConversationId : undefined;
      searchGlobal(token, query, category, convId)
        .then((res) => {
          setMessages(res.results.messages || []);
          setUsers(res.results.users || []);
          setSelectedIndex(0);
        })
        .catch(() => {
          setMessages([]);
          setUsers([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, category, inActiveConvOnly, isOpen, token, activeConversationId]);

  // Navegação por teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < totalItems.length - 1 ? prev + 1 : 0));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems.length - 1));
        return;
      }

      if (e.key === "Enter" && totalItems.length > 0) {
        e.preventDefault();
        const selected = totalItems[selectedIndex];
        if (selected) {
          if (selected.type === "message") {
            onSelectMessage?.(selected.data.conversationId, selected.data.id);
            onClose();
          } else if (selected.type === "user") {
            onSelectUser?.(selected.data);
            onClose();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, totalItems, selectedIndex, onClose, onSelectMessage, onSelectUser]);

  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div className="search-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* BARRA DE BUSCA PRINCIPAL */}
        <div className="search-input-box">
          <span className="search-input-icon flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </span>
          <input
            ref={inputRef}
            type="text"
            className="search-main-input"
            placeholder="Buscar mensagens, pessoas, mídias, links... (↑↓ navegar, Enter abrir)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <div className="search-spinner" />}
          {query && !loading && (
            <button
              type="button"
              className="search-clear-btn flex items-center justify-center"
              onClick={() => setQuery("")}
              title="Limpar busca"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
          <span className="search-kbd-badge">ESC</span>
        </div>

        {/* ABAS DE CATEGORIAS */}
        <div className="search-categories-row">
          <div className="search-tabs-list">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`search-tab-pill ${category === cat.id ? "active" : ""}`}
                onClick={() => setCategory(cat.id)}
              >
                <span className="material-symbols-outlined text-[15px]">{cat.icon}</span>
                <span className="tab-label">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* CHECKBOX DE FILTRAR NA CONVERSA ATUAL */}
          {activeConversationId && (
            <label className="search-scope-toggle">
              <input
                type="checkbox"
                checked={inActiveConvOnly}
                onChange={(e) => setInActiveConvOnly(e.target.checked)}
              />
              <span>Apenas nesta conversa</span>
            </label>
          )}
        </div>

        {/* LISTA DE RESULTADOS */}
        <div className="search-results-viewport">
          {!query.trim() && (
            <div className="search-empty-state">
              <span className="material-symbols-outlined text-4xl text-purple-400 mb-2">bolt</span>
              <p className="empty-title">Busca Rápida</p>
              <p className="empty-desc">
                Digite qualquer palavra, nome ou link para encontrar instantaneamente em todas as suas conversas.
              </p>
            </div>
          )}

          {query.trim() && !loading && totalItems.length === 0 && (
            <div className="search-empty-state">
              <span className="material-symbols-outlined text-4xl text-zinc-600 mb-2">search_off</span>
              <p className="empty-title">Nenhum resultado encontrado</p>
              <p className="empty-desc">
                Não encontramos correspondências para "<strong>{query}</strong>". Tente termos mais curtos.
              </p>
            </div>
          )}

          {/* SEÇÃO DE PESSOAS */}
          {users.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <span className="section-title flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-purple-400">person</span>
                  <span>Pessoas ({users.length})</span>
                </span>
              </div>
              <div className="search-section-items">
                {users.map((user, i) => {
                  const itemIndex = i;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <div
                      key={`user-${user.id}`}
                      className={`search-result-item user-item ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        onSelectUser?.(user);
                        onClose();
                      }}
                    >
                      <div className="user-avatar-squircle">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="user-info-text">
                        <strong className="user-name">{highlightText(user.name, query)}</strong>
                        <span className="user-email">{highlightText(user.email, query)}</span>
                      </div>
                      <span className="action-hint flex items-center gap-1">
                        <span>Abrir DM</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SEÇÃO DE MENSAGENS */}
          {messages.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <span className="section-title flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-purple-400">chat</span>
                  <span>Mensagens ({messages.length})</span>
                </span>
              </div>
              <div className="search-section-items">
                {messages.map((msg, i) => {
                  const itemIndex = users.length + i;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <div
                      key={`msg-${msg.id}`}
                      className={`search-result-item message-item ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        onSelectMessage?.(msg.conversationId, msg.id);
                        onClose();
                      }}
                    >
                      <div className="msg-result-header">
                        <div className="msg-sender-box">
                          <strong className="msg-sender-name">{msg.sender.name}</strong>
                          <span className="msg-conv-tag">em {msg.conversationTitle}</span>
                        </div>
                        <time className="msg-time">{formatTime(msg.createdAt)}</time>
                      </div>

                      <div className="msg-result-snippet">
                        {msg.type === "image" && (
                          <span className="media-badge flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">image</span>
                            <span>Foto</span>
                          </span>
                        )}
                        {msg.type === "file" && (
                          <span className="media-badge flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">description</span>
                            <span>{msg.fileName || "Arquivo"}</span>
                          </span>
                        )}
                        <p className="snippet-text">{highlightText(msg.content, query)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL */}
        <footer className="search-modal-footer">
          <div className="footer-shortcuts">
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navegar</span>
            <span><kbd>↵</kbd> Selecionar</span>
            <span><kbd>ESC</kbd> Fechar</span>
          </div>
          <span className="footer-branding">PulseChat Command Palette</span>
        </footer>
      </div>
    </div>
  );
}
