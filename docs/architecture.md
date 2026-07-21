# Mensagens

## Objetivo

Criar uma aplicacao de mensagens com foco em construir uma base real de produto: usuarios autenticados, conversas, mensagens persistidas e comunicacao em tempo real.

O projeto tambem serve como ambiente de estudo para frontend, backend, banco de dados, autenticacao, autorizacao e eventos em tempo real.

## Stack inicial

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Banco de dados: SQLite
- ORM: Prisma
- Tempo real: Socket.IO
- Autenticacao: JWT + bcrypt

## Por que essa stack combina com o projeto

React e uma boa escolha para uma interface de mensagens porque o app tera varias partes dinamicas: lista de conversas, conversa ativa, mensagens, campo de envio, estados de carregamento e atualizacoes visuais.

Vite mantem o ambiente de frontend simples e rapido, sem exigir uma estrutura maior logo no inicio.

TypeScript ajuda a manter claros os formatos principais do sistema, como usuarios, conversas, mensagens e respostas da API.

Node.js e Express combinam bem com uma aplicacao de chat porque o backend precisa lidar com rotas HTTP, autenticacao, acesso ao banco e futuramente conexoes em tempo real.

SQLite e suficiente para a primeira versao porque permite persistir dados sem uma infraestrutura pesada. Prisma organiza o acesso ao banco e facilita uma futura migracao para PostgreSQL, caso o projeto cresca.

Socket.IO entra na aplicacao para permitir eventos em tempo real entre backend e frontend. Na versao atual, ele autentica a conexao com o token JWT, permite entrar na sala de uma conversa e entrega `message:new` quando uma mensagem nova e salva.

Eventos iniciais:

- connection:ready
- conversation:join
- conversation:leave
- message:new

## MVP

A primeira versao deve focar no nucleo da aplicacao:

- Cadastro de usuario
- Login
- Listagem de usuarios
- Criacao de conversa com outro usuario
- Listagem das conversas do usuario logado
- Abertura de uma conversa
- Envio de mensagem
- Historico de mensagens

## Entidades principais

### User

Representa uma pessoa cadastrada no sistema.

- id
- name
- email
- passwordHash
- createdAt

### Conversation

Representa uma conversa entre dois ou mais usuarios.

- id
- createdAt
- updatedAt

### ConversationMember

Representa a participacao de um usuario em uma conversa.

- id
- userId
- conversationId
- joinedAt

### Message

Representa uma mensagem enviada dentro de uma conversa.

- id
- content
- senderId
- conversationId
- createdAt

## Esquema inicial do banco

O banco pode comecar com quatro tabelas principais. A estrutura abaixo reflete o modelo esperado no Prisma e mantem espaco para conversas em grupo no futuro.

### users

| Campo | Tipo | Regra |
| --- | --- | --- |
| id | string | Chave primaria |
| name | string | Obrigatorio |
| email | string | Obrigatorio e unico |
| password_hash | string | Obrigatorio |
| created_at | datetime | Criado automaticamente |

### conversations

| Campo | Tipo | Regra |
| --- | --- | --- |
| id | string | Chave primaria |
| created_at | datetime | Criado automaticamente |
| updated_at | datetime | Atualizado automaticamente |

### conversation_members

| Campo | Tipo | Regra |
| --- | --- | --- |
| id | string | Chave primaria |
| user_id | string | Referencia users.id |
| conversation_id | string | Referencia conversations.id |
| joined_at | datetime | Criado automaticamente |

Regras da tabela:

- Um mesmo usuario nao deve ser adicionado duas vezes na mesma conversa.
- Toda conversa deve ter pelo menos dois membros na primeira versao.

### messages

| Campo | Tipo | Regra |
| --- | --- | --- |
| id | string | Chave primaria |
| content | string | Obrigatorio |
| sender_id | string | Referencia users.id |
| conversation_id | string | Referencia conversations.id |
| created_at | datetime | Criado automaticamente |

### Relacionamentos

```txt
users 1 -- N messages
users N -- N conversations, por meio de conversation_members
conversations 1 -- N messages
conversations 1 -- N conversation_members
```

## Rotas iniciais da API

### Auth

- POST /auth/register
- POST /auth/login

### Users

- GET /users

### Conversations

- GET /conversations
- POST /conversations

Na primeira versao, `POST /conversations` cria ou reaproveita uma conversa direta entre o usuario autenticado e outro usuario informado por `participantId`.

### Messages

- GET /conversations/:id/messages
- POST /conversations/:id/messages

As rotas de mensagens so podem ser acessadas por membros da conversa.

## Regras importantes

- Um usuario so pode acessar conversas das quais participa.
- Um usuario so pode acessar rotas protegidas enviando um token JWT valido.
- A listagem de usuarios nao deve retornar a senha nem o hash da senha.
- Uma conversa direta entre dois usuarios nao deve ser duplicada.
- Uma mensagem sempre pertence a uma conversa.
- Uma mensagem sempre tem um usuario remetente.
- Um usuario so pode listar ou enviar mensagens em conversas das quais participa.
- Mensagens vazias nao devem ser aceitas.
- A senha nunca deve ser salva em texto puro.
- O token de autenticacao deve identificar o usuario logado nas rotas protegidas.

## Fases do desenvolvimento

1. Criar a estrutura inicial do projeto. Concluido.
2. Criar o backend REST com Express. Em andamento.
3. Configurar Prisma e SQLite. Em andamento.
4. Implementar cadastro e login. Em andamento.
5. Implementar usuarios, conversas e mensagens. Em andamento.
6. Criar o frontend com React. Em andamento.
7. Integrar frontend e backend. Em andamento.
8. Adicionar comunicacao em tempo real. Em andamento com Socket.IO.
9. Adicionar recursos extras, como usuario online, digitando e confirmacao de leitura.

## Estrutura planejada

```txt
Mensagens/
  docs/
    architecture.md
  frontend/
    src/
      components/
      pages/
      services/
      styles/
  backend/
    prisma/
      schema.prisma
    src/
      controllers/
      database/
      middlewares/
      routes/
      services/
```
