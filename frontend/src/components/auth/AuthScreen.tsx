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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="pulse-auth-root">
      {/* 1. ATMOSFERA E CENÁRIO 3D */}
      <div className="pulse-auth-bg" aria-hidden="true">
        <img
          alt="PulseChat Dynamic Sonic Waves"
          className="pulse-auth-bg-img"
          src="/bg-mesh.png"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://lh3.googleusercontent.com/aida/AEtjO1VytIphcKLjPD0xJkj7ZWP4XxBVRjT_p987UXdIpSNaQ4snK-9oh0mkDUjwvpzzGwjXEsJ5t8xx-sK1IZ4nClRZiLPQ1A2dxsnCxPHsvg29zs9vBPeJfHeB0nSvtmNHN2YeyYpc6nHv7ZiFkx-L_sOJoV3EzNw7twwWMVwWoRQ7DazrwbcBxBXWJ4MszITuWeq4pMW30_7I6ZhK1BJ4K0UBcg-x0xPioS10GbVSPsXrOpbX5XVXsH7bNeg";
          }}
        />
        <div className="pulse-auth-bg-mesh" />
        <div className="pulse-auth-bg-vignette" />
      </div>

      {/* 2. CABEÇALHO DA MARCA */}
      <header className="pulse-auth-header">
        <div className="pulse-auth-logo">
          <div className="pulse-auth-logo-badge">
            <div className="pulse-auth-logo-inner">
              <svg
                width="20"
                height="20"
                style={{ width: "20px", height: "20px", color: "#a78bfa" }}
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <path d="M12 3v18" />
                <path d="M17 7v10" />
                <path d="M7 9v6" />
                <path d="M21 11v2" />
                <path d="M3 11v2" />
              </svg>
            </div>
          </div>
          <div className="pulse-auth-logo-title">
            Pulse<span>Chat</span>
          </div>
        </div>

        <div className="pulse-auth-status-pill">
          <span className="pulse-auth-status-dot" />
          <span>Rede de voz e chat online</span>
        </div>
      </header>

      {/* 3. CARD CENTRAL DUAL SPLIT */}
      <main className="pulse-auth-main">
        <div className="pulse-auth-card">
          <div className="pulse-auth-card-topline" />

          <div className="pulse-auth-card-grid">
            {/* COLUNA ESQUERDA: FORMULÁRIO */}
            <section>
              <h1 className="pulse-auth-title">
                {authMode === "login" ? "E aí, de volta na área?" : "Crie seu perfil no Pulse"}
              </h1>
              <p className="pulse-auth-desc">
                {authMode === "login"
                  ? "Seus squads e conversas estão te esperando."
                  : "Conecte-se em tempo real aos seus squads e canais de voz."}
              </p>

              <form className="pulse-auth-form" onSubmit={handleSubmit}>
                {authMode === "register" && (
                  <div className="pulse-auth-field">
                    <label className="pulse-auth-label" htmlFor="name">
                      <span>Nome Completo</span>
                      <span className="req">*</span>
                    </label>
                    <div className="pulse-auth-input-wrap">
                      <input
                        className="pulse-auth-input"
                        id="name"
                        placeholder="Seu nome ou apelido"
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="pulse-auth-field">
                  <label className="pulse-auth-label" htmlFor="email">
                    <span>E-mail ou Usuário</span>
                    <span className="req">*</span>
                  </label>
                  <div className="pulse-auth-input-wrap">
                    <input
                      className="pulse-auth-input"
                      id="email"
                      placeholder="seu_nick ou email@exemplo.com"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pulse-auth-field">
                  <div className="pulse-auth-label">
                    <span>
                      Sua Senha <span className="req">*</span>
                    </span>
                    {authMode === "login" && <span className="forgot-link">Esqueceu?</span>}
                  </div>
                  <div className="pulse-auth-input-wrap">
                    <input
                      className="pulse-auth-input has-eye"
                      id="password"
                      placeholder="••••••••••••"
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      aria-label="Mostrar ou ocultar senha"
                      className="pulse-auth-eye-btn"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <label className="pulse-auth-checkbox-row">
                  <input
                    checked={rememberMe}
                    type="checkbox"
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Lembrar deste dispositivo</span>
                </label>

                {error && (
                  <div className="pulse-auth-error-banner">
                    <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#f87171" }}>
                      error
                    </span>
                    <span>{error}</span>
                  </div>
                )}

                <button className="pulse-auth-submit-btn" disabled={isLoading} type="submit">
                  {isLoading ? (
                    <span>Processando...</span>
                  ) : (
                    <>
                      <span>{authMode === "login" ? "Entrar no PulseChat" : "Criar Conta no Pulse"}</span>
                      <svg
                        width="16"
                        height="16"
                        style={{ width: "16px", height: "16px", color: "#e0e7ff" }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.2"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="pulse-auth-switch-text">
                {authMode === "login" ? (
                  <>
                    Ainda não tem conta?
                    <button className="pulse-auth-switch-link" type="button" onClick={toggleMode}>
                      Crie uma agora
                    </button>
                  </>
                ) : (
                  <>
                    Já tem uma conta?
                    <button className="pulse-auth-switch-link" type="button" onClick={toggleMode}>
                      Fazer login
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* DIVISOR VERTICAL */}
            <div className="pulse-auth-divider" />

            {/* COLUNA DIREITA: QR CODE E ACESSO RÁPIDO */}
            <section className="pulse-auth-qr-section">
              <div className="pulse-auth-qr-container">
                <div className="pulse-auth-qr-glow" />

                <div className="pulse-auth-qr-plate">
                  <svg
                    width="156"
                    height="156"
                    style={{ width: "156px", height: "156px", color: "#0f172a" }}
                    fill="currentColor"
                    viewBox="0 0 100 100"
                  >
                    {/* Top Left Finder Pattern */}
                    <rect fill="none" height="26" rx="4" stroke="currentColor" strokeWidth="4" width="26" x="6" y="6" />
                    <rect fill="currentColor" height="12" rx="2" width="12" x="13" y="13" />
                    {/* Top Right Finder Pattern */}
                    <rect fill="none" height="26" rx="4" stroke="currentColor" strokeWidth="4" width="26" x="68" y="6" />
                    <rect fill="currentColor" height="12" rx="2" width="12" x="75" y="13" />
                    {/* Bottom Left Finder Pattern */}
                    <rect fill="none" height="26" rx="4" stroke="currentColor" strokeWidth="4" width="26" x="6" y="68" />
                    <rect fill="currentColor" height="12" rx="2" width="12" x="13" y="75" />
                    {/* Data Nodes */}
                    <rect height="5" rx="1.5" width="5" x="38" y="8" />
                    <rect height="5" rx="1.5" width="6" x="46" y="8" />
                    <rect height="5" rx="1.5" width="5" x="56" y="8" />
                    <rect height="6" rx="1.5" width="6" x="38" y="17" />
                    <rect height="6" rx="1.5" width="8" x="52" y="17" />
                    <rect height="6" rx="1.5" width="6" x="8" y="38" />
                    <rect height="5" rx="1.5" width="5" x="18" y="38" />
                    <rect height="6" rx="1.5" width="5" x="8" y="48" />
                    <rect height="6" rx="1.5" width="7" x="18" y="52" />
                    <rect height="6" rx="1.5" width="6" x="27" y="44" />
                    <rect height="5" rx="1.5" width="7" x="68" y="38" />
                    <rect height="5" rx="1.5" width="10" x="82" y="40" />
                    <rect height="6" rx="1.5" width="6" x="72" y="48" />
                    <rect height="6" rx="1.5" width="6" x="86" y="52" />
                    <rect height="6" rx="1.5" width="6" x="40" y="70" />
                    <rect height="6" rx="1.5" width="7" x="52" y="74" />
                    <rect height="7" rx="1.5" width="6" x="44" y="84" />
                    <rect height="6" rx="1.5" width="7" x="70" y="72" />
                    <rect height="6" rx="1.5" width="6" x="82" y="72" />
                    <rect height="6" rx="1.5" width="10" x="70" y="84" />
                    <rect height="7" rx="1.5" width="7" x="85" y="84" />
                  </svg>

                  <div className="pulse-auth-qr-center-badge">
                    <div className="pulse-auth-qr-center-inner">
                      <svg
                        width="14"
                        height="14"
                        style={{ width: "14px", height: "14px", color: "#ffffff" }}
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.8"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 4v16" />
                        <path d="M18 8v8" />
                        <path d="M6 10v4" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="pulse-auth-qr-title">Entrar com o App Pulse</h2>
              <p className="pulse-auth-qr-desc">
                Aponte a câmera do celular no aplicativo móvel para entrar num piscar de olhos.
              </p>

              <div className="pulse-auth-security-badge">
                <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#a78bfa" }}>
                  verified_user
                </span>
                <span>Criptografia ponta a ponta</span>
              </div>

              <div className="pulse-auth-quick-access">
                <span className="pulse-auth-quick-label">Acesso rápido:</span>
                <button className="pulse-auth-quick-btn" title="Entrar com Google" type="button">
                  <svg width="15" height="15" style={{ width: "15px", height: "15px" }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887C18.2 16.14 15.645 18 12.24 18c-3.315 0-6-2.685-6-6s2.685-6 6-6c1.47 0 2.815.535 3.86 1.415l2.4-2.4C16.995 3.525 14.775 2.7 12.24 2.7c-5.135 0-9.3 4.165-9.3 9.3s4.165 9.3 9.3 9.3c5.365 0 8.945-3.77 8.945-9.105 0-.61-.065-1.125-.15-1.61h-8.795z" />
                  </svg>
                </button>
                <button className="pulse-auth-quick-btn" title="Entrar com GitHub" type="button">
                  <svg width="15" height="15" style={{ width: "15px", height: "15px" }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* 4. RODAPÉ DISCRETO */}
      <footer className="pulse-auth-footer">
        <span className="link">Termos de Uso</span>
        <span className="dot">•</span>
        <span className="link">Privacidade</span>
        <span className="dot">•</span>
        <span className="link">Status do Sistema</span>
        <span className="dot">•</span>
        <span className="ver">PulseChat build 4.12.0-desktop</span>
      </footer>
    </div>
  );
}
