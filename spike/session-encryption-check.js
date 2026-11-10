// Checks token encryption against the real session table with one fake row, then removes it.
// Run: node --env-file=.env spike/session-encryption-check.js
import assert from "node:assert/strict";
import "@shopify/shopify-app-react-router/adapters/node";
import { Session } from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { EncryptedSessionStorage } from "../app/encrypted-session-storage.server.js";
import prisma from "../app/db.server.js";

const id = "cfs-encryption-check";
const shop = "cfs-encryption-check.invalid";
const accessToken = "fake-access-token-for-check";
const refreshToken = "fake-refresh-token-for-check";

const storage = new EncryptedSessionStorage(new PrismaSessionStorage(prisma), process.env.SESSION_ENCRYPTION_KEY);
const original = new Session({ id, shop, state: "check", isOnline: false, accessToken, refreshToken, scope: "read_products" });

try {
  await storage.storeSession(original);
  assert.equal(original.accessToken, accessToken, "the caller's session must stay readable");

  const raw = await prisma.session.findUnique({ where: { id } });
  assert.match(raw.accessToken, /^enc:v1:/);
  assert.match(raw.refreshToken, /^enc:v1:/);
  assert.ok(!raw.accessToken.includes(accessToken), "access token must not be in plain text");
  assert.ok(!raw.refreshToken.includes(refreshToken), "refresh token must not be in plain text");

  const loaded = await storage.loadSession(id);
  assert.equal(loaded.accessToken, accessToken);
  assert.equal(loaded.refreshToken, refreshToken);
  assert.equal(loaded.scope, "read_products");

  const [found] = await storage.findSessionsByShop(shop);
  assert.equal(found.accessToken, accessToken);

  await prisma.session.update({ where: { id }, data: { accessToken: "plain-text-token" } });
  await assert.rejects(storage.loadSession(id), /not encrypted/);

  const tampered = raw.accessToken.slice(0, -4) + "AAA=";
  await prisma.session.update({ where: { id }, data: { accessToken: tampered } });
  await assert.rejects(storage.loadSession(id));

  await prisma.session.update({ where: { id }, data: { accessToken: raw.accessToken } });
  const wrongKey = new EncryptedSessionStorage(new PrismaSessionStorage(prisma), Buffer.alloc(32, 7).toString("base64"));
  await assert.rejects(wrongKey.loadSession(id));

  assert.throws(() => new EncryptedSessionStorage(new PrismaSessionStorage(prisma), undefined), /32 bytes/);
  console.log("All encryption checks passed.");
} finally {
  await prisma.session.deleteMany({ where: { id } });
  console.log("Rows left in Session:", await prisma.session.count());
  await prisma.$disconnect();
}
