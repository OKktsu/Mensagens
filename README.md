# Mensagens

Aplicacao de mensagens criada para estudar frontend, backend, banco de dados, autenticacao e comunicacao em tempo real.

## Stack atual

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Banco de dados: PostgreSQL (Supabase)
- ORM: Prisma
- Tempo real: Socket.IO
- Autenticacao: JWT + bcrypt

## Direcao para portfolio

O projeto comeca pequeno, mas a arquitetura foi pensada para permitir uma publicacao futura:

- PostgreSQL (Supabase) como banco principal em desenvolvimento e producao.
- Redis como camada futura para dados temporarios, como online, digitando e cache.
- Variaveis de ambiente para separar configuracao local e producao.
- Autenticacao atual com email/senha, com espaco para login social depois.

## Estrutura

```txt
Mensagens/
  docs/
  frontend/
  backend/
```

## Estado atual

- Backend REST com cadastro, login, usuarios, conversas e mensagens.
- Frontend React integrado com a API.
- Token JWT salvo no navegador para acessar rotas protegidas.
- Mensagens novas entregues em tempo real com Socket.IO.
- Banco configurado para PostgreSQL (Supabase) com `DATABASE_URL` e `DIRECT_URL`.
- API preparada para deploy no Render conectada ao Supabase.

## Proximos passos

1. Criar um projeto no [Supabase](https://supabase.com).
2. Instalar as dependencias com `pnpm install`.
3. Configurar os arquivos `.env` do backend (com as credenciais do Supabase) e do frontend.
4. Rodar as migracoes no Supabase (`pnpm --dir backend prisma:migrate:deploy` ou `prisma:migrate`).
5. Rodar backend e frontend em modo desenvolvimento.

```txt
pnpm install
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
pnpm --dir backend prisma:generate
pnpm --dir backend prisma:migrate:deploy
pnpm dev:backend
pnpm dev:frontend
```

## Variaveis de ambiente

Backend (`backend/.env`):

```txt
# Supabase Connection Pooling (porta 6543)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase Direct Connection (porta 5432 - migracoes)
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

JWT_SECRET="troque-este-segredo"
PORT=3333
FRONTEND_URLS="http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:5174"
```

Frontend:

```txt
VITE_API_URL="http://localhost:3333"
```

## Publicacao do frontend na Vercel

O frontend esta preparado para publicacao na Vercel usando o arquivo `frontend/vercel.json`.

Configuracao esperada:

```txt
Root directory: frontend
Build command: pnpm build
Install command: pnpm install --frozen-lockfile
Output directory: dist
```

Se a Vercel mostrar `vite: command not found`, o projeto provavelmente esta com Root Directory na raiz do repositorio ou com Build Command sobrescrito para `vite build`. Ajuste o projeto da Vercel para usar `frontend` como Root Directory e rode um novo deploy.

Crie a variavel `VITE_API_URL` na Vercel com a URL publica da API. Enquanto a API nao estiver publicada, o frontend hospedado carrega a interface, mas login e mensagens ainda dependem do backend local.

## Publicacao da API no Render

A API esta preparada para publicacao no Render usando `render.yaml`.

O Blueprint cria:

- Um Web Service para `backend`.
- `DATABASE_URL` conectando ao pooling do Supabase (porta 6543).
- `DIRECT_URL` conectando à conexão direta do Supabase (porta 5432) para as migrações.
- `JWT_SECRET` gerado automaticamente.
- `FRONTEND_URLS` como variavel manual, onde deve entrar a URL do frontend publicado na Vercel.

Comandos usados pelo Render:

```txt
Build: pnpm install --frozen-lockfile && pnpm --dir backend prisma:generate && pnpm --dir backend build
Pre-deploy: pnpm --dir backend prisma:migrate:deploy
Start: pnpm --dir backend start
```

O arquivo `backend/prisma/init.sql` registra o SQL inicial das tabelas do banco.

Mais detalhes estao em `docs/architecture.md`.
