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

export function addMessageIfMissing(currentMessages: Message[], newMessage: Message): Message[] {
  if (currentMessages.some((message) => message.id === newMessage.id)) {
    return currentMessages;
  }
  return [...currentMessages, newMessage];
}
