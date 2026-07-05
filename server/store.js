/** Tiny JSON-file store — swap for a real DB when user counts grow. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), 'data');
mkdirSync(dataDir, { recursive: true });
const usersFile = join(dataDir, 'users.json');

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
