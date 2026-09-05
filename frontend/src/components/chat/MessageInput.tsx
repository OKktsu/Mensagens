import { FormEvent, useRef, useEffect, useState } from "react";
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
  disabled,
}: MessageInputProps) {
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

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

    if (disabled) return;

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
    if (file && onSendFile) {
      onSendFile(file);
    }
    event.target.value = "";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

  return (
    <div className="message-input-wrapper">
      {/* SELETOR DE EMOJIS */}
      <EmojiPicker
        isOpen={isEmojiOpen}
        onClose={() => setIsEmojiOpen(false)}
        onSelectEmoji={handleSelectEmoji}
      />

      {/* GRAVADOR DE ÁUDIO */}
      {isRecording ? (
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
          <input
            ref={fileInputRef}
            type="file"
            className="hidden-file-input"
            onChange={handleFileChange}
            disabled={disabled}
            accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          />

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

          {/* BOTÃO DE ANEXO */}
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

          {/* CAMPO DE TEXTO */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Escreva uma mensagem"
            aria-label="Mensagem"
            value={messageText}
            disabled={disabled}
            onChange={(event) => handleInputChange(event.target.value)}
          />

          {/* BOTÃO DE ENVIAR (OU MICROFONE SE VAZIO) */}
          {hasText ? (
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
