import { FormEvent, useRef, useEffect, useState, useMemo } from "react";
import type { Message } from "../../services/api";
import { extractFirstUrl } from "../../utils/link-extractor";
import { EmojiPicker } from "./EmojiPicker";
import { VoiceRecorder } from "./VoiceRecorder";

type MessageInputProps = {
  messageText: string;
  onMessageChange: (text: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>, ttl?: number) => void;
  onSendFile?: (file: File, ttl?: number) => void;
  onSendVoiceNote?: (audioBlob: Blob, duration: number, ttl?: number) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  replyingToMessage?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (newContent: string) => void;
  disabled: boolean;
  isUploading?: boolean;
};

const TTL_PRESETS = [
  { label: "Desativado", seconds: null, icon: "timer_off" },
  { label: "5 segundos", seconds: 5, icon: "local_fire_department" },
  { label: "10 segundos", seconds: 10, icon: "local_fire_department" },
  { label: "30 segundos", seconds: 30, icon: "local_fire_department" },
  { label: "1 minuto", seconds: 60, icon: "timer" },
  { label: "5 minutos", seconds: 300, icon: "timer" },
  { label: "1 hora", seconds: 3600, icon: "timer" },
  { label: "24 horas", seconds: 86400, icon: "timer" },
];

function formatTtlBadge(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

export function MessageInput({
  messageText,
  onMessageChange,
  onSendMessage,
  onSendFile,
  onSendVoiceNote,
  onTypingStart,
  onTypingStop,
  replyingToMessage,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
  disabled,
  isUploading = false,
}: MessageInputProps) {
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedTtl, setSelectedTtl] = useState<number | null>(null);
  const [isTtlMenuOpen, setIsTtlMenuOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ttlMenuRef = useRef<HTMLDivElement | null>(null);
  const ttlBtnRef = useRef<HTMLButtonElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Fecha menu de TTL ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        ttlMenuRef.current &&
        !ttlMenuRef.current.contains(target) &&
        ttlBtnRef.current &&
        !ttlBtnRef.current.contains(target)
      ) {
        setIsTtlMenuOpen(false);
      }
    }
    if (isTtlMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isTtlMenuOpen]);

  const detectedUrl = useMemo(() => extractFirstUrl(messageText), [messageText]);

  // Foca no input quando entrar em modo resposta ou edição
  useEffect(() => {
    if (replyingToMessage || editingMessage) {
      inputRef.current?.focus();
    }
  }, [replyingToMessage, editingMessage]);

  // Limpa o timer quando o componente desmontar
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  function handleInputChange(value: string) {
    onMessageChange(value);

    if (disabled || editingMessage) return;

    if (!isTypingRef.current && value.trim()) {
      isTypingRef.current = true;
      onTypingStart?.();
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    if (!value.trim()) {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop?.();
      }
      return;
    }

    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingStop?.();
    }, 2000);
  }

  function handleSelectEmoji(emoji: string) {
    const input = inputRef.current;
    if (!input) {
      handleInputChange(messageText + emoji);
      return;
    }

    const start = input.selectionStart || messageText.length;
    const end = input.selectionEnd || messageText.length;
    const newText = messageText.substring(0, start) + emoji + messageText.substring(end);
    handleInputChange(newText);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 10);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const maxSizeBytes = 25 * 1024 * 1024; // 25 MB
      if (file.size > maxSizeBytes) {
        alert("O arquivo selecionado é muito grande. O tamanho máximo permitido é de 25 MB.");
        event.target.value = "";
        return;
      }
      if (onSendFile) {
        onSendFile(file, selectedTtl || undefined);
      }
    }
    event.target.value = "";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    if (editingMessage && onSaveEdit) {
      onSaveEdit(messageText);
      return;
    }

    if (!messageText.trim()) return;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop?.();
    }

    setIsEmojiOpen(false);
    setIsTtlMenuOpen(false);
    onSendMessage(event, selectedTtl || undefined);
  }

  const hasText = Boolean(messageText.trim());

  const getReplySnippet = (msg: Message) => {
    if (msg.type === "image") return "Foto anexada";
    if (msg.type === "audio") return "Mensagem de voz";
    if (msg.type === "file") return msg.fileName || "Documento anexado";
    return msg.content || "";
  };

  return (
    <div className="message-input-wrapper">
      {/* SELETOR DE EMOJIS */}
      <EmojiPicker
        isOpen={isEmojiOpen}
        onClose={() => setIsEmojiOpen(false)}
        onSelectEmoji={handleSelectEmoji}
      />

      {/* MENU POPOVER DE SELEÇÃO DE TTL (AUTODESTRUIÇÃO) */}
      {isTtlMenuOpen && (
        <div ref={ttlMenuRef} className="stitch-ttl-popover-menu" role="dialog" aria-label="Seletor de Autodestruição">
          <div className="stitch-ttl-menu-header">
            <span className="material-symbols-outlined text-[16px] text-amber-500">local_fire_department</span>
            <span>Mensagens Autodestrutivas</span>
          </div>
          <div className="stitch-ttl-menu-list">
            {TTL_PRESETS.map((preset) => {
              const isSelected = selectedTtl === preset.seconds;
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={`stitch-ttl-option-btn ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedTtl(preset.seconds);
                    setIsTtlMenuOpen(false);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {preset.icon}
                  </span>
                  <span className="stitch-ttl-option-label">{preset.label}</span>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[16px] stitch-ttl-check">
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`stitch-dock-container ${replyingToMessage || editingMessage || detectedUrl || selectedTtl ? "has-banner" : ""}`}>
        {/* BANNER DE AUTODESTRUIÇÃO ATIVA */}
        {selectedTtl && !replyingToMessage && !editingMessage && (
          <div className="input-ttl-active-banner">
            <div className="ttl-banner-info">
              <span className="material-symbols-outlined ttl-banner-icon">local_fire_department</span>
              <span className="ttl-banner-text">
                Autodestruição armada: a mensagem desaparecerá <strong>{formatTtlBadge(selectedTtl)}</strong> após o envio.
              </span>
            </div>
            <button
              type="button"
              className="ttl-banner-clear"
              onClick={() => setSelectedTtl(null)}
              title="Desativar autodestruição"
              aria-label="Desativar"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* BANNER DE LINK DETECTADO DURANTE A DIGITAÇÃO */}
        {detectedUrl && !replyingToMessage && !editingMessage && !selectedTtl && (
          <div className="input-link-detect-banner">
            <div className="link-detect-info">
              <span className="material-symbols-outlined link-banner-icon">link</span>
              <span className="link-detect-text">
                Link detectado: <strong>{(() => { try { return new URL(detectedUrl).hostname; } catch { return detectedUrl; } })()}</strong> — card de pré-visualização será anexado
              </span>
            </div>
          </div>
        )}

        {/* BANNER DE RESPOSTA ATIVA */}
        {replyingToMessage && !editingMessage && (
          <div className="input-reply-banner">
            <div className="reply-banner-info">
              <span className="material-symbols-outlined reply-banner-icon">reply</span>
              <span className="reply-banner-sender">Respondendo a <strong className="reply-banner-name">{replyingToMessage.sender.name}</strong></span>
              <span className="reply-banner-divider">•</span>
              <span className="reply-banner-snippet">{getReplySnippet(replyingToMessage)}</span>
            </div>
            <button
              type="button"
              className="reply-banner-close"
              onClick={onCancelReply}
              title="Cancelar resposta"
              aria-label="Cancelar resposta"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* BANNER DE EDIÇÃO ATIVA */}
        {editingMessage && (
          <div className="input-edit-banner">
            <div className="edit-banner-info">
              <span className="material-symbols-outlined edit-banner-icon">edit</span>
              <span className="edit-banner-title">Editando mensagem</span>
              <span className="edit-banner-divider">•</span>
              <span className="edit-banner-snippet">{editingMessage.content}</span>
            </div>
            <button
              type="button"
              className="edit-banner-close"
              onClick={onCancelEdit}
              title="Cancelar edição"
              aria-label="Cancelar edição"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* INDICADOR DE UPLOAD EM ANDAMENTO */}
        {isUploading && (
          <div className="input-reply-banner" style={{ borderLeftColor: "#a855f7", background: "rgba(168, 85, 247, 0.08)" }}>
            <div className="upload-progress-chip">
              <div className="upload-spinner-ring" />
              <span>Enviando anexo para a nuvem...</span>
            </div>
          </div>
        )}

        {/* GRAVADOR DE ÁUDIO */}
        {isRecording && !editingMessage ? (
          <VoiceRecorder
            isRecording={isRecording}
            onCancel={() => setIsRecording(false)}
            onSendVoiceNote={(blob, duration) => {
              setIsRecording(false);
              onSendVoiceNote?.(blob, duration, selectedTtl || undefined);
            }}
          />
        ) : (
          <form className="stitch-input-dock" onSubmit={handleSubmit}>
          {/* INPUT OCULTO DE ARQUIVOS */}
          {!editingMessage && (
            <input
              ref={fileInputRef}
              type="file"
              className="hidden-file-input"
              onChange={handleFileChange}
              disabled={disabled}
              accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
            />
          )}

          {/* BOTÃO DE ANEXO (desabilitado em edição) */}
          {!editingMessage && (
            <button
              type="button"
              className="stitch-input-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              title="Anexar foto ou arquivo"
              aria-label="Anexar arquivo"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          )}

          {/* CAMPO DE TEXTO */}
          <input
            ref={inputRef}
            type="text"
            className="stitch-input-field"
            placeholder={
              editingMessage
                ? "Edite sua mensagem..."
                : selectedTtl
                ? `Mensagem autodestrutiva (${formatTtlBadge(selectedTtl)})...`
                : "Escreva uma mensagem ou envie anexos..."
            }
            aria-label="Mensagem"
            value={messageText}
            disabled={disabled}
            onChange={(event) => handleInputChange(event.target.value)}
          />

          {/* DECK DE AÇÕES À DIREITA */}
          <div className="stitch-input-deck">
            {/* BOTÃO DE AUTODESTRUIÇÃO (TTL) */}
            {!editingMessage && (
              <button
                ref={ttlBtnRef}
                type="button"
                className={`stitch-deck-btn ${selectedTtl ? "active-ttl" : ""} ${isTtlMenuOpen ? "open" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEmojiOpen(false);
                  setIsTtlMenuOpen((prev) => !prev);
                }}
                disabled={disabled}
                title={
                  selectedTtl
                    ? `Autodestruição ativa (${formatTtlBadge(selectedTtl)}) - clique para alterar`
                    : "Definir tempo de autodestruição (TTL)"
                }
                aria-label="Autodestruição"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {selectedTtl ? "local_fire_department" : "timer"}
                </span>
                {selectedTtl && (
                  <span className="stitch-deck-ttl-pill">{formatTtlBadge(selectedTtl)}</span>
                )}
              </button>
            )}

            {/* BOTÃO DE EMOJIS */}
            <button
              type="button"
              className={`stitch-deck-btn ${isEmojiOpen ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsTtlMenuOpen(false);
                setIsEmojiOpen((prev) => !prev);
              }}
              disabled={disabled}
              title="Inserir emoji"
              aria-label="Emojis"
            >
              <span className="material-symbols-outlined text-[20px]">
                sentiment_satisfied
              </span>
            </button>

            {/* BOTÕES DE ENVIO OU GRAVAÇÃO OU SALVAMENTO */}
            {editingMessage ? (
              <div className="stitch-edit-actions">
                <button
                  type="button"
                  className="stitch-edit-btn cancel"
                  onClick={onCancelEdit}
                  title="Cancelar edição"
                >
                  <span className="material-symbols-outlined text-[17px]">close</span>
                </button>
                <button
                  type="submit"
                  className="stitch-edit-btn save"
                  disabled={disabled || !hasText}
                  title="Salvar alteração"
                >
                  <span className="material-symbols-outlined text-[17px]">check</span>
                </button>
              </div>
            ) : hasText ? (
              <button
                type="submit"
                className={`stitch-send-btn ${selectedTtl ? "ttl-armed" : ""}`}
                disabled={disabled}
                title={selectedTtl ? `Enviar com autodestruição (${formatTtlBadge(selectedTtl)})` : "Enviar mensagem"}
              >
                <span className="material-symbols-outlined text-[19px]">send</span>
              </button>
            ) : (
              <button
                type="button"
                className="stitch-mic-btn"
                disabled={disabled}
                onClick={() => setIsRecording(true)}
                title="Gravar áudio de voz"
                aria-label="Gravar áudio"
              >
                <span className="material-symbols-outlined text-[20px]">mic</span>
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  </div>
);
}


