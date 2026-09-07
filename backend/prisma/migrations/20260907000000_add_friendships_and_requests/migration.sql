CREATE TYPE "ConversationRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED', 'EXPIRED');

ALTER TABLE "conversations"
  ADD COLUMN "direct_key" TEXT;

CREATE UNIQUE INDEX "conversations_direct_key_key" ON "conversations"("direct_key");

CREATE TABLE "friendships" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "friend_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "friendships_user_id_friend_id_key" ON "friendships"("user_id", "friend_id");

ALTER TABLE "friendships"
  ADD CONSTRAINT "friendships_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "friendships"
  ADD CONSTRAINT "friendships_friend_id_fkey"
  FOREIGN KEY ("friend_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "conversation_requests" (
  "id" TEXT NOT NULL,
  "sender_id" TEXT NOT NULL,
  "receiver_id" TEXT NOT NULL,
  "status" "ConversationRequestStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conversation_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversation_requests_receiver_id_status_idx" ON "conversation_requests"("receiver_id", "status");
CREATE INDEX "conversation_requests_sender_id_status_idx" ON "conversation_requests"("sender_id", "status");

ALTER TABLE "conversation_requests"
  ADD CONSTRAINT "conversation_requests_sender_id_fkey"
  FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversation_requests"
  ADD CONSTRAINT "conversation_requests_receiver_id_fkey"
  FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;