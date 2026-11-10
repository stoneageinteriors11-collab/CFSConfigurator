import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Session } from "@shopify/shopify-app-react-router/server";

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";

function parseKey(base64Key) {
  const key = Buffer.from(base64Key ?? "", "base64");
  if (key.length !== 32) {
    throw new Error("SESSION_ENCRYPTION_KEY must be 32 bytes, base64 encoded.");
  }
  return key;
}

function encrypt(key, plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const parts = [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64"));
  return PREFIX + parts.join(":");
}

function decrypt(key, stored) {
  if (!stored.startsWith(PREFIX)) {
    throw new Error("Stored session token is not encrypted.");
  }
  const [iv, tag, ciphertext] = stored
    .slice(PREFIX.length)
    .split(":")
    .map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Wraps a session storage so access and refresh tokens are encrypted in the database. */
export class EncryptedSessionStorage {
  constructor(storage, base64Key) {
    this.storage = storage;
    this.key = parseKey(base64Key);
  }

  storeSession(session) {
    const stored = new Session(session.toObject());
    if (session.accessToken) stored.accessToken = encrypt(this.key, session.accessToken);
    if (session.refreshToken) stored.refreshToken = encrypt(this.key, session.refreshToken);
    return this.storage.storeSession(stored);
  }

  async loadSession(id) {
    const session = await this.storage.loadSession(id);
    return session && this.decryptSession(session);
  }

  async findSessionsByShop(shop) {
    const sessions = await this.storage.findSessionsByShop(shop);
    return sessions.map((session) => this.decryptSession(session));
  }

  deleteSession(id) {
    return this.storage.deleteSession(id);
  }

  deleteSessions(ids) {
    return this.storage.deleteSessions(ids);
  }

  isReady() {
    return this.storage.isReady();
  }

  decryptSession(session) {
    if (session.accessToken) session.accessToken = decrypt(this.key, session.accessToken);
    if (session.refreshToken) session.refreshToken = decrypt(this.key, session.refreshToken);
    return session;
  }
}
