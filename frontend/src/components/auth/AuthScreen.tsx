import { useState, FormEvent } from "react";

type AuthMode = "login" | "register";

type AuthScreenProps = {
  isLoading: boolean;
  error: string;
  onLogin: (email: string, password: string) => Promise<unknown>;
  onRegister: (name: string, email: string, password: string) => Promise<unknown>;
  onClearError: () => void;
};

export function AuthScreen({
  isLoading,
  error,
  onLogin,
  onRegister,
  onClearError,
}: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("marcelo@example.com");
  const [password, setPassword] = useState("123456");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onClearError();

    if (authMode === "login") {
      await onLogin(email, password).catch(() => {});
    } else {
      await onRegister(name, email, password).catch(() => {});
    }
  }

  function toggleMode() {
    onClearError();
    setAuthMode(authMode === "login" ? "register" : "login");
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <span className="eyebrow">Mensagens</span>
        <h1>{authMode === "login" ? "Entrar" : "Criar conta"}</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          {authMode === "register" && (
            <label>
              Nome
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Aguarde" : authMode === "login" ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <button className="text-button" type="button" onClick={toggleMode}>
          {authMode === "login" ? "Criar uma conta" : "Já tenho conta"}
        </button>
      </section>
    </main>
  );
}
