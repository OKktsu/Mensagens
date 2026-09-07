# Mensagens

## Objetivo

Criar uma aplicacao de mensagens com foco em construir uma base real de produto: usuarios autenticados, conversas, mensagens persistidas e comunicacao em tempo real.

O projeto tambem serve como ambiente de estudo para frontend, backend, banco de dados, autenticacao, autorizacao e eventos em tempo real.

## Stack atual

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Banco de dados: PostgreSQL (Supabase)
- ORM: Prisma (com directUrl para migrações)
- Tempo real: Socket.IO
- Autenticacao: JWT + bcrypt

## Decisao de arquitetura para mercado

Para uma versao publicada, a decisao e manter a base atual e utilizar o Supabase como provedor de banco de dados gerenciado:

- Frontend: React + TypeScript (Vercel).
- Backend: Node.js + TypeScript (Render).
- Banco principal: PostgreSQL gerenciado no Supabase (com connection pooling Supavisor).
- Cache/estado temporario: Redis (futuro).
- Tempo real: Socket.IO.
- Arquivos futuros: storage externo, como Supabase Storage ou S3.

O PostgreSQL seria a fonte da verdade do sistema: usuarios, conversas, membros, mensagens e permissoes. O Redis entraria para estados passageiros, como usuarios online, digitando, cache e coordenacao entre varias instancias da API.

## Por que essa stack combina com o projeto

React e uma boa escolha para uma interface de mensagens porque o app tera varias partes dinamicas: lista de conversas, conversa ativa, mensagens, campo de envio, estados de carregamento e atualizacoes visuais.

Vite mantem o ambiente de frontend simples e rapido, sem exigir uma estrutura maior logo no inicio.

TypeScript ajuda a manter claros os formatos principais do sistema, como usuarios, conversas, mensagens e respostas da API.

Node.js e Express combinam bem com uma aplicacao de chat porque o backend precisa lidar com rotas HTTP, autenticacao, acesso ao banco e conexoes em tempo real. A decisao nao e por performance bruta contra .NET ou Java; e por coesao com o frontend em TypeScript, produtividade web, ecossistema realtime e boa aderencia a uma aplicacao baseada em eventos.

SQLite foi suficiente para a primeira versao local porque permitiu persistir dados sem uma infraestrutura pesada. Para publicacao, o projeto passa a usar PostgreSQL por lidar melhor com concorrencia, deploy, backup e operacao multiusuario. Prisma organiza o acesso ao banco e aplica as migracoes em producao com `prisma migrate deploy`.

Socket.IO entra na aplicacao para permitir eventos em tempo real entre backend e frontend. Na versao atual, ele autentica a conexao com o token JWT, permite entrar na sala de uma conversa e entrega `message:new` quando uma mensagem nova e salva.

Redis nao e obrigatorio na primeira versao, mas e a proxima camada natural quando o sistema precisar guardar estados temporarios ou rodar com mais de uma instancia de API. Exemplos: `typing:conversation:user`, usuario online, rate limit, cache e pub/sub para sockets.

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

## Configuracao de ambiente

Backend:

- `DATABASE_URL`: string de conexao com pooling do Supabase (porta 6543, Transaction/Session mode).
- `DIRECT_URL`: string de conexao direta do Supabase (porta 5432) usada pelo Prisma para aplicar migracoes.
- `JWT_SECRET`: segredo usado para assinar e validar tokens JWT.
- `PORT`: porta da API.
- `FRONTEND_URLS`: lista de origens permitidas no CORS, separadas por virgula.

Frontend:

- `VITE_API_URL`: URL publica da API usada pelo frontend.

Essas variaveis evitam que URLs locais fiquem presas no codigo e permitem publicar frontend e backend em ambientes separados.

## Publicacao

O frontend esta preparado para Vercel por meio do arquivo `frontend/vercel.json`. Na Vercel, o projeto deve usar `frontend` como root directory, `pnpm build` como build command e `dist` como output directory.

A API ainda precisa ser publicada separadamente, porque o frontend hospedado nao consegue acessar `localhost` da maquina do desenvolvedor. Quando a API estiver publicada, a URL dela deve ser configurada na variavel `VITE_API_URL` do repositorio ou da plataforma de hospedagem.

A API esta preparada para Render por meio de `render.yaml`. O Blueprint define o Web Service Node conectado ao banco PostgreSQL hospedado no Supabase. Durante o deploy, o Render executa as migracoes do Prisma via `DIRECT_URL` antes de iniciar a API.

## Evolucoes futuras

- Login com Google: complexidade media. Exige OAuth, callback, criacao/vinculo de usuario e cuidado com redirect URLs.
- Integracoes com IA: complexidade media, dependendo da feature. Um bot simples em uma conversa e bem viavel; busca semantica, moderacao e resumo de conversas exigem mais arquitetura.
- Redis para presenca: complexidade baixa/media. Bom proximo passo para online e digitando.
- PostgreSQL em producao: complexidade baixa/media. Exige configurar banco, connection string e migracoes.
- Upload de arquivos: complexidade media. Idealmente usa storage externo, nao salva arquivo direto no banco.

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
2. Criar o backend REST com Express. Concluido para o MVP inicial.
3. Configurar Prisma e SQLite. Concluido para ambiente local.
4. Implementar cadastro e login. Concluido para email/senha.
5. Implementar usuarios, conversas e mensagens. Concluido para conversa direta.
6. Criar o frontend com React. Concluido para o fluxo inicial.
7. Integrar frontend e backend. Concluido para o fluxo inicial.
8. Adicionar comunicacao em tempo real. Concluido para novas mensagens.
9. Preparar configuracao para publicacao. Em andamento.
10. Adicionar recursos extras, como usuario online, digitando e confirmacao de leitura.

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

## Amizades e pedidos

Friendship representa a relacao aceita entre duas pessoas. O sistema registra a amizade nas duas direcoes para consultar os contatos de cada usuario de forma direta.

ConversationRequest representa o convite antes da amizade. O pedido pode ser aceito, recusado, cancelado ou expirado. No aceite, a API cria a amizade e uma conversa direta em uma transacao.

Somente amigos podem abrir DMs ou ser escolhidos como participantes de grupos.