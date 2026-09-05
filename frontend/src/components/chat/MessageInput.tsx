import { FormEvent, useRef, useEffect, useState } from "react";
import type { Message } from "../../services/api";
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

    if (editingMessage) {
      onSaveEdit?.(messageText);
      return;
    }

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
    if (msg.type === "image") return "📷 Foto";
    if (msg.type === "audio") return "🎙️ Mensagem de voz";
    if (msg.type === "file") return `📄 ${msg.fileName || "Arquivo"}`;
    return msg.content || "";
  };

  return (
    <div className="message-input-wrapper">
      {/* BANNER DE RESPOSTA ATIVA */}
      {replyingToMessage && !editingMessage && (
        <div className="input-reply-banner">
          <div className="reply-banner-bar" />
          <div className="reply-banner-info">
            <strong className="reply-banner-sender">
              Respondendo a {replyingToMessage.sender.name}
            </strong>
            <p className="reply-banner-text">{getReplySnippet(replyingToMessage)}</p>
          </div>
          <button
            type="button"
            className="reply-banner-close"
            onClick={onCancelReply}
            title="Cancelar resposta"
          >
            ✕
          </button>
        </div>
      )}

      {/* BANNER DE EDIÇÃO ATIVA */}
      {editingMessage && (
        <div className="input-edit-banner">
          <div className="edit-banner-bar" />
          <div className="edit-banner-info">
            <strong className="edit-banner-title">✏️ Editando mensagem</strong>
            <p className="edit-banner-text">{editingMessage.content}</p>
          </div>
          <button
            type="button"
            className="edit-banner-close"
            onClick={onCancelEdit}
            title="Cancelar edição"
          >
            ✕
          </button>
        </div>
      )}

      {/* SELETOR DE EMOJIS */}
      <EmojiPicker
        isOpen={isEmojiOpen}
        onClose={() => setIsEmojiOpen(false)}
        onSelectEmoji={handleSelectEmoji}
      />

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
        <form className="message-form" onSubmit={handleSubmit}>
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

          {/* BOTÃO DE EMOJIS */}
          <button
            type="button"
            className={`input-action-btn emoji-trigger ${isEmojiOpen ? "active" : ""}`}
            onClick={() => setIsEmojiOpen((prev) => !prev)}
            disabled={disabled}
            title="Inserir emoji"
            aria-label="Emojis"
          >
            😀
          </button>

          {/* BOTÃO DE ANEXO (desabilitado em edição) */}
          {!editingMessage && (
            <button
              type="button"
              className="input-action-btn attach-trigger"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              title="Anexar foto ou arquivo"
              aria-label="Anexar arquivo"
            >
              📎
            </button>
          )}

          {/* CAMPO DE TEXTO */}
          <input
            ref={inputRef}
            type="text"
            placeholder={editingMessage ? "Edite sua mensagem..." : "Escreva uma mensagem"}
            aria-label="Mensagem"
            value={messageText}
            disabled={disabled}
            onChange={(event) => handleInputChange(event.target.value)}
          />

          {/* BOTÕES DE ENVIO OU SALVAMENTO */}
          {editingMessage ? (
            <div className="edit-actions-buttons">
              <button
                type="button"
                className="edit-cancel-btn"
                onClick={onCancelEdit}
                title="Cancelar"
              >
                ✕
              </button>
              <button
                type="submit"
                className="edit-save-btn"
                disabled={disabled || !hasText}
                title="Salvar alteração"
              >
                ✓
              </button>
            </div>
          ) : hasText ? (
            <button type="submit" className="send-btn" disabled={disabled} title="Enviar mensagem">
              <span>🚀</span>
            </button>
          ) : (
            <button
              type="button"
              className="mic-btn"
              disabled={disabled}
              onClick={() => setIsRecording(true)}
              title="Gravar mensagem de voz"
              aria-label="Gravar áudio"
            >
              <span>🎙️</span>
            </button>
          )}
        </form>
      )}
    </div>
  );
}

