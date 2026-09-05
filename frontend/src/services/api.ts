const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type MessageReaction = {
  id: string;
  emoji: string;
  userId: string;
  user?: {
    id: string;
    name: string;
  };
};

export type Message = {
  id: string;
  content: string;
  type?: "text" | "image" | "audio" | "file";
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  duration?: number | null;
  isForwarded?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string;
    type?: "text" | "image" | "audio" | "file";
    fileUrl?: string | null;
    fileName?: string | null;
    sender: {
      id: string;
      name: string;
    };
  } | null;
  reactions?: MessageReaction[];
  starredBy?: Array<{
    userId: string;
  }>;
  createdAt: string;
  updatedAt?: string;
  conversationId?: string;
  senderId?: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
};

export type Conversation = {
  id: string;
  title?: string | null;
  pinnedMessageId?: string | null;
  pinnedMessage?: {
    id: string;
    content: string;
    type?: "text" | "image" | "audio" | "file";
    fileName?: string | null;
    sender: {
      id: string;
      name: string;
    };
  } | null;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  members: Array<{
    userId?: string;
    lastReadAt?: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
    sender: {
      id: string;
      name: string;
    };
  }>;
};


export type CallRecord = {
  id: string;
  callerId: string;
  receiverId: string;
  conversationId?: string | null;
  type: "audio" | "video";
  status: "completed" | "missed" | "rejected";
  duration: number;
  startedAt: string;
  endedAt?: string | null;
  caller: {
    id: string;
    name: string;
    email: string;
  };
  receiver: {
    id: string;
    name: string;
    email: string;
  };
  conversation?: {
    id: string;
    title?: string | null;
  } | null;
};


async function request<T>(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message ?? "Nao foi possivel completar a acao.");
  }

  return data as T;
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: {
      email,
      password,
    },
  });
}

export function register(name: string, email: string, password: string) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: {
      name,
      email,
      password,
    },
  });
}

export function getUsers(token: string) {
  return request<{ users: User[] }>("/users", {
    token,
  });
}

export function getConversations(token: string) {
  return request<{ conversations: Conversation[] }>("/conversations", {
    token,
  });
}

export function createConversation(token: string, participantId: string) {
  return request<{ conversation: Conversation }>("/conversations", {
    method: "POST",
    token,
    body: {
      participantId,
    },
  });
}

export function createGroup(
  token: string,
  participantIds: string[],
  title?: string,
) {
  return request<{ conversation: Conversation }>("/conversations", {
    method: "POST",
    token,
    body: {
      participantIds,
      title: title?.trim() || undefined,
    },
  });
}

export function getMessages(token: string, conversationId: string) {
  return request<{ messages: Message[] }>(`/conversations/${conversationId}/messages`, {
    token,
  });
}

export type SendMessagePayload = {
  content?: string;
  type?: "text" | "image" | "audio" | "file";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  replyToId?: string;
  isForwarded?: boolean;
};

export function sendMessage(
  token: string,
  conversationId: string,
  payload: string | SendMessagePayload,
) {
  const body = typeof payload === "string" ? { content: payload } : payload;

  return request<{ message: Message }>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    token,
    body,
  });
}

export function updateMessage(
  token: string,
  conversationId: string,
  messageId: string,
  content: string,
) {
  return request<{ message: Message }>(
    `/conversations/${conversationId}/messages/${messageId}`,
    {
      method: "PATCH",
      token,
      body: { content },
    },
  );
}

export function deleteMessage(
  token: string,
  conversationId: string,
  messageId: string,
) {
  return request<{ message: Message }>(
    `/conversations/${conversationId}/messages/${messageId}`,
    {
      method: "DELETE",
      token,
    },
  );
}

export function toggleReaction(
  token: string,
  conversationId: string,
  messageId: string,
  emoji: string,
) {
  return request<{ reactions: MessageReaction[] }>(
    `/conversations/${conversationId}/messages/${messageId}/reactions`,
    {
      method: "POST",
      token,
      body: { emoji },
    },
  );
}

export function toggleStarMessage(
  token: string,
  conversationId: string,
  messageId: string,
) {
  return request<{ isStarred: boolean }>(
    `/conversations/${conversationId}/messages/${messageId}/star`,
    {
      method: "POST",
      token,
    },
  );
}

export function pinMessage(
  token: string,
  conversationId: string,
  messageId: string,
) {
  return request<{ ok: boolean; pinnedMessage: Message }>(
    `/conversations/${conversationId}/pin/${messageId}`,
    {
      method: "POST",
      token,
    },
  );
}

export function unpinMessage(token: string, conversationId: string) {
  return request<{ ok: boolean }>(`/conversations/${conversationId}/pin`, {
    method: "DELETE",
    token,
  });
}

export async function uploadFile(
  token: string,
  file: File | Blob,
  fileName?: string,
): Promise<{
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  type: "image" | "audio" | "file";
}> {
  const formData = new FormData();
  if (file instanceof File) {
    formData.append("file", file);
  } else {
    formData.append("file", file, fileName || "audio_gravado.webm");
  }

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Falha ao enviar arquivo.");
  }

  return response.json();
}

export function getMediaUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }
  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function markConversationAsRead(token: string, conversationId: string) {

  return request<{ ok: boolean }>(`/conversations/${conversationId}/read`, {
    method: "POST",
    token,
  });
}

export function getCalls(token: string) {
  return request<{ calls: CallRecord[] }>("/calls", {
    token,
  });
}

export function createCallLog(
  token: string,
  data: {
    receiverId: string;
    conversationId?: string;
    type: "audio" | "video";
    status: "completed" | "missed" | "rejected";
    duration: number;
    startedAt?: string;
    endedAt?: string;
  },
) {
  return request<{ call: CallRecord }>("/calls", {
    method: "POST",
    token,
    body: data,
  });
}

export type LinkPreviewData = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  themeColor?: string;
  mediaType?: string;
};

export function getLinkPreview(token: string, url: string) {
  return request<{ preview: LinkPreviewData | null }>(
    `/link-preview?url=${encodeURIComponent(url)}`,
    {
      method: "GET",
      token,
    },
  );
}

export type SearchCategory = "all" | "messages" | "users" | "media" | "links" | "files";

export type SearchMessageResult = {
  id: string;
  content: string;
  type: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  createdAt: string;
  conversationId: string;
  conversationTitle?: string | null;
  sender: {
    id: string;
    name: string;
    email: string;
  };
};

export type SearchUserResult = {
  id: string;
  name: string;
  email: string;
};

export type SearchResults = {
  messages: SearchMessageResult[];
  users: SearchUserResult[];
  totalMatches: number;
};

export function searchGlobal(
  token: string,
  query: string,
  category: SearchCategory = "all",
  conversationId?: string,
) {
  let url = `/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`;
  if (conversationId) {
    url += `&conversationId=${encodeURIComponent(conversationId)}`;
  }

  return request<{ results: SearchResults }>(url, {
    method: "GET",
    token,
  });
}
