const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

type RequestOptions = {
  method?: "GET" | "POST";
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

export type Conversation = {
  id: string;
  title?: string | null;
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

export type Message = {
  id: string;
  content: string;
  createdAt: string;
  conversationId?: string;
  senderId?: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
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

export function sendMessage(token: string, conversationId: string, content: string) {
  return request<{ message: Message }>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    token,
    body: {
      content,
    },
  });
}

export function markConversationAsRead(token: string, conversationId: string) {
  return request<{ ok: boolean }>(`/conversations/${conversationId}/read`, {
    method: "POST",
    token,
  });
}


