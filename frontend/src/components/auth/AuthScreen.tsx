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
    <div className="min-h-screen bg-[#090a0f] text-slate-200 font-sans selection:bg-purple-600 selection:text-white flex flex-col justify-between overflow-x-hidden relative">
      {/* ==========================================================================
          1. AMBIENT BACKGROUND CANVAS & ATMOSPHERIC ART
         ========================================================================== */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Atmospheric 3D Wave Mesh Backdrop */}
        <img
          alt="PulseChat Dynamic Sonic Waves"
          className="w-full h-full object-cover opacity-35 filter blur-[1px] mix-blend-screen scale-105"
          src="/bg-mesh.png"
          onError={(e) => {
            // Fallback para CDN caso local demore
            (e.target as HTMLImageElement).src =
              "https://lh3.googleusercontent.com/aida/AEtjO1VytIphcKLjPD0xJkj7ZWP4XxBVRjT_p987UXdIpSNaQ4snK-9oh0mkDUjwvpzzGwjXEsJ5t8xx-sK1IZ4nClRZiLPQ1A2dxsnCxPHsvg29zs9vBPeJfHeB0nSvtmNHN2YeyYpc6nHv7ZiFkx-L_sOJoV3EzNw7twwWMVwWoRQ7DazrwbcBxBXWJ4MszITuWeq4pMW30_7I6ZhK1BJ4K0UBcg-x0xPioS10GbVSPsXrOpbX5XVXsH7bNeg";
          }}
        />
        {/* Deep Vignette and Radial Shading Overlay */}
        <div className="absolute inset-0 bg-mesh-layer" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/75 to-[#090a0f]/60" />
      </div>

      {/* ==========================================================================
          2. TOP NAVIGATION / BRAND HEADER
         ========================================================================== */}
      <header className="relative z-10 w-full pt-8 pb-4 px-6 sm:px-8 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3.5 group cursor-pointer select-none">
          {/* Original PulseChat Logo Mark: Sonic wave merged with speech nexus */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 p-[1.5px] shadow-lg shadow-violet-600/30 group-hover:shadow-violet-500/50 transition duration-300">
            <div className="w-full h-full bg-[#11121b] rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <svg
                className="w-5 h-5 text-violet-400 group-hover:scale-110 transition-transform duration-300"
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
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5 font-sans">
              Pulse
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-300">
                Chat
              </span>
            </span>
          </div>
        </div>

        {/* Live Connection Status Pill */}
        <div className="hidden sm:flex items-center space-x-2 text-xs text-zinc-400 bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium tracking-wide">Rede de voz e chat online</span>
        </div>
      </header>

      {/* ==========================================================================
          3. MAIN LOGIN CONTENT BOX
         ========================================================================== */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[890px] bg-[#14151f]/90 border border-[#232536]/90 rounded-2xl glass-card-border backdrop-blur-xl p-7 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Subtle top line highlight */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

          {/* Layout Grid: Dual Action split (Manual Form vs Instant QR) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* ------------------------------------------------------------------
                COLUNA ESQUERDA: Formulário de Autenticação
               ------------------------------------------------------------------ */}
            <section className="md:col-span-7 flex flex-col justify-center space-y-6">
              <div>
                <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-white">
                  {authMode === "login" ? "E aí, de volta na área?" : "Crie seu perfil no Pulse"}
                </h1>
                <p className="text-zinc-400 text-sm mt-1.5 font-normal">
                  {authMode === "login"
                    ? "Seus squads e conversas estão te esperando."
                    : "Conecte-se em tempo real aos seus squads e canais de voz."}
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Campo de Nome (Registro) */}
                {authMode === "register" && (
                  <div>
                    <label
                      className="block text-[11px] font-bold tracking-wider uppercase text-zinc-400 mb-1.5"
                      htmlFor="name"
                    >
                      Nome Completo <span className="text-violet-400">*</span>
                    </label>
                    <input
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0e0f16] border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200"
                      id="name"
                      name="name"
                      placeholder="Seu nome ou apelido"
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}

                {/* Campo de Email / Identificador */}
                <div>
                  <label
                    className="block text-[11px] font-bold tracking-wider uppercase text-zinc-400 mb-1.5"
                    htmlFor="email"
                  >
                    E-mail ou Usuário <span className="text-violet-400">*</span>
                  </label>
                  <input
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0e0f16] border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200"
                    id="email"
                    name="email"
                    placeholder="seu_nick ou email@exemplo.com"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Campo de Senha com Eye Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      className="block text-[11px] font-bold tracking-wider uppercase text-zinc-400"
                      htmlFor="password"
                    >
                      Sua Senha <span className="text-violet-400">*</span>
                    </label>
                    {authMode === "login" && (
                      <span className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer select-none">
                        Esqueceu?
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0e0f16] border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200 pr-10"
                      id="password"
                      name="password"
                      placeholder="••••••••••••"
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      aria-label="Mostrar ou ocultar senha"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 focus:outline-none"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Checkbox Lembrar Dispositivo */}
                <div className="flex items-center pt-1">
                  <input
                    checked={rememberMe}
                    className="h-4 w-4 rounded bg-[#0e0f16] border-zinc-700 text-violet-600 focus:ring-violet-500/40 focus:ring-offset-0 cursor-pointer accent-violet-600"
                    id="remember_me"
                    name="remember_me"
                    type="checkbox"
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label
                    className="ml-2.5 block text-xs text-zinc-400 cursor-pointer select-none"
                    htmlFor="remember_me"
                  >
                    Lembrar deste dispositivo
                  </label>
                </div>

                {/* Mensagem de Erro */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium">
                    <span className="material-symbols-outlined text-[16px] text-rose-400">error</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Botão de Envio Principal */}
                <div className="pt-2">
                  <button
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm tracking-wide shadow-lg shadow-violet-600/25 active:scale-[0.99] transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                    type="submit"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processando...</span>
                      </span>
                    ) : (
                      <>
                        <span>{authMode === "login" ? "Entrar no PulseChat" : "Criar Conta no Pulse"}</span>
                        <svg className="w-4 h-4 text-violet-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                </div>
              </form>

              {/* Link Alternativo de Troca de Modo */}
              <div className="pt-1 text-xs text-zinc-400">
                {authMode === "login" ? (
                  <>
                    Ainda não tem conta?{" "}
                    <button
                      className="text-violet-400 font-semibold hover:text-violet-300 ml-1 underline underline-offset-4 decoration-violet-500/40 hover:decoration-violet-300 cursor-pointer"
                      type="button"
                      onClick={toggleMode}
                    >
                      Crie uma agora
                    </button>
                  </>
                ) : (
                  <>
                    Já tem uma conta?{" "}
                    <button
                      className="text-violet-400 font-semibold hover:text-violet-300 ml-1 underline underline-offset-4 decoration-violet-500/40 hover:decoration-violet-300 cursor-pointer"
                      type="button"
                      onClick={toggleMode}
                    >
                      Fazer login
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* ------------------------------------------------------------------
                DIVISOR VERTICAL CENTRAL (Desktop)
               ------------------------------------------------------------------ */}
            <div className="hidden md:block absolute left-[58%] top-12 bottom-12 w-[1px] bg-gradient-to-b from-transparent via-zinc-800 to-transparent" />

            {/* ------------------------------------------------------------------
                COLUNA DIREITA: QR Code Instantâneo & Acesso Rápido
               ------------------------------------------------------------------ */}
            <section className="md:col-span-5 flex flex-col items-center text-center pl-0 md:pl-6 pt-6 md:pt-0 border-t md:border-t-0 border-zinc-800/60">
              {/* Container estilizado do QR Code com Glow */}
              <div className="relative group p-3 bg-[#0a0b10] border border-violet-500/25 rounded-2xl shadow-xl hover:border-violet-500/50 transition duration-300">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition duration-500 -z-10" />

                {/* Placa branca de alto contraste */}
                <div className="relative w-44 h-44 bg-white rounded-xl p-2.5 flex items-center justify-center overflow-hidden">
                  <svg className="w-full h-full text-slate-900" fill="currentColor" viewBox="0 0 100 100">
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

                  {/* Emblema central animado Pulse */}
                  <div className="absolute inset-0 m-auto w-11 h-11 bg-[#090a0f] rounded-xl border-2 border-white flex items-center justify-center shadow-lg">
                    <div className="pulse-ring-anim w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center">
                      <svg
                        className="w-3.5 h-3.5 text-white"
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

              {/* Descrição e Instrução QR */}
              <div className="mt-4 space-y-1">
                <h2 className="text-base font-bold text-white tracking-tight">Entrar com o App Pulse</h2>
                <p className="text-xs text-zinc-400 max-w-[210px] mx-auto leading-relaxed">
                  Aponte a câmera do celular no aplicativo móvel para entrar num piscar de olhos.
                </p>
              </div>

              {/* Selo de Segurança */}
              <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-950/40 border border-violet-700/30 text-[11px] font-medium text-violet-300">
                <span className="material-symbols-outlined text-[14px] text-violet-400">verified_user</span>
                <span>Criptografia ponta a ponta</span>
              </div>

              {/* Opções Secundárias de Acesso Rápido */}
              <div className="mt-5 w-full pt-4 border-t border-zinc-800/60 flex items-center justify-center space-x-3">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                  Acesso rápido:
                </span>
                <button
                  className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 hover:text-white transition"
                  title="Entrar com Google"
                  type="button"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887C18.2 16.14 15.645 18 12.24 18c-3.315 0-6-2.685-6-6s2.685-6 6-6c1.47 0 2.815.535 3.86 1.415l2.4-2.4C16.995 3.525 14.775 2.7 12.24 2.7c-5.135 0-9.3 4.165-9.3 9.3s4.165 9.3 9.3 9.3c5.365 0 8.945-3.77 8.945-9.105 0-.61-.065-1.125-.15-1.61h-8.795z" />
                  </svg>
                </button>
                <button
                  className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 hover:text-white transition"
                  title="Entrar com GitHub"
                  type="button"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ==========================================================================
          4. MINIMAL DISCRETE FOOTER
         ========================================================================== */}
      <footer className="relative z-10 py-5 px-6 text-center text-xs text-zinc-500">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="hover:text-zinc-300 transition-colors cursor-pointer">Termos de Uso</span>
          <span className="text-zinc-700">•</span>
          <span className="hover:text-zinc-300 transition-colors cursor-pointer">Privacidade</span>
          <span className="text-zinc-700">•</span>
          <span className="hover:text-zinc-300 transition-colors cursor-pointer">Status do Sistema</span>
          <span className="text-zinc-700">•</span>
          <span className="text-zinc-600">PulseChat build 4.12.0-desktop</span>
        </div>
      </footer>
    </div>
  );
}
