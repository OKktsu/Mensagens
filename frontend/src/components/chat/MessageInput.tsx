import { FormEvent, useRef, useEffect } from "react";

type MessageInputProps = {
  messageText: string;
  onMessageChange: (text: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled: boolean;
};

export function MessageInput({
  messageText,
  onMessageChange,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled,
}: MessageInputProps) {
  const isSendDisabled = disabled || !messageText.trim();
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

    // Se começou a digitar agora, avisa o socket
    if (!isTypingRef.current && value.trim()) {
      isTypingRef.current = true;
      onTypingStart?.();
    }

    // Reseta o timer de inatividade de 2 segundos
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // Se o campo foi completamente apagado, para o status na hora
    if (!value.trim()) {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop?.();
      }
      return;
    }

    // Timer de 2s para parar automaticamente se o usuário parar de digitar
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingStop?.();
    }, 2000);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Para o status de digitação imediatamente ao enviar
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop?.();
    }

    onSendMessage(event);
  }

  return (
    <form className="message-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Escreva uma mensagem"
        aria-label="Mensagem"
        value={messageText}
        disabled={disabled}
        onChange={(event) => handleInputChange(event.target.value)}
      />
      <button type="submit" disabled={isSendDisabled}>
        Enviar
      </button>
    </form>
  );
}

