# Mensagens

Aplicacao de mensagens criada para estudar frontend, backend, banco de dados, autenticacao e comunicacao em tempo real.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Banco de dados: SQLite
- ORM: Prisma
- Tempo real: Socket.IO
- Autenticacao: JWT + bcrypt

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
2. Configurar o `.env` do backend.
3. Criar o banco local.
4. Rodar backend e frontend em modo desenvolvimento.

```txt
pnpm install
copy backend\.env.example backend\.env
pnpm --dir backend prisma:migrate
pnpm dev:backend
pnpm dev:frontend
```

O arquivo `backend/prisma/init.sql` registra o SQL inicial das tabelas do banco.

Mais detalhes estao em `docs/architecture.md`.
