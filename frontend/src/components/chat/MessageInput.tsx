import { FormEvent } from "react";

type MessageInputProps = {
  messageText: string;
  onMessageChange: (text: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
};

export function MessageInput({
  messageText,
  onMessageChange,
  onSendMessage,
  disabled,
}: MessageInputProps) {
  const isSendDisabled = disabled || !messageText.trim();

  return (
    <form className="message-form" onSubmit={onSendMessage}>
      <input
        type="text"
        placeholder="Escreva uma mensagem"
        aria-label="Mensagem"
        value={messageText}
        disabled={disabled}
        onChange={(event) => onMessageChange(event.target.value)}
      />
      <button type="submit" disabled={isSendDisabled}>
        Enviar
      </button>
    </form>
  );
}
