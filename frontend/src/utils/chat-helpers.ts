import type { Conversation, Message } from "../services/api";

export function getConversationTitle(conversation: Conversation, currentUserId: string): string {
  if (conversation.title) {
    return conversation.title;
  }

  const otherMembers = conversation.members.filter((member) => member.user.id !== currentUserId);

  if (otherMembers.length === 0) {
    return "Conversa";
  }

  if (otherMembers.length === 1) {
    return otherMembers[0].user.name;
  }

  // Se for grupo sem título, junta os primeiros nomes
  return otherMembers.map((m) => m.user.name.split(" ")[0]).join(", ");
}

export function getConversationInitial(conversation: Conversation, currentUserId: string): string {
  const title = getConversationTitle(conversation, currentUserId);
  return title.charAt(0).toUpperCase();
}


export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateDivider(dateString: string): string {
  const messageDate = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(messageDate, today)) {
    return "Hoje";
  }

  if (isSameDay(messageDate, yesterday)) {
    return "Ontem";
  }

  return messageDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function addMessageIfMissing(currentMessages: Message[], newMessage: Message): Message[] {
  if (currentMessages.some((message) => message.id === newMessage.id)) {
    return currentMessages;
  }
  return [...currentMessages, newMessage];
}

export function reconcileOptimisticMessage(
  currentMessages: Message[],
  realMessage: Message,
  tempId?: string
): Message[] {
  // Se a mensagem real já existe na lista, apenas garante que qualquer tempId pendente seja removido
  const existingRealIndex = currentMessages.findIndex((m) => m.id === realMessage.id);
  if (existingRealIndex !== -1) {
    if (tempId) {
      return currentMessages.filter((m) => m.id !== tempId);
    }
    return currentMessages;
  }

  // Se temos o tempId explícito e ele está na lista, substitui pelo real no mesmo índice
  if (tempId) {
    const tempIndex = currentMessages.findIndex((m) => m.id === tempId);
    if (tempIndex !== -1) {
      const updated = [...currentMessages];
      updated[tempIndex] = realMessage;
      return updated;
    }
  }

  // Se não foi fornecido tempId ou não encontrado, busca por uma mensagem otimista idêntica do mesmo remetente
  const matchingOptimisticIndex = currentMessages.findIndex(
    (m) =>
      m.isOptimistic &&
      m.senderId === realMessage.senderId &&
      m.content === realMessage.content &&
      m.type === realMessage.type
  );

  if (matchingOptimisticIndex !== -1) {
    const updated = [...currentMessages];
    updated[matchingOptimisticIndex] = realMessage;
    return updated;
  }

  // Caso contrário, adiciona normalmente se não estiver presente
  return addMessageIfMissing(currentMessages, realMessage);
}


