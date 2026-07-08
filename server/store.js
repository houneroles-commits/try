/** Tiny JSON-file store — swap for a real DB when user counts grow. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), 'data');
mkdirSync(dataDir, { recursive: true });
const usersFile = join(dataDir, 'users.json');
const chatsFile = join(dataDir, 'chats.json');

export function loadUsers() {
  try {
    return JSON.parse(readFileSync(usersFile, 'utf8'));
  } catch {
    return [];
  }
}

export function saveUsers(users) {
  writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

/**
 * Upsert an alert subscriber keyed by phone number (or push endpoint when
 * no phone was given).
 */
export function upsertUser(user) {
  const users = loadUsers();
  const key = user.phone || user.subscription?.endpoint;
  if (!key) return users;
  const idx = users.findIndex(
    (u) => (u.phone || u.subscription?.endpoint) === key,
  );
  if (idx >= 0) users[idx] = { ...users[idx], ...user, updatedAt: new Date().toISOString() };
  else users.push({ ...user, createdAt: new Date().toISOString() });
  saveUsers(users);
  return users;
}

/* ------------------------------------------------ WhatsApp conversations */
// Per-phone chat history so the assistant can run a multi-turn intake.
const MAX_TURNS = 20; // keep the last 20 messages per phone

function loadChats() {
  try {
    return JSON.parse(readFileSync(chatsFile, 'utf8'));
  } catch {
    return {};
  }
}

/** Return [{ role, content }] history for a phone (empty if new). */
export function getConversation(phone) {
  return loadChats()[phone] ?? [];
}

/** Append a message and return the trimmed history. */
export function appendMessage(phone, role, content) {
  const chats = loadChats();
  const history = chats[phone] ?? [];
  history.push({ role, content });
  chats[phone] = history.slice(-MAX_TURNS);
  writeFileSync(chatsFile, JSON.stringify(chats, null, 2));
  return chats[phone];
}

/** Wipe a phone's history (e.g. farmer texts "reset"). */
export function resetConversation(phone) {
  const chats = loadChats();
  delete chats[phone];
  writeFileSync(chatsFile, JSON.stringify(chats, null, 2));
}

/* ---------------------------------------------- Farmer profiles */
// Persistent farmer facts (name/crop/location) so the bot remembers them
// across chats. Reuses the users store, keyed by normalized phone.
export function getProfile(phone) {
  return loadUsers().find((u) => u.phone === phone) ?? {};
}

export function saveProfile(phone, fields) {
  return upsertUser({ phone, ...fields });
}

/* ---------------------------------------------- Escalations (human handoff) */
const escalationsFile = join(dataDir, 'escalations.json');

function loadEscalations() {
  try {
    return JSON.parse(readFileSync(escalationsFile, 'utf8'));
  } catch {
    return [];
  }
}

export function addEscalation(entry) {
  const list = loadEscalations();
  const record = { ...entry, status: 'open', createdAt: new Date().toISOString() };
  list.push(record);
  writeFileSync(escalationsFile, JSON.stringify(list, null, 2));
  return record;
}

export function listEscalations() {
  return loadEscalations();
}
