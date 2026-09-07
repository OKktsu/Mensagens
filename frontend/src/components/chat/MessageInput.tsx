import { FormEvent, useRef, useEffect, useState, useMemo } from "react";
import type { Message } from "../../services/api";
import { extractFirstUrl } from "../../utils/link-extractor";
import { EmojiPicker } from "./EmojiPicker";
import { VoiceRecorder } from "./VoiceRecorder";

type MessageInputProps = {
  messageText: string;
  onMessageChange: (text: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onSendFile?: (file: File) => void;
  onSendVoiceNote?: (audioBlob: Blob, duration: number) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  replyingToMessage?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (newContent: string) => void;
  disabled: boolean;
};

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
}: MessageInputProps) {
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

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
        onSendFile(file);
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
    onSendMessage(event);
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

      <div className={`stitch-dock-container ${replyingToMessage || editingMessage || detectedUrl ? "has-banner" : ""}`}>
        {/* BANNER DE LINK DETECTADO DURANTE A DIGITAÇÃO */}
        {detectedUrl && !replyingToMessage && !editingMessage && (
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

        {/* GRAVADOR DE ÁUDIO */}
        {isRecording && !editingMessage ? (
          <VoiceRecorder
            isRecording={isRecording}
            onCancel={() => setIsRecording(false)}
            onSendVoiceNote={(blob, duration) => {
              setIsRecording(false);
              onSendVoiceNote?.(blob, duration);
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
                : "Escreva uma mensagem ou envie anexos..."
            }
            aria-label="Mensagem"
            value={messageText}
            disabled={disabled}
            onChange={(event) => handleInputChange(event.target.value)}
          />

          {/* DECK DE AÇÕES À DIREITA */}
          <div className="stitch-input-deck">
            {/* BOTÃO DE EMOJIS */}
            <button
              type="button"
              className={`stitch-deck-btn ${isEmojiOpen ? "active" : ""}`}
              onClick={() => setIsEmojiOpen((prev) => !prev)}
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
                className="stitch-send-btn"
                disabled={disabled}
                title="Enviar mensagem"
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


