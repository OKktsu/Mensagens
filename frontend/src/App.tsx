import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  AuthUser,
  Conversation,
  Message,
  User,
  createConversation,
  getConversations,
  getMessages,
  getUsers,
  login,
  register,
  sendMessage,
} from "./services/api";
import { ChatSocket, createChatSocket } from "./services/socket";

const tokenStorageKey = "mensagens:token";
const userStorageKey = "mensagens:user";

type AuthMode = "login" | "register";

function getStoredUser() {
  const storedUser = localStorage.getItem(userStorageKey);

  if (!storedUser) {
    return null;
  }

  return JSON.parse(storedUser) as AuthUser;
}

function getConversationTitle(conversation: Conversation, currentUserId: string) {
  const otherMember = conversation.members.find((member) => member.user.id !== currentUserId);

  return otherMember?.user.name ?? "Conversa";
}

function getConversationInitial(conversation: Conversation, currentUserId: string) {
  return getConversationTitle(conversation, currentUserId).charAt(0).toUpperCase();
}

function addMessageIfMissing(currentMessages: Message[], newMessage: Message) {
  if (currentMessages.some((message) => message.id === newMessage.id)) {
    return currentMessages;
  }

  return [...currentMessages, newMessage];
}

export function App() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("marcelo@example.com");
  const [password, setPassword] = useState("123456");
  const [token, setToken] = useState(() => localStorage.getItem(tokenStorageKey));
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser());
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [socket, setSocket] = useState<ChatSocket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return;
    }

    const chatSocket = createChatSocket(token);

    chatSocket.on("connect_error", () => {
      setError("Nao foi possivel conectar ao tempo real.");
    });

    setSocket(chatSocket);

    return () => {
      chatSocket.disconnect();
      setSocket(null);
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const authToken = token;

    async function loadInitialData() {
      try {
        setError("");
        const [usersResponse, conversationsResponse] = await Promise.all([
          getUsers(authToken),
          getConversations(authToken),
        ]);

        setUsers(usersResponse.users);
        setConversations(conversationsResponse.conversations);
        setSelectedConversationId((currentId) => currentId ?? conversationsResponse.conversations[0]?.id ?? null);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Sessao invalida.");
        handleLogout();
      }
    }

    loadInitialData();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedConversationId) {
      setMessages([]);
      return;
    }

    const authToken = token;
    const conversationId = selectedConversationId;

    async function loadMessages() {
      try {
        const response = await getMessages(authToken, conversationId);
        setMessages(response.messages);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Nao foi possivel carregar as mensagens.");
      }
    }

    loadMessages();
  }, [token, selectedConversationId]);

  useEffect(() => {
    if (!socket || !selectedConversationId) {
      return;
    }

    socket.emit("conversation:join", selectedConversationId);

    function handleNewMessage(message: Message) {
      if (message.conversationId !== selectedConversationId) {
        return;
      }

      setMessages((currentMessages) => addMessageIfMissing(currentMessages, message));
    }

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.emit("conversation:leave", selectedConversationId);
      socket.off("message:new", handleNewMessage);
    };
  }, [socket, selectedConversationId]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response =
        authMode === "login" ? await login(email, password) : await register(name, email, password);

      localStorage.setItem(tokenStorageKey, response.token);
      localStorage.setItem(userStorageKey, JSON.stringify(response.user));
      setToken(response.token);
      setCurrentUser(response.user);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nao foi possivel entrar.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(tokenStorageKey);
    localStorage.removeItem(userStorageKey);
    setToken(null);
    setCurrentUser(null);
    setUsers([]);
    setConversations([]);
    setSelectedConversationId(null);
    setMessages([]);
    socket?.disconnect();
    setSocket(null);
  }

  async function handleCreateConversation(participantId: string) {
    if (!token) {
      return;
    }

    try {
      setError("");
      const response = await createConversation(token, participantId);
      const conversationsResponse = await getConversations(token);
      setConversations(conversationsResponse.conversations);
      setSelectedConversationId(response.conversation.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nao foi possivel criar a conversa.");
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !selectedConversationId || !messageText.trim()) {
      return;
    }

    try {
      setError("");
      const response = await sendMessage(token, selectedConversationId, messageText);
      setMessages((currentMessages) => addMessageIfMissing(currentMessages, response.message));
      setMessageText("");
      const conversationsResponse = await getConversations(token);
      setConversations(conversationsResponse.conversations);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Nao foi possivel enviar a mensagem.");
    }
  }

  if (!token || !currentUser) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <span className="eyebrow">Mensagens</span>
          <h1>{authMode === "login" ? "Entrar" : "Criar conta"}</h1>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <label>
                Nome
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Aguarde" : authMode === "login" ? "Entrar" : "Cadastrar"}
            </button>
          </form>

          <button
            className="text-button"
            type="button"
            onClick={() => {
              setError("");
              setAuthMode(authMode === "login" ? "register" : "login");
            }}
          >
            {authMode === "login" ? "Criar uma conta" : "Ja tenho conta"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <header className="sidebar-header">
          <div>
            <span className="eyebrow">Mensagens</span>
            <h1>Conversas</h1>
          </div>
          <button className="ghost-button" type="button" onClick={handleLogout}>
            Sair
          </button>
        </header>

        <section className="user-strip" aria-label="Usuarios">
          {users.map((user) => (
            <button className="user-chip" type="button" key={user.id} onClick={() => handleCreateConversation(user.id)}>
              <span>{user.name.charAt(0).toUpperCase()}</span>
              {user.name}
            </button>
          ))}
        </section>

        <section className="conversation-list" aria-label="Lista de conversas">
          {conversations.map((conversation) => {
            const lastMessage = conversation.messages[0];
            const isSelected = conversation.id === selectedConversationId;

            return (
              <button
                className={isSelected ? "conversation-item selected" : "conversation-item"}
                type="button"
                key={conversation.id}
                onClick={() => setSelectedConversationId(conversation.id)}
              >
                <span className="avatar">{getConversationInitial(conversation, currentUser.id)}</span>
                <span className="conversation-content">
                  <span className="conversation-topline">
                    <strong>{getConversationTitle(conversation, currentUser.id)}</strong>
                    <small>{new Date(conversation.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>
                  </span>
                  <span>{lastMessage?.content ?? "Conversa criada"}</span>
                </span>
              </button>
            );
          })}
        </section>
      </aside>

      <section className="chat-panel" aria-label="Conversa aberta">
        <header className="chat-header">
          {selectedConversation ? (
            <>
              <span className="avatar">{getConversationInitial(selectedConversation, currentUser.id)}</span>
              <div>
                <strong>{getConversationTitle(selectedConversation, currentUser.id)}</strong>
                <span>{currentUser.name}</span>
              </div>
            </>
          ) : (
            <div>
              <strong>Nenhuma conversa</strong>
              <span>Escolha um usuario para comecar</span>
            </div>
          )}
        </header>

        {error && <p className="inline-error">{error}</p>}

        <div className="message-list">
          {messages.map((message) => (
            <article className={message.sender.id === currentUser.id ? "message mine" : "message"} key={message.id}>
              <span>{message.sender.name}</span>
              <p>{message.content}</p>
            </article>
          ))}
        </div>

        <form className="message-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder="Escreva uma mensagem"
            aria-label="Mensagem"
            value={messageText}
            disabled={!selectedConversation}
            onChange={(event) => setMessageText(event.target.value)}
          />
          <button type="submit" disabled={!selectedConversation || !messageText.trim()}>
            Enviar
          </button>
        </form>
      </section>
    </main>
  );
}
