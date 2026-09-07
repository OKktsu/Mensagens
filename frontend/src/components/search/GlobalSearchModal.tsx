import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type {
  SearchCategory,
  SearchConversationResult,
  SearchMessageResult,
  SearchUserResult,
} from "../../services/api";
import { searchGlobal } from "../../services/api";
import { formatTime } from "../../utils/chat-helpers";

type GlobalSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
  onSelectConversation?: (conversationId: string) => void;
  onSelectMessage?: (conversationId: string, messageId: string) => void;
  onSelectUser?: (user: { id: string; name: string; email: string }) => void;
  onOpenCreateGroup?: () => void;
  onOpenProfileSettings?: () => void;
  activeConversationId?: string | null;
  onlineUserIds?: Set<string>;
};

const CATEGORIES: Array<{ id: SearchCategory; label: string; icon: string; prefix?: string }> = [
  { id: "all", label: "Tudo", icon: "bolt" },
  { id: "conversations", label: "Squads & Canais", icon: "tag", prefix: "#" },
  { id: "users", label: "Pessoas", icon: "person", prefix: "@" },
  { id: "messages", label: "Mensagens", icon: "chat", prefix: "!" },
  { id: "media", label: "Mídias", icon: "photo_library" },
  { id: "links", label: "Links", icon: "link" },
  { id: "files", label: "Arquivos", icon: "description" },
];

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const cleanQuery = query.replace(/^[@#!]/, "").trim();
  if (!cleanQuery) return text;

  const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

type UnifiedItem =
  | { type: "action"; id: string; title: string; subtitle: string; icon: string; shortcut?: string; onAction: () => void }
  | { type: "conversation"; id: string; data: SearchConversationResult }
  | { type: "user"; id: string; data: SearchUserResult }
  | { type: "message"; id: string; data: SearchMessageResult };

export function GlobalSearchModal({
  isOpen,
  onClose,
  token,
  onSelectConversation,
  onSelectMessage,
  onSelectUser,
  onOpenCreateGroup,
  onOpenProfileSettings,
  activeConversationId,
  onlineUserIds,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const [inActiveConvOnly, setInActiveConvOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [conversations, setConversations] = useState<SearchConversationResult[]>([]);
  const [messages, setMessages] = useState<SearchMessageResult[]>([]);
  const [users, setUsers] = useState<SearchUserResult[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ações rápidas disponíveis
  const quickActions = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      icon: string;
      shortcut?: string;
      keywords: string[];
      onAction: () => void;
    }> = [
      {
        id: "create-group",
        title: "Criar Novo Grupo / Squad",
        subtitle: "Criar uma sala em grupo com múltiplos amigos",
        icon: "group_add",
        shortcut: "G",
        keywords: ["criar", "novo", "grupo", "squad", "sala", "canal"],
        onAction: () => {
          onClose();
          onOpenCreateGroup?.();
        },
      },
      {
        id: "edit-profile",
        title: "Editar Meu Perfil",
        subtitle: "Alterar avatar, banner, bio e status personalizado",
        icon: "account_circle",
        shortcut: "P",
        keywords: ["perfil", "editar", "foto", "banner", "status", "bio", "conta"],
        onAction: () => {
          onClose();
          onOpenProfileSettings?.();
        },
      },
    ];

    if (!query.trim()) {
      return list;
    }

    const clean = query.toLowerCase().replace(/^[@#!]/, "").trim();
    return list.filter((act) =>
      act.title.toLowerCase().includes(clean) ||
      act.keywords.some((k) => k.includes(clean))
    );
  }, [query, onClose, onOpenCreateGroup, onOpenProfileSettings]);

  // Lista unificada para navegação por teclado (↑ ↓ Enter)
  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const list: UnifiedItem[] = [];

    // Se estiver na aba "Tudo" e houver ações correspondentes
    if (category === "all" && quickActions.length > 0 && (!inActiveConvOnly || !query.trim())) {
      for (const act of quickActions) {
        list.push({
          type: "action",
          id: `act-${act.id}`,
          title: act.title,
          subtitle: act.subtitle,
          icon: act.icon,
          shortcut: act.shortcut,
          onAction: act.onAction,
        });
      }
    }

    // Conversas / Squads
    if (category === "all" || category === "conversations") {
      for (const c of conversations) {
        list.push({ type: "conversation", id: `conv-${c.id}`, data: c });
      }
    }

    // Pessoas
    if (category === "all" || category === "users") {
      for (const u of users) {
        list.push({ type: "user", id: `user-${u.id}`, data: u });
      }
    }

    // Mensagens, Mídias, Links, Arquivos
    if (category !== "users" && category !== "conversations") {
      for (const m of messages) {
        list.push({ type: "message", id: `msg-${m.id}`, data: m });
      }
    }

    return list;
  }, [category, quickActions, conversations, users, messages, inActiveConvOnly, query]);

  // Foca no input e limpa dados ao abrir
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setCategory("all");
      setInActiveConvOnly(false);
      setSelectedIndex(0);
      setLoading(true);

      // Carrega conversas recentes no estado inicial vazio
      if (token) {
        searchGlobal(token, "", "all")
          .then((res) => {
            setConversations(res.results.conversations || []);
            setUsers(res.results.users || []);
            setMessages([]);
            setSelectedIndex(0);
          })
          .catch(() => {
            setConversations([]);
            setUsers([]);
            setMessages([]);
          })
          .finally(() => setLoading(false));
      }

      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, token]);

  // Busca debounced (200ms) ao digitar ou mudar de categoria/escopo
  useEffect(() => {
    if (!isOpen || !token) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setLoading(true);

    debounceTimerRef.current = setTimeout(() => {
      const convId = inActiveConvOnly && activeConversationId ? activeConversationId : undefined;
      searchGlobal(token, query, category, convId)
        .then((res) => {
          setConversations(res.results.conversations || []);
          setUsers(res.results.users || []);
          setMessages(res.results.messages || []);
          setSelectedIndex(0);
        })
        .catch(() => {
          setConversations([]);
          setUsers([]);
          setMessages([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, category, inActiveConvOnly, isOpen, token, activeConversationId]);

  // Auto-scroll para manter o item selecionado visível no viewport
  useEffect(() => {
    if (!resultsContainerRef.current) return;
    const selectedEl = resultsContainerRef.current.querySelector(
      `[data-search-index="${selectedIndex}"]`,
    ) as HTMLElement | null;

    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Executa o item selecionado
  const handleExecuteItem = useCallback((item: UnifiedItem) => {
    if (item.type === "action") {
      item.onAction();
    } else if (item.type === "conversation") {
      onSelectConversation?.(item.data.id);
      onClose();
    } else if (item.type === "user") {
      onSelectUser?.(item.data);
      onClose();
    } else if (item.type === "message") {
      onSelectMessage?.(item.data.conversationId, item.data.id);
      onClose();
    }
  }, [onSelectConversation, onSelectUser, onSelectMessage, onClose]);

  // Navegação por teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Tab para alternar abas de categoria
      if (e.key === "Tab") {
        e.preventDefault();
        const currentIndex = CATEGORIES.findIndex((c) => c.id === category);
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + CATEGORIES.length) % CATEGORIES.length
          : (currentIndex + 1) % CATEGORIES.length;
        setCategory(CATEGORIES[nextIndex].id);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < unifiedItems.length - 1 ? prev + 1 : 0));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : unifiedItems.length - 1));
        return;
      }

      if (e.key === "Enter" && unifiedItems.length > 0) {
        e.preventDefault();
        const selected = unifiedItems[selectedIndex];
        if (selected) {
          handleExecuteItem(selected);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, unifiedItems, selectedIndex, onClose, handleExecuteItem, category]);

  if (!isOpen) return null;

  // Detecta prefixo ativo para renderizar badge visual
  let activePrefix = "";
  if (query.startsWith("@")) activePrefix = "@ Pessoas";
  else if (query.startsWith("#")) activePrefix = "# Squads";
  else if (query.startsWith("!")) activePrefix = "! Mensagens";

  let currentIndexTracker = 0;

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div className="search-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* BARRA DE BUSCA PRINCIPAL */}
        <div className="search-input-box">
          <span className="search-input-icon flex items-center justify-center">
            <span className="material-symbols-outlined text-[19px]">search</span>
          </span>

          {activePrefix && (
            <span className="search-active-prefix-badge">
              {activePrefix}
            </span>
          )}

          <input
            ref={inputRef}
            type="text"
            className="search-main-input"
            placeholder="Buscar conversas, mensagens, @pessoas, #squads... (↑↓ navegar)"
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
                {cat.prefix && <span className="tab-prefix-hint">{cat.prefix}</span>}
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

        {/* LISTA DE RESULTADOS / QUICK SWITCHER */}
        <div className="search-results-viewport" ref={resultsContainerRef}>
          {/* SKELETON DURANTE A BUSCA */}
          {loading && (
            <div className="search-skeleton-list" aria-busy="true" aria-label="Buscando resultados...">
              {[1, 2, 3, 4].map((n) => (
                <div key={`search-skel-${n}`} className="search-skeleton-item">
                  <div className="search-skeleton-avatar" />
                  <div className="search-skeleton-info">
                    <div className="search-skeleton-title" style={{ width: n % 2 === 0 ? "110px" : "150px" }} />
                    <div className="search-skeleton-sub" style={{ width: n % 2 === 0 ? "220px" : "170px" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ESTADO VAZIO: NENHUM RESULTADO */}
          {query.trim() && !loading && unifiedItems.length === 0 && (
            <div className="search-empty-state">
              <span className="material-symbols-outlined text-4xl text-zinc-500 mb-2">search_off</span>
              <p className="empty-title">Nenhum resultado encontrado</p>
              <p className="empty-desc">
                Não encontramos correspondências para "<strong>{query}</strong>". Tente usar termos mais curtos ou use <code>@</code> para pessoas e <code>#</code> para squads.
              </p>
            </div>
          )}

          {/* 1. SEÇÃO DE AÇÕES RÁPIDAS */}
          {category === "all" && quickActions.length > 0 && (!inActiveConvOnly || !query.trim()) && (
            <div className="search-section">
              <div className="search-section-header">
                <span className="section-title flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-purple-400">bolt</span>
                  <span>Ações Rápidas</span>
                </span>
              </div>
              <div className="search-section-items">
                {quickActions.map((act) => {
                  const itemIndex = currentIndexTracker++;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <div
                      key={`action-${act.id}`}
                      data-search-index={itemIndex}
                      className={`search-result-item action-item ${isSelected ? "selected" : ""}`}
                      onClick={() => handleExecuteItem({
                        type: "action",
                        id: `act-${act.id}`,
                        title: act.title,
                        subtitle: act.subtitle,
                        icon: act.icon,
                        shortcut: act.shortcut,
                        onAction: act.onAction,
                      })}
                    >
                      <div className="search-item-avatar action-icon flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px] text-purple-400">{act.icon}</span>
                      </div>
                      <div className="search-item-info">
                        <strong className="search-item-title">{highlightText(act.title, query)}</strong>
                        <span className="search-item-sub">{act.subtitle}</span>
                      </div>
                      {act.shortcut && (
                        <span className="search-item-kbd-hint"><kbd>{act.shortcut}</kbd></span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. SEÇÃO DE CONVERSAS / SQUADS */}
          {(category === "all" || category === "conversations") && conversations.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <span className="section-title flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-cyan-400">
                    {query.trim() ? "forum" : "schedule"}
                  </span>
                  <span>
                    {!query.trim() ? "Conversas Recentes (Quick Switcher)" : `Squads & Conversas (${conversations.length})`}
                  </span>
                </span>
              </div>
              <div className="search-section-items">
                {conversations.map((conv) => {
                  const itemIndex = currentIndexTracker++;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <div
                      key={`conv-${conv.id}`}
                      data-search-index={itemIndex}
                      className={`search-result-item conv-item ${isSelected ? "selected" : ""}`}
                      onClick={() => handleExecuteItem({ type: "conversation", id: `conv-${conv.id}`, data: conv })}
                    >
                      <div className="search-item-avatar-wrap">
                        {conv.avatarUrl ? (
                          <img src={conv.avatarUrl} alt={conv.title} className="search-item-avatar-img" />
                        ) : (
                          <div className={`search-item-avatar ${conv.isGroup ? "group-avatar" : "user-avatar"}`}>
                            {conv.isGroup ? (
                              <span className="material-symbols-outlined text-[18px]">group</span>
                            ) : (
                              conv.title.slice(0, 2).toUpperCase()
                            )}
                          </div>
                        )}
                      </div>

                      <div className="search-item-info">
                        <div className="search-item-top">
                          <strong className="search-item-title">{highlightText(conv.title, query)}</strong>
                          {conv.isGroup && (
                            <span className="search-item-chip">{conv.memberCount} membros</span>
                          )}
                          <span className="search-item-time">{formatTime(conv.updatedAt)}</span>
                        </div>
                        <span className="search-item-sub">
                          {conv.lastMessage ? (
                            `${conv.lastMessage.senderName}: ${conv.lastMessage.type === "image" ? "📷 Foto" : conv.lastMessage.type === "file" ? "📄 Arquivo" : conv.lastMessage.content}`
                          ) : (
                            "Nenhuma mensagem ainda"
                          )}
                        </span>
                      </div>

                      <span className="action-hint flex items-center gap-1">
                        <span>Pular</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. SEÇÃO DE PESSOAS */}
          {(category === "all" || category === "users") && users.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <span className="section-title flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-purple-400">person</span>
                  <span>Pessoas ({users.length})</span>
                </span>
              </div>
              <div className="search-section-items">
                {users.map((user) => {
                  const itemIndex = currentIndexTracker++;
                  const isSelected = selectedIndex === itemIndex;
                  const isOnline = onlineUserIds ? onlineUserIds.has(user.id) : false;

                  return (
                    <div
                      key={`user-${user.id}`}
                      data-search-index={itemIndex}
                      className={`search-result-item user-item ${isSelected ? "selected" : ""}`}
                      onClick={() => handleExecuteItem({ type: "user", id: `user-${user.id}`, data: user })}
                    >
                      <div className="search-item-avatar-wrap">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="search-item-avatar-img" />
                        ) : (
                          <div className="search-item-avatar user-avatar">
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className={`search-presence-dot ${isOnline ? "online" : "offline"}`} />
                      </div>

                      <div className="search-item-info">
                        <div className="search-item-top">
                          <strong className="search-item-title">{highlightText(user.name, query)}</strong>
                          {user.customStatus && (
                            <span className="search-user-status-pill">
                              {user.statusEmoji && <span className="status-emoji">{user.statusEmoji}</span>}
                              <span>{highlightText(user.customStatus, query)}</span>
                            </span>
                          )}
                        </div>
                        <span className="search-item-sub user-email">{highlightText(user.email, query)}</span>
                      </div>

                      <span className="action-hint flex items-center gap-1">
                        <span>Conversar</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. SEÇÃO DE MENSAGENS / MÍDIAS / ARQUIVOS / LINKS */}
          {category !== "users" && category !== "conversations" && messages.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <span className="section-title flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-amber-400">
                    {category === "media" ? "photo_library" : category === "files" ? "description" : category === "links" ? "link" : "chat"}
                  </span>
                  <span>Mensagens & Anexos ({messages.length})</span>
                </span>
              </div>
              <div className="search-section-items">
                {messages.map((msg) => {
                  const itemIndex = currentIndexTracker++;
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <div
                      key={`msg-${msg.id}`}
                      data-search-index={itemIndex}
                      className={`search-result-item message-item ${isSelected ? "selected" : ""}`}
                      onClick={() => handleExecuteItem({ type: "message", id: `msg-${msg.id}`, data: msg })}
                    >
                      <div className="msg-result-header">
                        <div className="msg-sender-box flex items-center gap-2">
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
                        {msg.type === "audio" && (
                          <span className="media-badge flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">mic</span>
                            <span>Áudio</span>
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

        {/* RODAPÉ DO MODAL COM ATALHOS */}
        <footer className="search-modal-footer">
          <div className="footer-shortcuts">
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navegar</span>
            <span><kbd>↵</kbd> Selecionar</span>
            <span><kbd>TAB</kbd> Categorias</span>
            <span><kbd>ESC</kbd> Fechar</span>
          </div>
          <span className="footer-branding">PulseChat Command Palette</span>
        </footer>
      </div>
    </div>
  );
}

