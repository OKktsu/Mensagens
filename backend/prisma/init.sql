PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_members (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT conversation_members_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT conversation_members_conversation_id_fkey
    FOREIGN KEY (conversation_id)
    REFERENCES conversations (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_members_user_id_conversation_id_key
  ON conversation_members (user_id, conversation_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT messages_conversation_id_fkey
    FOREIGN KEY (conversation_id)
    REFERENCES conversations (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
