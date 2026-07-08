/**
 * Data store — Postgres when DATABASE_URL is set, otherwise local JSON files.
 * All functions are async so the same interface works for both backends.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dbEnabled, query } from './db.js';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), 'data');
mkdirSync(dataDir, { recursive: true });
const usersFile = join(dataDir, 'users.json');
const chatsFile = join(dataDir, 'chats.json');
const escalationsFile = join(dataDir, 'escalations.json');

const MAX_TURNS = 20; // keep the last 20 messages per phone

// ── local JSON helpers (fallback) ───────────────────────────────────────
function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}
function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2));
}

const userKey = (u) => u.phone || u.subscription?.endpoint;

// ── Alert subscribers / farmer records (kv_users) ───────────────────────
export async function loadUsers() {
  if (dbEnabled()) {
    const { rows } = await query('SELECT data FROM kv_users');
    return rows.map((r) => r.data);
  }
  return readJson(usersFile, []);
}

export async function saveUsers(users) {
  if (dbEnabled()) {
    for (const u of users) {
      const key = userKey(u);
      if (!key) continue;
      await query(
        `INSERT INTO kv_users(key, data) VALUES($1, $2)
         ON CONFLICT (key) DO UPDATE SET data = $2`,
        [key, u],
      );
    }
    return;
  }
  writeJson(usersFile, users);
}

export async function upsertUser(user) {
  const key = userKey(user);
  if (!key) return;
  if (dbEnabled()) {
    const { rows } = await query('SELECT data FROM kv_users WHERE key = $1', [key]);
    const existing = rows[0]?.data ?? null;
    const merged = existing
      ? { ...existing, ...user, updatedAt: new Date().toISOString() }
      : { ...user, createdAt: new Date().toISOString() };
    await query(
      `INSERT INTO kv_users(key, data) VALUES($1, $2)
       ON CONFLICT (key) DO UPDATE SET data = $2`,
      [key, merged],
    );
    return merged;
  }
  const users = readJson(usersFile, []);
  const idx = users.findIndex((u) => userKey(u) === key);
  if (idx >= 0) users[idx] = { ...users[idx], ...user, updatedAt: new Date().toISOString() };
  else users.push({ ...user, createdAt: new Date().toISOString() });
  writeJson(usersFile, users);
  return users.find((u) => userKey(u) === key);
}

// ── Farmer profiles (reuse kv_users, keyed by normalized phone) ─────────
export async function getProfile(phone) {
  if (dbEnabled()) {
    const { rows } = await query('SELECT data FROM kv_users WHERE key = $1', [phone]);
    return rows[0]?.data ?? {};
  }
  return readJson(usersFile, []).find((u) => u.phone === phone) ?? {};
}

export async function saveProfile(phone, fields) {
  return upsertUser({ phone, ...fields });
}

// ── WhatsApp conversations ──────────────────────────────────────────────
export async function getConversation(phone) {
  if (dbEnabled()) {
    const { rows } = await query('SELECT messages FROM conversations WHERE phone = $1', [phone]);
    return rows[0]?.messages ?? [];
  }
  return readJson(chatsFile, {})[phone] ?? [];
}

export async function appendMessage(phone, role, content) {
  if (dbEnabled()) {
    const history = await getConversation(phone);
    history.push({ role, content });
    const trimmed = history.slice(-MAX_TURNS);
    await query(
      `INSERT INTO conversations(phone, messages) VALUES($1, $2)
       ON CONFLICT (phone) DO UPDATE SET messages = $2`,
      [phone, JSON.stringify(trimmed)],
    );
    return trimmed;
  }
  const chats = readJson(chatsFile, {});
  const history = chats[phone] ?? [];
  history.push({ role, content });
  chats[phone] = history.slice(-MAX_TURNS);
  writeJson(chatsFile, chats);
  return chats[phone];
}

export async function resetConversation(phone) {
  if (dbEnabled()) {
    await query('DELETE FROM conversations WHERE phone = $1', [phone]);
    return;
  }
  const chats = readJson(chatsFile, {});
  delete chats[phone];
  writeJson(chatsFile, chats);
}

// ── Escalations (human handoff) ─────────────────────────────────────────
export async function addEscalation(entry) {
  const record = { ...entry, status: 'open', createdAt: new Date().toISOString() };
  if (dbEnabled()) {
    await query('INSERT INTO escalations(data) VALUES($1)', [record]);
    return record;
  }
  const list = readJson(escalationsFile, []);
  list.push(record);
  writeJson(escalationsFile, list);
  return record;
}

export async function listEscalations() {
  if (dbEnabled()) {
    const { rows } = await query('SELECT data FROM escalations ORDER BY created_at DESC');
    return rows.map((r) => r.data);
  }
  return readJson(escalationsFile, []);
}
