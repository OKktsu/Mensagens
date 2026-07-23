# Mensagens

Aplicacao de mensagens criada para estudar frontend, backend, banco de dados, autenticacao e comunicacao em tempo real.

## Stack atual

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Banco de dados local: SQLite
- ORM: Prisma
- Tempo real: Socket.IO
- Autenticacao: JWT + bcrypt

## Direcao para portfolio

O projeto comeca pequeno, mas a arquitetura foi pensada para permitir uma publicacao futura:

- PostgreSQL como banco principal em ambiente publicado.
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
- Banco SQLite local em `backend/prisma/dev.db`.

## Proximos passos

1. Instalar as dependencias.
2. Configurar os arquivos `.env` do backend e do frontend.
3. Criar o banco local.
4. Rodar backend e frontend em modo desenvolvimento.

```txt
pnpm install
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
pnpm --dir backend prisma:migrate
pnpm dev:backend
pnpm dev:frontend
```

## Variaveis de ambiente

Backend:

```txt
DATABASE_URL="file:./dev.db"
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

Crie a variavel `VITE_API_URL` na Vercel com a URL publica da API. Enquanto a API nao estiver publicada, o frontend hospedado carrega a interface, mas login e mensagens ainda dependem do backend local.

O arquivo `backend/prisma/init.sql` registra o SQL inicial das tabelas do banco.

Mais detalhes estao em `docs/architecture.md`.
