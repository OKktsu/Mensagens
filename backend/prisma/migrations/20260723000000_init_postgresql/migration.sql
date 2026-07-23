CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "conversations" (
  "id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversation_members" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversation_members_user_id_conversation_id_key"
  ON "conversation_members"("user_id", "conversation_id");

ALTER TABLE "conversation_members"
  ADD CONSTRAINT "conversation_members_user_id_fkey"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "conversation_members"
  ADD CONSTRAINT "conversation_members_conversation_id_fkey"
  FOREIGN KEY ("conversation_id")
  REFERENCES "conversations"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

CREATE TABLE "messages" (
  "id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sender_id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_sender_id_fkey"
  FOREIGN KEY ("sender_id")
  REFERENCES "users"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id")
  REFERENCES "conversations"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
